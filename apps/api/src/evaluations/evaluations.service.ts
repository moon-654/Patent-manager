import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { AccessControlService } from '../common/access-control.service';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../common/prisma.service';
import type { PolicyVersion } from '../domain/models';
import { now, resolveGrade } from '../domain/utils';
import type {
  CreateEvaluationDto,
  FinalizeEvaluationDto,
  UpdateEvaluationItemsDto,
} from './evaluations.dto';

type EvaluationRecord = Prisma.EvaluationGetPayload<{
  include: { items: true };
}>;

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
  ) {}

  private async activePolicy() {
    const policy = await this.prisma.policyVersion.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        grades: { orderBy: { displayOrder: 'asc' } },
        evaluationCriteria: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: { levels: { orderBy: { displayOrder: 'asc' } } },
        },
      },
    });
    if (!policy) {
      throw new NotFoundException('활성 정책 버전을 찾을 수 없습니다.');
    }
    return policy;
  }

  private toPolicyVersion(
    policy: Awaited<ReturnType<EvaluationsService['activePolicy']>>,
  ): PolicyVersion {
    return {
      id: policy.id,
      versionCode: policy.versionCode,
      name: policy.name,
      status: policy.status as never,
      effectiveDate: policy.effectiveDate.toISOString(),
      noticeDate:
        policy.noticeDate?.toISOString() ?? policy.effectiveDate.toISOString(),
      createdBy: policy.createdBy,
      approvedBy: policy.approvedBy ?? undefined,
      isDisadvantageous: policy.isDisadvantageous,
      changeSummary: policy.changeSummary ?? '',
      grades: policy.grades.map((grade) => ({
        gradeCode: grade.gradeCode,
        gradeName: grade.gradeName,
        minScore: Number(grade.minScore),
        maxScore: Number(grade.maxScore),
      })),
      criteria: policy.evaluationCriteria.map((criterion) => ({
        criterionCode: criterion.criterionCode,
        criterionName: criterion.criterionName,
        maxScore: Number(criterion.maxScore),
        displayOrder: criterion.displayOrder,
        levels: criterion.levels.map((level) => ({
          levelCode: level.levelCode,
          levelName: level.levelName,
          mappedScore: Number(level.mappedScore),
        })),
      })),
      cutoffRules: [],
      rewardMatrix: [],
      formulaRules: [],
    };
  }

  private assertCommittee(actorUserId: string) {
    const allowed = this.accessControl.hasRole(actorUserId, [
      'COMMITTEE',
      'ADMIN',
    ]);
    if (!allowed) {
      throw new ForbiddenException('평가 작업 권한이 없습니다.');
    }
  }

  private async findEvaluation(id: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!evaluation) {
      throw new NotFoundException('평가표를 찾을 수 없습니다.');
    }
    return evaluation;
  }

  private present(evaluation: EvaluationRecord) {
    return {
      id: evaluation.id,
      targetType: evaluation.targetType,
      targetId: evaluation.targetId,
      targetLabel: evaluation.targetId,
      status: evaluation.status,
      totalScore: Number(evaluation.totalScore),
      gradeCode: evaluation.gradeCode ?? '-',
      evaluationRound: evaluation.evaluationRound,
      policyVersionId: evaluation.policyVersionId,
      policyVersionCode: evaluation.policyVersionCode,
      evaluatorName: this.accessControl.getUser(evaluation.evaluatorUserId)
        .name,
      updatedAt: evaluation.updatedAt.toISOString(),
      isLocked: evaluation.isLocked,
      duplicateOf: evaluation.duplicateOf ?? undefined,
      items: evaluation.items.map((item) => ({
        id: item.id,
        criterionCode: item.criterionCode,
        criterionName: item.criterionName,
        selectedLevelCode: item.selectedLevelCode,
        selectedLevelName: item.selectedLevelName,
        selectedScore: Number(item.selectedScore),
        comment: item.comment ?? undefined,
      })),
    };
  }

  async targets() {
    const policy = await this.activePolicy();
    const submissions = await this.prisma.inventionSubmission.findMany({
      where: { status: 'COMMITTEE_REVIEW' },
      include: { inventorShares: true, evaluations: true },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      policyVersionId: policy.id,
      policyVersionCode: policy.versionCode,
      grades: policy.grades.map((grade) => ({
        gradeCode: grade.gradeCode,
        gradeName: grade.gradeName,
        minScore: Number(grade.minScore),
        maxScore: Number(grade.maxScore),
      })),
      criteria: policy.evaluationCriteria.map((criterion) => ({
        criterionCode: criterion.criterionCode,
        criterionName: criterion.criterionName,
        maxScore: Number(criterion.maxScore),
        levels: criterion.levels.map((level) => ({
          levelCode: level.levelCode,
          levelName: level.levelName,
          mappedScore: Number(level.mappedScore),
        })),
      })),
      submissions: submissions.map((submission) => ({
        id: submission.id,
        submissionNo: submission.submissionNo,
        title: submission.title,
        summary: submission.summary,
        businessUnit: submission.businessUnit ?? '-',
        currentStatus: submission.status,
        currentStatusLabel: submission.status,
        nextAction: '평가 생성',
        dueDate: submission.decisionDueAt?.toISOString(),
        updatedAt: submission.updatedAt.toISOString(),
        submittedAt: submission.submittedAt?.toISOString(),
        ownerName:
          submission.inventorShares.find((share) => share.isPrimary)
            ?.inventorName ??
          submission.inventorShares[0]?.inventorName ??
          '-',
        submitterName: this.accessControl.getUser(submission.submitterUserId)
          .name,
        shareSummary: submission.inventorShares
          .map((share) => `${share.inventorName} ${Number(share.shareRatio)}%`)
          .join(', '),
        attachmentsCount: 0,
        linkedEvaluationId: submission.evaluations[0]?.id,
        linkedEvaluationGrade:
          submission.evaluations[0]?.gradeCode ?? undefined,
      })),
      patents: [],
    };
  }

  async list() {
    const evaluations = await this.prisma.evaluation.findMany({
      include: { items: true },
      orderBy: { updatedAt: 'desc' },
    });
    return evaluations.map((evaluation) => this.present(evaluation));
  }

  async get(id: string) {
    return this.present(await this.findEvaluation(id));
  }

  async create(actorUserId: string, payload: CreateEvaluationDto) {
    this.assertCommittee(actorUserId);
    const policy = await this.activePolicy();
    const submission =
      payload.targetType === 'SUBMISSION'
        ? await this.prisma.inventionSubmission.findUnique({
            where: { id: payload.targetId },
          })
        : null;
    if (
      payload.targetType === 'SUBMISSION' &&
      (!submission || submission.status !== 'COMMITTEE_REVIEW')
    ) {
      throw new BadRequestException(
        '위원회 검토 상태의 신고 건만 평가할 수 있습니다.',
      );
    }

    const round = payload.evaluationRound ?? 1;
    const duplicate = await this.prisma.evaluation.findUnique({
      where: {
        targetType_targetId_policyVersionId_evaluationRound: {
          targetType: payload.targetType,
          targetId: payload.targetId,
          policyVersionId: policy.id,
          evaluationRound: round,
        },
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        '동일 대상과 정책 버전에 대한 중복 평가가 이미 존재합니다.',
      );
    }

    const domainPolicy = this.toPolicyVersion(policy);
    const totalScore = payload.items.reduce(
      (sum, item) => sum + Number(item.selectedScore ?? 0),
      0,
    );
    const grade = resolveGrade(domainPolicy, totalScore);

    const created = await this.prisma.evaluation.create({
      data: {
        targetType: payload.targetType,
        targetId: payload.targetId,
        submissionId:
          payload.targetType === 'SUBMISSION' ? payload.targetId : undefined,
        policyVersionId: policy.id,
        policyVersionCode: policy.versionCode,
        evaluationRound: round,
        totalScore,
        gradeCode: grade.gradeCode,
        evaluatorUserId: actorUserId,
        duplicateOf: payload.duplicateOf,
        policySnapshot: domainPolicy as unknown as Prisma.InputJsonValue,
        items: {
          create: payload.items.map((item) => {
            const criterion = policy.evaluationCriteria.find(
              (entry) => entry.criterionCode === item.criterionCode,
            );
            const level = criterion?.levels.find(
              (entry) => entry.levelCode === item.selectedLevelCode,
            );
            return {
              criterionCode: item.criterionCode,
              criterionName: criterion?.criterionName ?? item.criterionCode,
              selectedLevelCode: item.selectedLevelCode,
              selectedLevelName: level?.levelName ?? item.selectedLevelCode,
              selectedScore: item.selectedScore,
              comment: item.comment,
            };
          }),
        },
      },
      include: { items: true },
    });

    await this.prisma.submissionWorkflowEvent.create({
      data: {
        submissionId: payload.targetId,
        eventType: 'EVALUATION_CREATED',
        fromStatus: 'COMMITTEE_REVIEW',
        toStatus: 'COMMITTEE_REVIEW',
        actorUserId,
        actorName: this.accessControl.getUser(actorUserId).name,
        note: `${round}차 평가가 생성되었습니다.`,
      },
    });

    this.audit.record({
      actorUserId,
      actionType: 'EVALUATION_CREATED',
      targetType: 'EVALUATION',
      targetId: created.id,
      after: { targetId: created.targetId, round: created.evaluationRound },
    });

    return this.present(created);
  }

  async update(
    actorUserId: string,
    id: string,
    payload: UpdateEvaluationItemsDto,
  ) {
    this.assertCommittee(actorUserId);
    const evaluation = await this.findEvaluation(id);
    if (evaluation.isLocked || evaluation.status === 'FINALIZED') {
      throw new BadRequestException('확정된 평가표는 수정할 수 없습니다.');
    }

    const policy = await this.activePolicy();
    const domainPolicy = this.toPolicyVersion(policy);
    const totalScore = payload.items.reduce(
      (sum, item) => sum + Number(item.selectedScore ?? 0),
      0,
    );
    const grade = resolveGrade(domainPolicy, totalScore);

    await this.prisma.$transaction(async (tx) => {
      await tx.evaluationItem.deleteMany({ where: { evaluationId: id } });
      await tx.evaluation.update({
        where: { id },
        data: {
          totalScore,
          gradeCode: grade.gradeCode,
          items: {
            create: payload.items.map((item) => {
              const criterion = policy.evaluationCriteria.find(
                (entry) => entry.criterionCode === item.criterionCode,
              );
              const level = criterion?.levels.find(
                (entry) => entry.levelCode === item.selectedLevelCode,
              );
              return {
                criterionCode: item.criterionCode,
                criterionName: criterion?.criterionName ?? item.criterionCode,
                selectedLevelCode: item.selectedLevelCode,
                selectedLevelName: level?.levelName ?? item.selectedLevelCode,
                selectedScore: item.selectedScore,
                comment: item.comment,
              };
            }),
          },
        },
      });
    });

    this.audit.record({
      actorUserId,
      actionType: 'EVALUATION_UPDATED',
      targetType: 'EVALUATION',
      targetId: id,
      after: { totalScore, gradeCode: grade.gradeCode },
    });

    return this.get(id);
  }

  async finalize(
    actorUserId: string,
    id: string,
    payload?: FinalizeEvaluationDto,
  ) {
    this.assertCommittee(actorUserId);
    const evaluation = await this.findEvaluation(id);
    if (evaluation.isLocked || evaluation.status === 'FINALIZED') {
      return this.present(evaluation);
    }

    const finalized = await this.prisma.evaluation.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        isLocked: true,
        finalizedAt: new Date(now()),
      },
      include: { items: true },
    });

    if (evaluation.targetType === 'SUBMISSION') {
      await this.prisma.submissionWorkflowEvent.create({
        data: {
          submissionId: evaluation.targetId,
          eventType: 'EVALUATION_FINALIZED',
          fromStatus: 'COMMITTEE_REVIEW',
          toStatus: 'COMMITTEE_REVIEW',
          actorUserId,
          actorName: this.accessControl.getUser(actorUserId).name,
          note:
            payload?.note ??
            `${evaluation.evaluationRound}차 평가가 확정되었습니다.`,
        },
      });
    }

    this.audit.record({
      actorUserId,
      actionType: 'EVALUATION_FINALIZED',
      targetType: 'EVALUATION',
      targetId: id,
      after: { finalizedAt: finalized.finalizedAt?.toISOString() },
    });

    return this.present(finalized);
  }
}
