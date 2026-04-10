import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/audit.service';
import { DocumentService } from '../common/document.service';
import { InMemoryStoreService } from '../common/in-memory-store.service';
import { NotificationsService } from '../common/notifications.service';
import type {
  ApplicationNotice,
  OaEvent,
  PatentDocument,
  PatentMaster,
  PatentStatus,
} from '../domain/models';
import {
  presentPatentDetail,
  presentPatentSummary,
} from '../domain/presenters';
import { createId, now } from '../domain/utils';

@Injectable()
export class PatentsService {
  constructor(
    private readonly store: InMemoryStoreService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly documents: DocumentService,
  ) {}

  private findPatent(id: string) {
    const patent = this.store.snapshot.patents.find((item) => item.id === id);
    if (!patent) {
      throw new NotFoundException('특허 마스터를 찾을 수 없습니다.');
    }

    return patent;
  }

  list() {
    return this.store.snapshot.patents.map((patent) =>
      presentPatentSummary(this.store.snapshot, patent),
    );
  }

  get(id: string) {
    return presentPatentDetail(this.store.snapshot, this.findPatent(id));
  }

  create(actorUserId: string, payload: Partial<PatentMaster>) {
    const patent: PatentMaster = {
      id: createId(),
      title: payload.title ?? '신규 특허',
      submissionId: payload.submissionId,
      rightType: payload.rightType ?? 'PATENT',
      countryCode: payload.countryCode ?? 'KR',
      applicationNo:
        payload.applicationNo ??
        `10-${new Date().getFullYear()}-${String(this.store.snapshot.patents.length + 1000)}`,
      applicationDate: payload.applicationDate ?? now(),
      currentStatus: 'FILED',
      ownerType: payload.ownerType ?? 'COMPANY',
      managerUserId: payload.managerUserId ?? actorUserId,
      documents: payload.documents ?? [],
      oaEvents: [],
      statusHistory: [
        {
          toStatus: 'FILED',
          reason: '특허 마스터 생성',
          changedBy: actorUserId,
          changedAt: now(),
        },
      ],
    };

    this.store.snapshot.patents.unshift(patent);
    return presentPatentDetail(this.store.snapshot, patent);
  }

  transitionStatus(
    actorUserId: string,
    id: string,
    toStatus: PatentStatus,
    reason: string,
  ) {
    const patent = this.findPatent(id);
    const fromStatus = patent.currentStatus;
    patent.currentStatus = toStatus;
    patent.statusHistory.unshift({
      fromStatus,
      toStatus,
      reason,
      changedBy: actorUserId,
      changedAt: now(),
    });

    this.audit.record({
      actorUserId,
      actionType: 'PATENT_STATUS_CHANGED',
      targetType: 'PATENT',
      targetId: id,
      before: { fromStatus },
      after: { toStatus },
      reason,
    });

    return presentPatentDetail(this.store.snapshot, patent);
  }

  oaList(patentId: string) {
    return this.findPatent(patentId).oaEvents;
  }

  createOa(actorUserId: string, patentId: string, payload: Partial<OaEvent>) {
    const patent = this.findPatent(patentId);
    const oaEvent: OaEvent = {
      id: createId(),
      oaNo:
        payload.oaNo ??
        `OA-${new Date().getFullYear()}-${patent.oaEvents.length + 1}`,
      dueDate: payload.dueDate ?? now(),
      status: payload.status ?? 'PREPARING',
      assigneeUserId: payload.assigneeUserId ?? actorUserId,
      responseNote: payload.responseNote,
      documents: payload.documents ?? [],
    };

    patent.oaEvents.unshift(oaEvent);
    patent.currentStatus = 'OA';
    patent.statusHistory.unshift({
      fromStatus: 'FILED',
      toStatus: 'OA',
      reason: `${oaEvent.oaNo} 대응 필요`,
      changedBy: actorUserId,
      changedAt: now(),
    });

    return {
      oaEvent,
      patent: presentPatentDetail(this.store.snapshot, patent),
    };
  }

