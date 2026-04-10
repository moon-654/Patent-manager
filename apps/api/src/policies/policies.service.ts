import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/audit.service';
import { InMemoryStoreService } from '../common/in-memory-store.service';
import { NotificationsService } from '../common/notifications.service';
import type {
  PolicyAnnouncement,
  PolicyConsent,
  PolicyVersion,
} from '../domain/models';
import {
  presentPolicyDetail,
  presentPolicySummary,
} from '../domain/presenters';
import { createId, now, resolveGrade, roundAmount } from '../domain/utils';

@Injectable()
export class PoliciesService {
  constructor(
    private readonly store: InMemoryStoreService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private findPolicy(id: string) {
    const policy = this.store.snapshot.policies.find((item) => item.id === id);

    if (!policy) {
      throw new NotFoundException('정책 버전을 찾을 수 없습니다.');
    }

    return policy;
  }

  list() {
    return this.store.snapshot.policies.map((policy) =>
      presentPolicySummary(this.store.snapshot, policy),
    );
  }

  get(id: string) {
    return presentPolicyDetail(this.store.snapshot, this.findPolicy(id));
  }

  getActivePolicy() {
    return (
      this.store.snapshot.policies.find((item) => item.status === 'ACTIVE') ??
      this.store.snapshot.policies[0]
    );
  }

  create(actorUserId: string, payload: Partial<PolicyVersion>) {
    const base = this.getActivePolicy();
    const policy: PolicyVersion = {
      ...base,
      ...payload,
      id: createId(),
      versionCode: payload.versionCode ?? `POL-${Date.now()}`,
      name: payload.name ?? '신규 정책 초안',
      status: 'DRAFT',
      createdBy: actorUserId,
      approvedBy: undefined,
      effectiveDate: payload.effectiveDate ?? now(),
      noticeDate: payload.noticeDate ?? now(),
      changeSummary: payload.changeSummary ?? '복제 생성',
    };

    this.store.snapshot.policies.unshift(policy);
    this.audit.record({
      actorUserId,
      actionType: 'POLICY_CREATED',
      targetType: 'POLICY',
      targetId: policy.id,
      after: policy,
    });
    return presentPolicyDetail(this.store.snapshot, policy);
  }

  clone(actorUserId: string, id: string) {
    const policy = this.findPolicy(id);
    return this.create(actorUserId, {
      ...policy,
      name: `${policy.name} 복제본`,
      changeSummary: `${policy.versionCode} 기준 복제`,
    });
  }

  update(actorUserId: string, id: string, payload: Partial<PolicyVersion>) {
    const policy = this.findPolicy(id);
    const before = JSON.parse(JSON.stringify(policy)) as PolicyVersion;
    Object.assign(policy, payload);

    this.audit.record({
      actorUserId,
      actionType: 'POLICY_UPDATED',
      targetType: 'POLICY',
      targetId: policy.id,
      before,
      after: policy,
    });

    return presentPolicyDetail(this.store.snapshot, policy);
  }

  updateRewardMatrix(
    actorUserId: string,
    id: string,
    rewardMatrix: PolicyVersion['rewardMatrix'],
  ) {
    return this.update(actorUserId, id, { rewardMatrix });
  }

  updateEvaluationCriteria(
    actorUserId: string,
    id: string,
    criteria: PolicyVersion['criteria'],
    grades?: PolicyVersion['grades'],
  ) {
    return this.update(actorUserId, id, {
      criteria,
      grades: grades ?? this.findPolicy(id).grades,
    });
  }

  updateFormulaRules(
    actorUserId: string,
    id: string,
    formulaRules: PolicyVersion['formulaRules'],
  ) {
    return this.update(actorUserId, id, { formulaRules });
  }

  approve(actorUserId: string, id: string) {
    const policy = this.findPolicy(id);
    policy.status = 'APPROVAL_WAITING';
    policy.approvedBy = actorUserId;
    return presentPolicyDetail(this.store.snapshot, policy);
  }

  activate(actorUserId: string, id: string) {
    const target = this.findPolicy(id);

    this.store.snapshot.policies.forEach((policy) => {
      if (policy.id !== id && policy.status === 'ACTIVE') {
        policy.status = 'EXPIRED';
      }
    });

    target.status = 'ACTIVE';
    target.approvedBy = actorUserId;

    this.audit.record({
      actorUserId,
      actionType: 'POLICY_ACTIVATED',
      targetType: 'POLICY',
      targetId: target.id,
      after: target,
    });

    return presentPolicyDetail(this.store.snapshot, target);
  }

  simulate(
    id: string,
    totalScore = 82,
    rewardType = 'APPLICATION',
    rightType = 'PATENT',
  ) {
    const policy = this.findPolicy(id);
    const grade = resolveGrade(policy, totalScore);
    const matrixRow = policy.rewardMatrix.find(
      (row) =>
        row.rewardType === rewardType &&
        row.rightType === rightType &&
        row.gradeCode === grade.gradeCode,
    );
    const amount = roundAmount(matrixRow?.amount ?? 0);

    return {
      policyId: policy.id,
      grade,
      simulatedAmount: amount,
      inputs: { totalScore, rewardType, rightType },
    };
  }

  createAnnouncement(
    actorUserId: string,
    policyId: string,
    payload: Partial<PolicyAnnouncement>,
  ) {
    const announcement: PolicyAnnouncement = {
      id: createId(),
      policyVersionId: policyId,
      title: payload.title ?? '정책 변경 공지',
      body: payload.body ?? '정책 변경 사항이 등록되었습니다.',
      status: 'SENT',
      announcedAt: now(),
      targets:
        payload.targets ??
        this.store.snapshot.users.map((user) => ({
          userId: user.id,
          deliveryStatus: 'SENT' as const,
        })),
    };

    this.store.snapshot.announcements.unshift(announcement);

    announcement.targets.forEach((target) => {
      this.notifications.send({
        userId: target.userId,
        type: 'POLICY_ANNOUNCEMENT',
        channel: 'IN_APP',
        title: announcement.title,
        body: announcement.body,
      });
    });

    this.audit.record({
      actorUserId,
      actionType: 'POLICY_ANNOUNCEMENT_SENT',
      targetType: 'POLICY',
      targetId: policyId,
      after: announcement,
    });

    return announcement;
  }

  listAnnouncements(policyId: string) {
    return this.store.snapshot.announcements.filter(
      (item) => item.policyVersionId === policyId,
    );
  }

  listConsents(policyId: string) {
    return this.store.snapshot.consents.filter(
      (item) => item.policyVersionId === policyId,
    );
  }

  submitConsent(
    policyId: string,
    userId: string,
    consentStatus: PolicyConsent['consentStatus'],
  ) {
    const existing = this.store.snapshot.consents.find(
      (item) => item.policyVersionId === policyId && item.userId === userId,
    );

    if (existing) {
      existing.consentStatus = consentStatus;
      existing.submittedAt = now();
      existing.signatureType = 'SIMPLE';
      return existing;
    }

    const consent: PolicyConsent = {
      id: createId(),
      policyVersionId: policyId,
      userId,
      consentStatus,
      submittedAt: now(),
      signatureType: 'SIMPLE',
    };

    this.store.snapshot.consents.unshift(consent);
    return consent;
  }

  listMyConsents(userId: string) {
    return this.store.snapshot.consents.filter(
      (item) => item.userId === userId,
    );
  }
}
