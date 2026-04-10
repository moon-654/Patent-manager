import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/audit.service';
import { InMemoryStoreService } from '../common/in-memory-store.service';
import { NotificationsService } from '../common/notifications.service';
import type { RewardCase, RewardDistribution } from '../domain/models';
import {
  presentRewardDetail,
  presentRewardSummary,
} from '../domain/presenters';
import {
  assertSharesTotal,
  createId,
  now,
  resolveGrade,
  roundAmount,
} from '../domain/utils';
import { PoliciesService } from '../policies/policies.service';

@Injectable()
export class RewardsService {
  constructor(
    private readonly store: InMemoryStoreService,
    private readonly policiesService: PoliciesService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private findReward(id: string) {
    const reward = this.store.snapshot.rewards.find((item) => item.id === id);
    if (!reward) {
      throw new NotFoundException('보상 건을 찾을 수 없습니다.');
    }

    return reward;
  }

  list() {
    return this.store.snapshot.rewards.map((reward) =>
      presentRewardSummary(this.store.snapshot, reward),
    );
  }

  get(id: string) {
    return presentRewardDetail(this.store.snapshot, this.findReward(id));
  }

  generate(
    actorUserId: string,
    payload: {
      targetId: string;
      targetType: 'SUBMISSION' | 'PATENT';
      rewardType: RewardCase['rewardType'];
      profit?: number;
    },
  ) {
    const policy = this.policiesService.getActivePolicy();
    const existing = this.store.snapshot.rewards.find(
      (item) =>
        item.targetId === payload.targetId &&
        item.rewardType === payload.rewardType &&
        item.policyVersionId === policy.id,
    );

    if (existing) {
      return presentRewardDetail(this.store.snapshot, existing);
    }

    const patent =
      payload.targetType === 'PATENT'
        ? this.store.snapshot.patents.find(
            (item) => item.id === payload.targetId,
          )
        : undefined;

    const submission =
      payload.targetType === 'SUBMISSION'
        ? this.store.snapshot.submissions.find(
            (item) => item.id === payload.targetId,
          )
        : patent?.submissionId
          ? this.store.snapshot.submissions.find(
              (item) => item.id === patent.submissionId,
            )
          : undefined;

    const evaluation = this.store.snapshot.evaluations.find(
      (item) => item.targetId === (submission?.id ?? patent?.id),
    );

    const gradeCode =
      evaluation?.gradeCode ??
      resolveGrade(policy, evaluation?.totalScore ?? 0).gradeCode;
    const rightType = patent?.rightType ?? 'PATENT';
    const countryScope = patent?.countryCode === 'KR' ? 'DOMESTIC' : 'OVERSEAS';

    let totalAmount = 0;
    let formula = 'matrix lookup';

    if (
      payload.rewardType === 'PRACTICE' ||
      payload.rewardType === 'DISPOSAL'
    ) {
      const rule = policy.formulaRules.find(
        (item) =>
          item.rewardType === payload.rewardType &&
          (payload.profit ?? 0) >= item.profitMin &&
          (item.profitMax === undefined ||
            (payload.profit ?? 0) <= item.profitMax),
      );

      if (rule?.formulaType === 'FIXED') {
        totalAmount = roundAmount(
          (rule.fixedAmount ?? 0) + (rule.extraAmount ?? 0),
          rule.roundingRule,
        );
        formula = 'fixed';
      } else if (rule) {
        totalAmount = roundAmount(
          (rule.fixedAmount ?? 0) +
            (payload.profit ?? 0) / (rule.denominatorValue ?? 1) +
            (rule.extraAmount ?? 0),
          rule.roundingRule,
        );
        formula = `${rule.fixedAmount ?? 0} + profit/${rule.denominatorValue ?? 1}`;
      }
    } else {
      totalAmount =
        policy.rewardMatrix.find(
          (row) =>
            row.rewardType === payload.rewardType &&
            row.rightType === rightType &&
            row.domesticOverseasType === countryScope &&
            row.gradeCode === gradeCode,
        )?.amount ?? 0;
    }

    const shares = submission?.shares ?? [];
    assertSharesTotal(shares);
    const distributions: RewardDistribution[] = shares.map((share) => ({
      id: createId(),
      userId: share.userId,
      inventorName: share.inventorName,
      shareRatio: share.shareRatio,
      calculatedAmount: roundAmount((totalAmount * share.shareRatio) / 100),
    }));

    const reward: RewardCase = {
      id: createId(),
      rewardNo: `RWD-${new Date().getFullYear()}-${String(this.store.snapshot.rewards.length + 1).padStart(4, '0')}`,
      rewardType: payload.rewardType,
      targetType: payload.targetType,
      targetId: payload.targetId,
      policyVersionId: policy.id,
      evaluationId: evaluation?.id,
      status: 'CALCULATED',
      totalAmount,
      currency: 'KRW',
      calculationSnapshot: {
        policyVersionCode: policy.versionCode,
        gradeCode,
        rewardType: payload.rewardType,
        rightType,
        countryScope,
        profit: payload.profit,
        formula,
      },
      distributions,
      adjustments: [],
      payments: [],
      createdAt: now(),
      updatedAt: now(),
    };

    this.store.snapshot.rewards.unshift(reward);
    this.audit.record({
      actorUserId,
      actionType: 'REWARD_GENERATED',
      targetType: 'REWARD',
      targetId: reward.id,
      after: reward,
    });

    return presentRewardDetail(this.store.snapshot, reward);
  }

  calculate(actorUserId: string, id: string) {
    const reward = this.findReward(id);
    reward.status = 'CALCULATED';
    reward.updatedAt = now();
    this.audit.record({
      actorUserId,
      actionType: 'REWARD_RECALCULATED',
      targetType: 'REWARD',
      targetId: id,
      after: reward.calculationSnapshot,
    });
    return presentRewardDetail(this.store.snapshot, reward);
  }

  approveRequest(id: string) {
    const reward = this.findReward(id);
    reward.status = 'APPROVAL_WAITING';
    reward.updatedAt = now();
    return presentRewardDetail(this.store.snapshot, reward);
  }

  approve(actorUserId: string, id: string) {
    const reward = this.findReward(id);
    reward.status = 'APPROVED';
    reward.updatedAt = now();
    this.audit.record({
      actorUserId,
      actionType: 'REWARD_APPROVED',
      targetType: 'REWARD',
      targetId: id,
      after: reward,
    });
    return presentRewardDetail(this.store.snapshot, reward);
  }

  notify(actorUserId: string, id: string) {
    const reward = this.findReward(id);
    reward.distributions.forEach((distribution) => {
      if (distribution.userId) {
        this.notifications.send({
          userId: distribution.userId,
          type: 'REWARD_NOTICE',
          channel: 'IN_APP',
          title: `${reward.rewardNo} 보상 통지`,
          body: `${distribution.inventorName}님의 지급 예정 금액은 ${distribution.calculatedAmount.toLocaleString()}원입니다.`,
        });
      }
    });

    this.audit.record({
      actorUserId,
      actionType: 'REWARD_NOTIFIED',
      targetType: 'REWARD',
      targetId: id,
    });
    return { success: true };
  }

  addPayment(
    actorUserId: string,
    id: string,
    payload: { paymentMethod?: string; accountingRefNo?: string },
  ) {
    const reward = this.findReward(id);

    reward.distributions.forEach((distribution) => {
      reward.payments.push({
        id: createId(),
        rewardDistributionId: distribution.id,
        paymentStatus: 'PAID',
        paidAt: now(),
        paymentMethod: payload.paymentMethod ?? 'ACCOUNT_TRANSFER',
        accountingRefNo: payload.accountingRefNo,
      });
    });

    reward.status = 'PAID';
    reward.updatedAt = now();
    this.audit.record({
      actorUserId,
      actionType: 'REWARD_PAID',
      targetType: 'REWARD',
      targetId: id,
      after: reward.payments,
    });
    return presentRewardDetail(this.store.snapshot, reward);
  }

  listMyRewards(userId: string) {
    return this.store.snapshot.rewards
      .filter((reward) =>
        reward.distributions.some(
          (distribution) => distribution.userId === userId,
        ),
      )
      .map((reward) => presentRewardSummary(this.store.snapshot, reward));
  }
}