  submitOaResponse(
    actorUserId: string,
    id: string,
    payload: { patentId: string; responseNote?: string; documentName?: string },
  ) {
    const patent = this.findPatent(payload.patentId);
    const oaEvent = patent.oaEvents.find((item) => item.id === id);
    if (!oaEvent) {
      throw new NotFoundException('OA 사건을 찾을 수 없습니다.');
    }

    oaEvent.status = 'SUBMITTED';
    oaEvent.responseNote = payload.responseNote;
    oaEvent.documents.unshift({
      id: createId(),
      documentType: 'OA_RESPONSE',
      originalName: payload.documentName ?? 'OA_대응서류.pdf',
      versionNo: oaEvent.documents.length + 1,
      uploadedAt: now(),
    });

    this.audit.record({
      actorUserId,
      actionType: 'OA_SUBMITTED',
      targetType: 'OA_EVENT',
      targetId: oaEvent.id,
      after: oaEvent,
    });

    return {
      oaEvent,
      patent: presentPatentDetail(this.store.snapshot, patent),
    };
  }

  addDocument(
    actorUserId: string,
    patentId: string,
    payload: Partial<PatentDocument>,
  ) {
    const patent = this.findPatent(patentId);
    const document: PatentDocument = {
      id: createId(),
      documentType: payload.documentType ?? 'APPLICATION',
      originalName: payload.originalName ?? '특허문서.pdf',
      versionNo:
        patent.documents.filter(
          (item) => item.documentType === payload.documentType,
        ).length + 1,
      uploadedAt: now(),
    };

    patent.documents.unshift(document);
    this.audit.record({
      actorUserId,
      actionType: 'PATENT_DOCUMENT_UPLOADED',
      targetType: 'PATENT',
      targetId: patentId,
      after: document,
    });

    return {
      document,
      patent: presentPatentDetail(this.store.snapshot, patent),
    };
  }

  listApplicationNotices(patentId: string) {
    return this.store.snapshot.applicationNotices.filter(
      (notice) => notice.patentId === patentId,
    );
  }

  async sendApplicationNotice(actorUserId: string, patentId: string) {
    const patent = this.findPatent(patentId);
    const submission = patent.submissionId
      ? this.store.snapshot.submissions.find(
          (item) => item.id === patent.submissionId,
        )
      : undefined;
    const recipientUserId = submission?.submitterUserId ?? 'user-inventor';
    const inventors =
      submission?.shares.map((share) => share.inventorName) ?? [];

    const notice: ApplicationNotice = {
      id: createId(),
      patentId,
      templateCode: 'FORM9',
      documentNo: `PAT-NOTICE-${new Date().getFullYear()}-${String(this.store.snapshot.applicationNotices.length + 1).padStart(4, '0')}`,
      recipientUserId,
      inventionTitle: patent.title,
      inventorNames: inventors,
      rightContent: patent.rightType,
      isFiled: true,
      applicationDate: patent.applicationDate,
      applicationNo: patent.applicationNo,
      generatedAt: now(),
      generatedBy: actorUserId,
      sentAt: now(),
    };

    this.store.snapshot.applicationNotices.unshift(notice);
    const snapshot = await this.documents.createRegulationFormSnapshot({
      targetType: 'APPLICATION_NOTICE',
      targetId: patentId,
      title: `${notice.documentNo} 출원 통지서`,
      generatedBy: actorUserId,
      payload: {
        formCode: 'FORM9',
        notice,
      },
    });
    this.store.snapshot.formSnapshots.unshift(snapshot);

    this.notifications.send({
      userId: recipientUserId,
      type: 'APPLICATION_NOTICE',
      channel: 'EMAIL',
      title: `${patent.applicationNo} 출원 통지`,
      body: `${patent.title} 특허가 회사 명의로 출원되었습니다.`,
    });

    this.audit.record({
      actorUserId,
      actionType: 'PATENT_APPLICATION_NOTICE_SENT',
      targetType: 'PATENT',
      targetId: patentId,
    });

    return { notice, snapshot };
  }
}
