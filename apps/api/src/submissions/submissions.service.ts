import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Prisma,
  SubmissionStatus as PrismaSubmissionStatus,
} from '@prisma/client';

import { AccessControlService } from '../common/access-control.service';
import { AuditService } from '../common/audit.service';
import { DocumentService } from '../common/document.service';
import { FileStorageService } from '../common/file-storage.service';
import { NotificationsService } from '../common/notifications.service';
import { PrismaService } from '../common/prisma.service';
import type {
  CommitteeNotice,
  InventionSubmission,
  SubmissionFormData,
} from '../domain/models';
import { addMonths, assertSharesTotal, now } from '../domain/utils';
import type {
  CreateSubmissionDraftDto,
  GenerateSubmissionFormSnapshotDto,
  RecordSuccessionDecisionDto,
  RequestCorrectionDto,
  StartCommitteeReviewDto,
  SubmitSubmissionDto,
  UpdateSubmissionDraftDto,
} from './submissions.dto';

const submissionInclude = {
  inventorShares: true,
  attachments: true,
  revisions: { orderBy: { revisionNo: 'desc' as const } },
  workflowEvents: { orderBy: { createdAt: 'desc' as const } },
  checklists: { orderBy: { revisionNo: 'desc' as const } },
  decisions: { orderBy: { decidedAt: 'desc' as const } },
  evaluations: { orderBy: { createdAt: 'desc' as const } },
};

type SubmissionRecord = Prisma.InventionSubmissionGetPayload<{
  include: typeof submissionInclude;
}>;

const REQUIRED_ATTACHMENTS = [
  { code: 'ASSIGNMENT_DEED', label: '양도증' },
  { code: 'DESCRIPTION', label: '발명 설명서' },
  { code: 'PRIOR_ART_REPORT', label: '선행기술 조사서' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안',
  SUBMITTED: '제출됨',
  INTAKE_REVIEW: '접수 검토',
  RETURNED: '보완 요청',
  COMMITTEE_REVIEW: '위원회 검토',
  ACCEPTED: '승계 완료',
  REJECTED: '미승계',
  HOLD: '출원 유보',
};

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly documents: DocumentService,
    private readonly fileStorage: FileStorageService,
  ) {}

  private formData(value: Prisma.JsonValue) {
    return value as unknown as SubmissionFormData;
  }

  private actorName(userId: string) {
    return this.accessControl.getUser(userId).name;
  }

  private statusLabel(status: string) {
    return STATUS_LABELS[status] ?? status;
  }

  private nextAction(status: string) {
    if (status === 'DRAFT') return '초안 작성';
    if (status === 'INTAKE_REVIEW') return '형식 검토';
    if (status === 'RETURNED') return '보완 후 재제출';
    if (status === 'COMMITTEE_REVIEW') return '평가 및 승계 결정';
    return '문서 확인';
  }

  private async findSubmission(id: string) {
    const submission = await this.prisma.inventionSubmission.findUnique({
      where: { id },
      include: submissionInclude,
    });
    if (!submission) {
      throw new NotFoundException('발명신고를 찾을 수 없습니다.');
    }
    return submission;
  }

  private assertEditor(actorUserId: string, submission: SubmissionRecord) {
    const isOwner = submission.submitterUserId === actorUserId;
    const isAdmin = this.accessControl.hasRole(actorUserId, ['ADMIN']);
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }
  }

  private attachmentRequirements(submission: SubmissionRecord) {
    return REQUIRED_ATTACHMENTS.map((item) => ({
      code: item.code,
      label: item.label,
      uploaded: submission.attachments.some(
        (attachment) => attachment.attachmentType === item.code,
      ),
    }));
  }

  private checklist(submission: SubmissionRecord) {
    return [
      {
        code: 'FORM_COMPLETENESS',
        label: '필수 입력 항목 확인',
        passed: Boolean(
          this.formData(submission.formDataJson).form1.inventionTitleKo,
        ),
      },
      {
        code: 'INVENTOR_SHARES',
        label: '발명자 지분율 100% 확인',
        passed:
          submission.inventorShares.reduce(
            (sum, share) => sum + Number(share.shareRatio),
            0,
          ) === 100,
      },
      {
        code: 'REQUIRED_ATTACHMENTS',
        label: '필수 첨부 확인',
        passed: this.attachmentRequirements(submission).every(
          (item) => item.uploaded,
        ),
      },
    ];
  }

  private validateForSubmit(submission: SubmissionRecord) {
    const form = this.formData(submission.formDataJson);
    const missing = [
      !form.form1.inventionTitleKo?.trim() && '발명명(한글)',
      !form.form1.desiredCountries?.length && '출원 희망국',
      !form.form3.technicalField?.trim() && '기술분야',
      !form.form3.background?.trim() && '배경기술',
      !form.form3.technicalProblem?.trim() && '기술적 과제',
      !form.form3.solvingMeans?.trim() && '해결수단',
      !form.form3.inventionEffect?.trim() && '발명의 효과',
      !form.form3.claims?.filter((claim) => claim.trim()).length && '청구항',
      submission.inventorShares.length === 0 && '발명자 지분',
    ].filter(Boolean);
    const missingAttachments = this.attachmentRequirements(submission)
      .filter((item) => !item.uploaded)
      .map((item) => item.label);

    assertSharesTotal(
      submission.inventorShares.map((share) => ({
        id: share.id,
        inventorName: share.inventorName,
        shareRatio: Number(share.shareRatio),
        isPrimary: share.isPrimary,
      })),
    );

    if (missing.length || missingAttachments.length) {
      throw new BadRequestException(
        [
          missing.length ? `필수 입력 누락: ${missing.join(', ')}` : undefined,
          missingAttachments.length
            ? `필수 첨부 누락: ${missingAttachments.join(', ')}`
            : undefined,
        ]
          .filter(Boolean)
          .join(' / '),
      );
    }
  }

  private toLegacySubmission(
    submission: SubmissionRecord,
  ): InventionSubmission {
    return {
      id: submission.id,
      submissionNo: submission.submissionNo,
      title: submission.title,
      submitterUserId: submission.submitterUserId,
      summary: submission.summary,
      businessUnit: submission.businessUnit ?? '',
      status: submission.status as never,
      submittedAt: submission.submittedAt?.toISOString(),
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
      dueDate: submission.decisionDueAt?.toISOString() ?? addMonths(now(), 4),
      shares: submission.inventorShares.map((share) => ({
        id: share.id,
        userId: share.userId ?? undefined,
        inventorName: share.inventorName,
        inventorNameEn: share.inventorNameEn ?? undefined,
        shareRatio: Number(share.shareRatio),
        isPrimary: share.isPrimary,
        department: share.department ?? undefined,
        phoneNumber: share.phoneNumber ?? undefined,
        residentRegistrationNumber:
          share.residentRegistrationNumber ?? undefined,
        address: share.address ?? undefined,
      })),
      attachments: submission.attachments.map((attachment) => ({
        id: attachment.id,
        originalName: attachment.originalName,
        type: attachment.attachmentType,
        uploadedBy: attachment.uploadedBy,
        uploadedAt: attachment.uploadedAt.toISOString(),
        versionNo: attachment.versionNo,
      })),
      reviewNotes: [],
      snapshot: {
        title: submission.title,
        summary: submission.summary,
        submittedAt: submission.submittedAt?.toISOString(),
        shares: submission.inventorShares.map((share) => ({
          id: share.id,
          inventorName: share.inventorName,
          shareRatio: Number(share.shareRatio),
          isPrimary: share.isPrimary,
        })),
      },
      formData: this.formData(submission.formDataJson),
    };
  }

  private async saveSnapshot(
    snapshot: {
      id: string;
      formCode: string;
      title: string;
      generatedBy: string;
      generatedAt: string;
      fileName: string;
      filePath: string;
      previewLines: string[];
    },
    targetType: string,
    targetId: string,
    revisionNo?: number,
  ) {
    await this.prisma.formSnapshot.create({
      data: {
        id: snapshot.id,
        formCode: snapshot.formCode,
        targetType,
        targetId,
        revisionNo,
        title: snapshot.title,
        generatedBy: snapshot.generatedBy,
        generatedAt: new Date(snapshot.generatedAt),
        fileName: snapshot.fileName,
        filePath: snapshot.filePath,
        previewLinesJson: snapshot.previewLines,
      },
    });
    return snapshot.id;
  }

  private availableActions(actorUserId: string, submission: SubmissionRecord) {
    const roles = this.accessControl
      .getUser(actorUserId)
      .roles.map((role) => role.code);
    const actions: string[] = ['view-documents'];
    const isOwner = submission.submitterUserId === actorUserId;
    if (isOwner && ['DRAFT', 'RETURNED'].includes(submission.status)) {
      actions.push('update-draft', 'submit', 'upload-attachment');
    }
    if (
      (roles.includes('IP_MANAGER') || roles.includes('ADMIN')) &&
      submission.status === 'INTAKE_REVIEW'
    ) {
      actions.push('request-correction', 'start-committee-review');
    }
    if (
      (roles.includes('IP_MANAGER') || roles.includes('ADMIN')) &&
      submission.status === 'COMMITTEE_REVIEW'
    ) {
      actions.push('request-correction', 'record-succession-decision');
    }
    if (
      (roles.includes('COMMITTEE') || roles.includes('ADMIN')) &&
      submission.status === 'COMMITTEE_REVIEW'
    ) {
      actions.push('create-evaluation');
    }
    return actions;
  }

  private lifecycle(submission: SubmissionRecord) {
    const status = submission.status;
    const steps = [
      {
        key: 'DRAFT',
        label: '초안',
        status: submission.submittedAt
          ? 'done'
          : status === 'DRAFT'
            ? 'current'
            : 'pending',
      },
      {
        key: 'SUBMITTED',
        label: '제출',
        status: submission.submittedAt ? 'done' : 'pending',
      },
      {
        key: 'INTAKE_REVIEW',
        label: '접수 검토',
        status: ['COMMITTEE_REVIEW', 'ACCEPTED', 'REJECTED', 'HOLD'].includes(
          status,
        )
          ? 'done'
          : status === 'INTAKE_REVIEW'
            ? 'current'
            : 'pending',
      },
      {
        key: 'COMMITTEE_REVIEW',
        label: '위원회 검토',
        status: ['ACCEPTED', 'REJECTED', 'HOLD'].includes(status)
          ? 'done'
          : status === 'COMMITTEE_REVIEW'
            ? 'current'
            : 'pending',
      },
    ] as Array<{
      key: string;
      label: string;
      status: 'done' | 'current' | 'pending';
    }>;
    if (['RETURNED', 'ACCEPTED', 'REJECTED', 'HOLD'].includes(status)) {
      steps.push({
        key: status,
        label: this.statusLabel(status),
        status: 'current',
      });
    }
    return steps;
  }

  private async present(actorUserId: string, submission: SubmissionRecord) {
    const snapshots = await this.prisma.formSnapshot.findMany({
      where: {
        targetId: submission.id,
        targetType: { in: ['SUBMISSION', 'COMMITTEE_NOTICE'] },
      },
      orderBy: { generatedAt: 'desc' },
    });
    const minutes = (
      await this.prisma.meetingMinute.findMany({
        orderBy: { meetingDate: 'desc' },
      })
    ).filter((item) =>
      ((item.linkedSubmissionIdsJson as string[]) ?? []).includes(
        submission.id,
      ),
    );
    const latestChecklist =
      (submission.checklists[0]?.itemsJson as Array<{
        code: string;
        label: string;
        passed: boolean;
        note?: string;
      }>) ?? this.checklist(submission);
    const linkedEvaluations = submission.evaluations.map((evaluation) => ({
      id: evaluation.id,
      status: evaluation.status,
      totalScore: Number(evaluation.totalScore),
      gradeCode: evaluation.gradeCode ?? '-',
      evaluationRound: evaluation.evaluationRound,
      policyVersionCode: evaluation.policyVersionCode,
      isLocked: evaluation.isLocked,
    }));

    return {
      id: submission.id,
      submissionNo: submission.submissionNo,
      title: submission.title,
      summary: submission.summary,
      businessUnit: submission.businessUnit ?? '-',
      currentStatus: submission.status,
      currentStatusLabel: this.statusLabel(submission.status),
      nextAction: this.nextAction(submission.status),
      dueDate: submission.decisionDueAt?.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
      submittedAt: submission.submittedAt?.toISOString(),
      ownerName:
        submission.inventorShares.find((share) => share.isPrimary)
          ?.inventorName ??
        submission.inventorShares[0]?.inventorName ??
        '-',
      submitterName: this.actorName(submission.submitterUserId),
      shareSummary: submission.inventorShares
        .map((share) => `${share.inventorName} ${Number(share.shareRatio)}%`)
        .join(', '),
      attachmentsCount: submission.attachments.length,
      linkedPatentId: undefined,
      linkedPatentTitle: undefined,
      linkedEvaluationId: linkedEvaluations[0]?.id,
      linkedEvaluationGrade: linkedEvaluations[0]?.gradeCode,
      shares: submission.inventorShares.map((share) => ({
        id: share.id,
        inventorName: share.inventorName,
        inventorNameEn: share.inventorNameEn ?? undefined,
        shareRatio: Number(share.shareRatio),
        isPrimary: share.isPrimary,
        department: share.department ?? undefined,
        phoneNumber: share.phoneNumber ?? undefined,
      })),
      attachments: submission.attachments.map((attachment) => ({
        id: attachment.id,
        originalName: attachment.originalName,
        type: attachment.attachmentType,
        versionNo: attachment.versionNo,
        uploadedAt: attachment.uploadedAt.toISOString(),
      })),
      reviewNotes: submission.workflowEvents
        .filter((event) => event.toStatus === 'RETURNED')
        .map((event) => ({
          id: event.id,
          reason: event.note ?? '',
          createdAt: event.createdAt.toISOString(),
          type: event.eventType,
        })),
      formData: this.formData(submission.formDataJson),
      formSnapshots: snapshots.map((snapshot) => ({
        id: snapshot.id,
        formCode: snapshot.formCode,
        targetType: snapshot.targetType,
        targetId: snapshot.targetId,
        title: snapshot.title,
        generatedAt: snapshot.generatedAt.toISOString(),
        generatedBy: snapshot.generatedBy,
        fileName: snapshot.fileName,
        filePath: snapshot.filePath,
        previewLines: (snapshot.previewLinesJson as string[]) ?? [],
      })),
      committeeNotices: submission.decisions.map((decision) => {
        const snapshot = snapshots.find(
          (item) => item.id === decision.noticeDocumentId,
        );
        return {
          id: decision.id,
          templateCode: decision.decisionType === 'REJECT' ? 'FORM6' : 'FORM5',
          documentNo: snapshot?.fileName.replace('.pdf', '') ?? decision.id,
          noticeDate: decision.decidedAt.toISOString(),
          title: snapshot?.title ?? '승계 결정 통지',
          decisionItems: {
            successionDecision: decision.decisionType,
            remarks: decision.reason,
          },
        };
      }),
      appealRequests: [],
      appealDecisions: [],
      lifecycle: this.lifecycle(submission),
      timeline: submission.workflowEvents.map((event) => ({
        id: event.id,
        title: event.eventType,
        description:
          event.note ?? `${event.actorName ?? event.actorUserId} 처리`,
        timestamp: event.createdAt.toISOString(),
        tone:
          event.toStatus === 'RETURNED'
            ? 'warning'
            : event.toStatus === 'ACCEPTED'
              ? 'success'
              : 'neutral',
      })),
      linkedPatent: null,
      linkedRewards: [],
      successionDecision: submission.decisions[0]
        ? {
            decisionType: submission.decisions[0].decisionType,
            decidedAt: submission.decisions[0].decidedAt.toISOString(),
            reason: submission.decisions[0].reason,
          }
        : null,
      currentRevisionNo: submission.currentRevisionNo,
      availableActions: this.availableActions(actorUserId, submission),
      requiredAttachments: this.attachmentRequirements(submission),
      checklist: latestChecklist,
      decisionDueAt: submission.decisionDueAt?.toISOString(),
      linkedEvaluations,
      linkedMeetingMinutes: minutes.map((minute) => ({
        id: minute.id,
        title: minute.title,
        status: minute.status,
        meetingDate: minute.meetingDate.toISOString(),
        retentionUntil: minute.retentionUntil.toISOString(),
      })),
    };
  }

  async list(actorUserId: string) {
    this.accessControl.getUser(actorUserId);
    const submissions = await this.prisma.inventionSubmission.findMany({
      include: submissionInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(
      submissions.map((submission) => this.present(actorUserId, submission)),
    );
  }

  async get(actorUserId: string, id: string) {
    return this.present(actorUserId, await this.findSubmission(id));
  }

  async create(actorUserId: string, payload: CreateSubmissionDraftDto) {
    this.accessControl.assertAnyRole(actorUserId, ['INVENTOR', 'ADMIN']);
    assertSharesTotal(
      payload.shares.map((share) => ({
        id: share.id ?? randomUUID(),
        inventorName: share.inventorName,
        shareRatio: share.shareRatio,
        isPrimary: share.isPrimary,
      })),
    );
    const count = await this.prisma.inventionSubmission.count();
    const title = payload.title ?? payload.formData.form1.inventionTitleKo;
    const summary =
      payload.summary ?? payload.formData.form3.technicalProblem ?? '';

    const created = await this.prisma.inventionSubmission.create({
      data: {
        submissionNo: `SUB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
        title,
        submitterUserId: actorUserId,
        summary,
        businessUnit: payload.businessUnit ?? '',
        formDataJson: payload.formData as unknown as Prisma.InputJsonValue,
        revisions: {
          create: {
            revisionNo: 1,
            title,
            summary,
            changeNote: 'Initial draft',
            formDataJson: payload.formData as unknown as Prisma.InputJsonValue,
            createdBy: actorUserId,
          },
        },
        checklists: {
          create: {
            revisionNo: 1,
            itemsJson: [] as unknown as Prisma.InputJsonValue,
          },
        },
        workflowEvents: {
          create: {
            eventType: 'DRAFT_CREATED',
            toStatus: 'DRAFT',
            actorUserId,
            actorName: this.actorName(actorUserId),
            note: '초안이 생성되었습니다.',
          },
        },
        inventorShares: {
          create: payload.shares.map((share) => ({
            userId: share.userId,
            inventorName: share.inventorName,
            inventorNameEn: share.inventorNameEn,
            shareRatio: share.shareRatio,
            isPrimary: share.isPrimary,
            department: share.department,
            phoneNumber: share.phoneNumber,
            residentRegistrationNumber: share.residentRegistrationNumber,
            address: share.address,
          })),
        },
        attachments: {
          create: (payload.attachments ?? []).map((attachment, index) => ({
            revisionNo: 1,
            attachmentType: attachment.attachmentType,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            filePath: attachment.filePath,
            uploadedBy: actorUserId,
            versionNo: index + 1,
          })),
        },
      },
      include: submissionInclude,
    });

    this.audit.record({
      actorUserId,
      actionType: 'SUBMISSION_CREATED',
      targetType: 'SUBMISSION',
      targetId: created.id,
      after: { submissionNo: created.submissionNo },
    });

    return this.present(actorUserId, created);
  }

  async update(
    actorUserId: string,
    id: string,
    payload: UpdateSubmissionDraftDto,
  ) {
    const submission = await this.findSubmission(id);
    this.assertEditor(actorUserId, submission);
    if (!['DRAFT', 'RETURNED'].includes(submission.status)) {
      throw new BadRequestException(
        '초안 또는 보완 요청 상태에서만 수정할 수 있습니다.',
      );
    }
    if (payload.shares) {
      assertSharesTotal(
        payload.shares.map((share) => ({
          id: share.id ?? randomUUID(),
          inventorName: share.inventorName,
          shareRatio: share.shareRatio,
          isPrimary: share.isPrimary,
        })),
      );
    }
    const nextTitle =
      payload.title ??
      payload.formData?.form1.inventionTitleKo ??
      submission.title;
    const nextSummary =
      payload.summary ??
      payload.formData?.form3.technicalProblem ??
      submission.summary;

    await this.prisma.$transaction(async (tx) => {
      await tx.inventionSubmission.update({
        where: { id },
        data: {
          title: nextTitle,
          summary: nextSummary,
          businessUnit: payload.businessUnit ?? submission.businessUnit,
          formDataJson: (payload.formData ??
            this.formData(
              submission.formDataJson,
            )) as unknown as Prisma.InputJsonValue,
        },
      });

      if (payload.shares) {
        await tx.submissionInventorShare.deleteMany({
          where: { submissionId: id },
        });
        await tx.submissionInventorShare.createMany({
          data: payload.shares.map((share) => ({
            submissionId: id,
            userId: share.userId,
            inventorName: share.inventorName,
            inventorNameEn: share.inventorNameEn,
            shareRatio: share.shareRatio,
            isPrimary: share.isPrimary,
            department: share.department,
            phoneNumber: share.phoneNumber,
            residentRegistrationNumber: share.residentRegistrationNumber,
            address: share.address,
          })),
        });
      }

      if (payload.attachments) {
        await tx.submissionAttachment.deleteMany({
          where: { submissionId: id },
        });
        await tx.submissionAttachment.createMany({
          data: payload.attachments.map((attachment, index) => ({
            submissionId: id,
            revisionNo: submission.currentRevisionNo,
            attachmentType: attachment.attachmentType,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            filePath: attachment.filePath,
            uploadedBy: actorUserId,
            versionNo: index + 1,
          })),
        });
      }

      await tx.submissionRevision.updateMany({
        where: { submissionId: id, revisionNo: submission.currentRevisionNo },
        data: {
          title: nextTitle,
          summary: nextSummary,
          formDataJson: (payload.formData ??
            this.formData(
              submission.formDataJson,
            )) as unknown as Prisma.InputJsonValue,
          changeNote:
            submission.status === 'RETURNED'
              ? 'Returned draft updated'
              : 'Draft updated',
        },
      });

      await tx.submissionWorkflowEvent.create({
        data: {
          submissionId: id,
          eventType: 'DRAFT_UPDATED',
          fromStatus: submission.status,
          toStatus: submission.status,
          actorUserId,
          actorName: this.actorName(actorUserId),
          note:
            submission.status === 'RETURNED'
              ? '보완본이 수정되었습니다.'
              : '초안이 수정되었습니다.',
        },
      });
    });

    return this.get(actorUserId, id);
  }

  async submit(actorUserId: string, id: string, payload: SubmitSubmissionDto) {
    const submission = await this.findSubmission(id);
    this.assertEditor(actorUserId, submission);
    if (!['DRAFT', 'RETURNED'].includes(submission.status)) {
      throw new BadRequestException('제출 가능한 상태가 아닙니다.');
    }

    this.validateForSubmit(submission);
    const submittedAt = now();
    const decisionDueAt = addMonths(submittedAt, 4);
    const nextRevisionNo =
      submission.status === 'RETURNED'
        ? submission.currentRevisionNo + 1
        : submission.currentRevisionNo;

    await this.prisma.$transaction(async (tx) => {
      await tx.inventionSubmission.update({
        where: { id },
        data: {
          status: 'INTAKE_REVIEW',
          submittedAt: new Date(submittedAt),
          decisionDueAt: new Date(decisionDueAt),
          currentRevisionNo: nextRevisionNo,
        },
      });

      if (submission.status === 'RETURNED') {
        await tx.submissionRevision.create({
          data: {
            submissionId: id,
            revisionNo: nextRevisionNo,
            title: submission.title,
            summary: submission.summary,
            changeNote: payload.submitComment ?? 'Resubmitted after correction',
            formDataJson: submission.formDataJson as Prisma.InputJsonValue,
            createdBy: actorUserId,
          },
        });
      }

      await tx.submissionChecklist.upsert({
        where: {
          submissionId_revisionNo: {
            submissionId: id,
            revisionNo: nextRevisionNo,
          },
        },
        update: {
          itemsJson: this.checklist(
            submission,
          ) as unknown as Prisma.InputJsonValue,
        },
        create: {
          submissionId: id,
          revisionNo: nextRevisionNo,
          itemsJson: this.checklist(
            submission,
          ) as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.submissionWorkflowEvent.create({
        data: {
          submissionId: id,
          eventType: 'SUBMISSION_SUBMITTED',
          fromStatus: submission.status,
          toStatus: 'INTAKE_REVIEW',
          actorUserId,
          actorName: this.actorName(actorUserId),
          note: payload.submitComment ?? '신고서가 제출되었습니다.',
        },
      });
    });

    const refreshed = await this.findSubmission(id);
    for (const formCode of [
      'FORM1',
      'FORM2',
      'FORM3_1',
      'FORM3_2',
      'FORM4',
    ] as const) {
      await this.generateFormSnapshot(actorUserId, id, { formCode });
    }
    this.notifications.send({
      userId: 'user-manager',
      type: 'SUBMISSION_SUBMITTED',
      channel: 'IN_APP',
      title: `${refreshed.submissionNo} 접수 검토 요청`,
      body: '새로운 발명신고가 제출되었습니다.',
    });
    return this.get(actorUserId, id);
  }

  async addAttachment(
    actorUserId: string,
    id: string,
    attachment: {
      attachmentType: string;
      originalName: string;
      mimeType?: string;
      filePath?: string;
      buffer?: Buffer;
      size?: number;
    },
  ) {
    const submission = await this.findSubmission(id);
    this.assertEditor(actorUserId, submission);
    if (!['DRAFT', 'RETURNED'].includes(submission.status)) {
      throw new BadRequestException(
        '첨부는 초안 또는 보완 요청 상태에서만 추가할 수 있습니다.',
      );
    }
    if (!attachment.attachmentType) {
      throw new BadRequestException('첨부 유형은 필수입니다.');
    }
    if (!attachment.originalName) {
      throw new BadRequestException('파일명은 필수입니다.');
    }

    const versionNo =
      submission.attachments.filter(
        (item) => item.attachmentType === attachment.attachmentType,
      ).length + 1;

    const filePath = attachment.buffer
      ? await this.fileStorage.persistUploadBuffer({
          buffer: attachment.buffer,
          fileName:
            `${attachment.attachmentType}-${submission.currentRevisionNo}-${Date.now()}-${attachment.originalName}`.replace(
              /\s+/g,
              '-',
            ),
          mimeType: attachment.mimeType,
          folder: `submissions/${id}/attachments`,
        })
      : attachment.filePath;

    return this.prisma.submissionAttachment.create({
      data: {
        submissionId: id,
        revisionNo: submission.currentRevisionNo,
        attachmentType: attachment.attachmentType,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        filePath,
        uploadedBy: actorUserId,
        versionNo,
      },
    });
  }

  async requestCorrection(
    actorUserId: string,
    id: string,
    payload: RequestCorrectionDto,
  ) {
    this.accessControl.assertAnyRole(actorUserId, ['IP_MANAGER', 'ADMIN']);
    const submission = await this.findSubmission(id);
    if (!['INTAKE_REVIEW', 'COMMITTEE_REVIEW'].includes(submission.status)) {
      throw new BadRequestException('보완 요청 가능한 상태가 아닙니다.');
    }

    const checklist = payload.checklistItems ?? this.checklist(submission);
    await this.prisma.$transaction(async (tx) => {
      await tx.inventionSubmission.update({
        where: { id },
        data: { status: 'RETURNED' },
      });
      await tx.submissionChecklist.upsert({
        where: {
          submissionId_revisionNo: {
            submissionId: id,
            revisionNo: submission.currentRevisionNo,
          },
        },
        update: {
          checkedBy: actorUserId,
          checkedAt: new Date(),
          allPassed: false,
          itemsJson: checklist as unknown as Prisma.InputJsonValue,
        },
        create: {
          submissionId: id,
          revisionNo: submission.currentRevisionNo,
          checkedBy: actorUserId,
          checkedAt: new Date(),
          allPassed: false,
          itemsJson: checklist as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.submissionWorkflowEvent.create({
        data: {
          submissionId: id,
          eventType: 'CORRECTION_REQUESTED',
          fromStatus: submission.status,
          toStatus: 'RETURNED',
          actorUserId,
          actorName: this.actorName(actorUserId),
          note: payload.reason,
          payloadJson: checklist as unknown as Prisma.InputJsonValue,
        },
      });
    });

    this.notifications.send({
      userId: submission.submitterUserId,
      type: 'SUBMISSION_CORRECTION_REQUESTED',
      channel: 'IN_APP',
      title: `${submission.submissionNo} 보완 요청`,
      body: payload.reason,
    });
    return this.get(actorUserId, id);
  }

  async startCommitteeReview(
    actorUserId: string,
    id: string,
    payload: StartCommitteeReviewDto,
  ) {
    this.accessControl.assertAnyRole(actorUserId, ['IP_MANAGER', 'ADMIN']);
    const submission = await this.findSubmission(id);
    if (submission.status !== 'INTAKE_REVIEW') {
      throw new BadRequestException('위원회 검토를 시작할 수 없는 상태입니다.');
    }
    if (!payload.checklistItems.every((item) => item.passed)) {
      throw new BadRequestException(
        '형식 검토 체크리스트가 모두 통과되어야 합니다.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.submissionChecklist.upsert({
        where: {
          submissionId_revisionNo: {
            submissionId: id,
            revisionNo: submission.currentRevisionNo,
          },
        },
        update: {
          checkedBy: actorUserId,
          checkedAt: new Date(),
          allPassed: true,
          itemsJson: payload.checklistItems as unknown as Prisma.InputJsonValue,
        },
        create: {
          submissionId: id,
          revisionNo: submission.currentRevisionNo,
          checkedBy: actorUserId,
          checkedAt: new Date(),
          allPassed: true,
          itemsJson: payload.checklistItems as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.inventionSubmission.update({
        where: { id },
        data: { status: 'COMMITTEE_REVIEW' },
      });
      await tx.submissionWorkflowEvent.create({
        data: {
          submissionId: id,
          eventType: 'COMMITTEE_REVIEW_STARTED',
          fromStatus: 'INTAKE_REVIEW',
          toStatus: 'COMMITTEE_REVIEW',
          actorUserId,
          actorName: this.actorName(actorUserId),
          note:
            payload.note ??
            '형식 검토가 완료되어 위원회 검토로 이관되었습니다.',
        },
      });
    });

    return this.get(actorUserId, id);
  }

  async generateFormSnapshot(
    actorUserId: string,
    submissionId: string,
    payload: GenerateSubmissionFormSnapshotDto,
  ) {
    const submission = await this.findSubmission(submissionId);
    const snapshot = await this.documents.createRegulationFormSnapshot({
      targetType: 'SUBMISSION',
      targetId: submissionId,
      title: `${submission.submissionNo} ${payload.formCode} rev.${submission.currentRevisionNo}`,
      generatedBy: actorUserId,
      payload: {
        formCode: payload.formCode,
        submission: this.toLegacySubmission(submission),
      },
    });
    await this.saveSnapshot(
      snapshot,
      'SUBMISSION',
      submissionId,
      submission.currentRevisionNo,
    );
    return { ...snapshot, revisionNo: submission.currentRevisionNo };
  }

  async listFormSnapshots(submissionId: string) {
    const snapshots = await this.prisma.formSnapshot.findMany({
      where: {
        targetId: submissionId,
        targetType: { in: ['SUBMISSION', 'COMMITTEE_NOTICE'] },
      },
      orderBy: { generatedAt: 'desc' },
    });
    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      formCode: snapshot.formCode,
      targetType: snapshot.targetType,
      targetId: snapshot.targetId,
      title: snapshot.title,
      generatedAt: snapshot.generatedAt.toISOString(),
      generatedBy: snapshot.generatedBy,
      fileName: snapshot.fileName,
      filePath: snapshot.filePath,
      previewLines: (snapshot.previewLinesJson as string[]) ?? [],
    }));
  }

  async decideSuccession(
    actorUserId: string,
    id: string,
    payload: RecordSuccessionDecisionDto,
  ) {
    this.accessControl.assertAnyRole(actorUserId, ['IP_MANAGER', 'ADMIN']);
    const submission = await this.findSubmission(id);
    if (submission.status !== 'COMMITTEE_REVIEW') {
      throw new BadRequestException('승계 결정을 기록할 수 없는 상태입니다.');
    }
    if (
      !submission.evaluations.some(
        (evaluation) => evaluation.status === 'FINALIZED',
      )
    ) {
      throw new BadRequestException(
        '확정된 평가표가 있어야 승계 결정을 기록할 수 있습니다.',
      );
    }

    const nextStatus: PrismaSubmissionStatus =
      payload.decisionType === 'ACCEPT'
        ? 'ACCEPTED'
        : payload.decisionType === 'HOLD'
          ? 'HOLD'
          : 'REJECTED';
    const documentNo = `CNT-${new Date().getFullYear()}-${String(
      (await this.prisma.successionDecision.count()) + 1,
    ).padStart(4, '0')}`;

    const notice: CommitteeNotice = {
      id: documentNo,
      submissionId: id,
      templateCode: payload.decisionType === 'REJECT' ? 'FORM6' : 'FORM5',
      documentNo,
      noticeDate: now(),
      recipientUserId: submission.submitterUserId,
      title: '승계 결정 통지',
      committeeChairName: this.actorName('user-committee'),
      representativeName: this.actorName('user-admin'),
      decisionItems: {
        jobInventionDecision: '직무발명',
        successionDecision:
          payload.decisionType === 'ACCEPT'
            ? '승계'
            : payload.decisionType === 'HOLD'
              ? '출원 유보'
              : '미승계',
        patentGrade:
          submission.evaluations.find(
            (evaluation) => evaluation.status === 'FINALIZED',
          )?.gradeCode ?? '-',
        domesticOverseasPlan:
          this.formData(submission.formDataJson).form1.desiredCountries.join(
            ', ',
          ) || '-',
        examinationRequestPlan:
          payload.decisionType === 'ACCEPT' ? '출원 진행' : '결정 보류',
        remarks: payload.reason,
      },
      generatedAt: now(),
      generatedBy: actorUserId,
      sentAt: now(),
    };

    const snapshot = await this.documents.createRegulationFormSnapshot({
      targetType: 'COMMITTEE_NOTICE',
      targetId: id,
      title: `${documentNo} 승계결정통지`,
      generatedBy: actorUserId,
      payload: {
        formCode: notice.templateCode,
        notice,
        submission: this.toLegacySubmission(submission),
      },
    });
    await this.saveSnapshot(
      snapshot,
      'COMMITTEE_NOTICE',
      id,
      submission.currentRevisionNo,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.inventionSubmission.update({
        where: { id },
        data: { status: nextStatus },
      });
      await tx.successionDecision.create({
        data: {
          submissionId: id,
          decisionType: payload.decisionType,
          decidedBy: actorUserId,
          dueDate: submission.decisionDueAt ?? new Date(addMonths(now(), 4)),
          reason: payload.reason,
          noticeDocumentId: snapshot.id,
        },
      });
      await tx.submissionWorkflowEvent.create({
        data: {
          submissionId: id,
          eventType: 'SUCCESSION_DECIDED',
          fromStatus: 'COMMITTEE_REVIEW',
          toStatus: nextStatus,
          actorUserId,
          actorName: this.actorName(actorUserId),
          note: `${payload.decisionType}: ${payload.reason}`,
        },
      });
    });

    this.notifications.send({
      userId: submission.submitterUserId,
      type: 'SUCCESSION_DECIDED',
      channel: 'IN_APP',
      title: `${submission.submissionNo} 승계 결정`,
      body: payload.reason,
    });
    return this.get(actorUserId, id);
  }

  async listCommitteeNotices(submissionId: string) {
    const submission = await this.findSubmission(submissionId);
    const snapshots = await this.prisma.formSnapshot.findMany({
      where: { targetType: 'COMMITTEE_NOTICE', targetId: submissionId },
      orderBy: { generatedAt: 'desc' },
    });
    return submission.decisions.map((decision) => {
      const snapshot = snapshots.find(
        (item) => item.id === decision.noticeDocumentId,
      );
      return {
        id: decision.id,
        templateCode: decision.decisionType === 'REJECT' ? 'FORM6' : 'FORM5',
        documentNo: snapshot?.fileName.replace('.pdf', '') ?? decision.id,
        noticeDate: decision.decidedAt.toISOString(),
        title: snapshot?.title ?? '승계 결정 통지',
        decisionItems: {
          successionDecision: decision.decisionType,
          remarks: decision.reason,
        },
      };
    });
  }
}
