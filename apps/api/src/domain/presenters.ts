import type {
  AppState,
  Evaluation,
  InventionSubmission,
  PatentMaster,
  PolicyVersion,
  RewardCase,
  SubmissionStatus,
  PatentStatus,
  RewardStatus,
} from './models';

type TimelineItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone?: 'neutral' | 'warning' | 'success';
};

const submissionStatusLabel: Record<SubmissionStatus, string> = {
  DRAFT: '임시저장',
  SUBMITTED: '제출됨',
  INTAKE_REVIEW: '접수 검토',
  UNDER_REVIEW: '검토 중',
  RETURNED: '보완 요청',
  COMMITTEE_REVIEW: '위원회 검토',
  REJECTED: '반려',
  ACCEPTED: '승계 완료',
  HOLD: '출원 유보',
};

const patentStatusLabel: Record<PatentStatus, string> = {
  FILED: '출원 완료',
  OA: 'OA 대응 중',
  REGISTERED: '등록 완료',
  ACTIVE: '유지 중',
  EXPIRED: '소멸',
};

const rewardStatusLabel: Record<RewardStatus, string> = {
  PENDING: '산정 대기',
  CALCULATED: '산정 완료',
  APPROVAL_WAITING: '승인 대기',
  APPROVED: '승인 완료',
  PAYMENT_REQUESTED: '지급 요청',
  PAID: '지급 완료',
  CANCELED: '취소',
};

function findUserName(state: AppState, userId?: string) {
  if (!userId) {
    return '미지정';
  }

  return state.users.find((user) => user.id === userId)?.name ?? userId;
}

function computeStepStatus(order: string[], current: string) {
  const currentIndex = order.indexOf(current);
  return order.map((key, index) => ({
    key,
    status:
      index < currentIndex
        ? ('done' as const)
        : index === currentIndex
          ? ('current' as const)
          : ('pending' as const),
  }));
}

function nextSubmissionAction(status: SubmissionStatus) {
  switch (status) {
    case 'DRAFT':
      return '신고서 제출';
    case 'SUBMITTED':
      return '접수 검토';
    case 'INTAKE_REVIEW':
      return '위원회 검토 시작';
    case 'UNDER_REVIEW':
      return '승계 결정';
    case 'RETURNED':
      return '보완 후 재제출';
    case 'COMMITTEE_REVIEW':
      return '평가 및 승계 결정';
    case 'ACCEPTED':
      return '심의 결과 통지';
    case 'HOLD':
      return '유보 사유 확인';
    case 'REJECTED':
      return '종결 확인';
    default:
      return '확인';
  }
}

function nextPatentAction(status: PatentStatus, patent: PatentMaster) {
  if (status === 'OA') {
    const pending = patent.oaEvents.find((item) => item.status !== 'SUBMITTED');
    return pending ? `${pending.oaNo} 대응 제출` : '등록 처리';
  }

  switch (status) {
    case 'FILED':
      return '출원 통지 발송';
    case 'REGISTERED':
      return '등록 보상 검토';
    case 'ACTIVE':
      return '유지 관리';
    case 'EXPIRED':
      return '문서 보관';
    default:
      return '확인';
  }
}

function nextRewardAction(status: RewardStatus) {
  switch (status) {
    case 'PENDING':
      return '산정 실행';
    case 'CALCULATED':
      return '승인 요청';
    case 'APPROVAL_WAITING':
      return '승인';
    case 'APPROVED':
      return '지급 요청';
    case 'PAYMENT_REQUESTED':
      return '지급 완료';
    case 'PAID':
      return '통지 및 종료';
    case 'CANCELED':
      return '종결';
    default:
      return '확인';
  }
}

function buildSubmissionTimeline(
  state: AppState,
  submission: InventionSubmission,
): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: `${submission.id}-created`,
      title: '신고서 작성',
      description: `${findUserName(state, submission.submitterUserId)}님이 신고서를 작성했습니다.`,
      timestamp: submission.createdAt,
    },
  ];

  if (submission.submittedAt) {
    items.push({
      id: `${submission.id}-submitted`,
      title: '신고서 제출',
      description: `${submission.submissionNo}가 제출되었습니다.`,
      timestamp: submission.submittedAt,
      tone: 'success',
    });
  }

  submission.reviewNotes.forEach((note) => {
    items.push({
      id: note.id,
      title: note.type === 'REVIEW_REQUEST' ? '보완 요청' : '검토 메모',
      description: note.reason,
      timestamp: note.createdAt,
      tone: 'warning',
    });
  });

  state.successionDecisions
    .filter((decision) => decision.submissionId === submission.id)
    .forEach((decision) => {
      items.push({
        id: decision.id,
        title: '승계 결정',
        description: `${decision.decisionType} · ${decision.reason}`,
        timestamp: decision.decidedAt,
        tone: decision.decisionType === 'ACCEPT' ? 'success' : 'warning',
      });
    });

  state.committeeNotices
    .filter((notice) => notice.submissionId === submission.id)
    .forEach((notice) => {
      items.push({
        id: notice.id,
        title: '심의결과 통지서 생성',
        description: `${notice.templateCode} · ${notice.documentNo}`,
        timestamp: notice.generatedAt,
        tone: 'success',
      });
    });

  state.appealRequests
    .filter((appeal) => appeal.submissionId === submission.id)
    .forEach((appeal) => {
      items.push({
        id: appeal.id,
        title: '심의/재심 요구',
        description: `${appeal.requestType} · ${appeal.purpose}`,
        timestamp: appeal.receivedAt,
        tone: 'warning',
      });
    });

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function buildPatentTimeline(
  state: AppState,
  patent: PatentMaster,
): TimelineItem[] {
  const statusEvents = patent.statusHistory.map((history) => ({
    id: `${patent.id}-${history.changedAt}-${history.toStatus}`,
    title: patentStatusLabel[history.toStatus],
    description: history.reason,
    timestamp: history.changedAt,
    tone:
      history.toStatus === 'REGISTERED' || history.toStatus === 'ACTIVE'
        ? ('success' as const)
        : ('neutral' as const),
  }));

  const oaEvents = patent.oaEvents.map((event) => ({
    id: event.id,
    title: `OA ${event.oaNo}`,
    description:
      event.status === 'SUBMITTED'
        ? 'OA 대응 제출 완료'
        : `OA 대응 필요 · 기한 ${event.dueDate.slice(0, 10)}`,
    timestamp: event.dueDate,
    tone:
      event.status === 'SUBMITTED'
        ? ('success' as const)
        : ('warning' as const),
  }));

  const notices = state.applicationNotices
    .filter((notice) => notice.patentId === patent.id)
    .map((notice) => ({
      id: notice.id,
      title: '출원 통지서 생성',
      description: `${notice.documentNo} · ${notice.isFiled ? '출원 완료' : '미출원 통지'}`,
      timestamp: notice.generatedAt,
      tone: 'success' as const,
    }));

  return [...statusEvents, ...oaEvents, ...notices].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );
}

function buildRewardTimeline(reward: RewardCase): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: `${reward.id}-created`,
      title: '보상 건 생성',
      description: `${reward.rewardNo}가 생성되었습니다.`,
      timestamp: reward.createdAt,
    },
  ];

  reward.adjustments.forEach((adjustment) => {
    items.push({
      id: adjustment.id,
      title: '재산정/수동 조정',
      description: `${adjustment.adjustmentType} · ${adjustment.reason}`,
      timestamp: adjustment.createdAt,
      tone: 'warning',
    });
  });

  reward.payments.forEach((payment) => {
    items.push({
      id: payment.id,
      title: '지급 처리',
      description: `${payment.paymentStatus} · ${payment.paymentMethod ?? '미정'}`,
      timestamp: payment.paidAt ?? reward.updatedAt,
      tone: payment.paymentStatus === 'PAID' ? 'success' : 'neutral',
    });
  });

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function presentSubmissionSummary(
  state: AppState,
  submission: InventionSubmission,
) {
  const primaryInventor =
    submission.shares.find((share) => share.isPrimary)?.inventorName ??
    submission.shares[0]?.inventorName ??
    '미지정';
  const linkedPatent = state.patents.find(
    (patent) => patent.submissionId === submission.id,
  );
  const linkedEvaluation = state.evaluations.find(
    (evaluation) =>
      evaluation.targetType === 'SUBMISSION' &&
      evaluation.targetId === submission.id,
  );

  return {
    id: submission.id,
    submissionNo: submission.submissionNo,
    title: submission.title,
    summary: submission.summary,
    businessUnit: submission.businessUnit,
    currentStatus: submission.status,
    currentStatusLabel: submissionStatusLabel[submission.status],
    nextAction: nextSubmissionAction(submission.status),
    dueDate: submission.dueDate,
    updatedAt: submission.updatedAt,
    submittedAt: submission.submittedAt,
    ownerName: primaryInventor,
    submitterName: findUserName(state, submission.submitterUserId),
    shareSummary: submission.shares
      .map((share) => `${share.inventorName} ${share.shareRatio}%`)
      .join(', '),
    attachmentsCount: submission.attachments.length,
    linkedPatentId: linkedPatent?.id,
    linkedPatentTitle: linkedPatent?.title,
    linkedEvaluationId: linkedEvaluation?.id,
    linkedEvaluationGrade: linkedEvaluation?.gradeCode,
  };
}

export function presentSubmissionDetail(
  state: AppState,
  submission: InventionSubmission,
) {
  const base = presentSubmissionSummary(state, submission);
  const decision = state.successionDecisions.find(
    (item) => item.submissionId === submission.id,
  );
  const lifecycleOrder: SubmissionStatus[] = [
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    submission.status === 'RETURNED'
      ? 'RETURNED'
      : submission.status === 'REJECTED'
        ? 'REJECTED'
        : 'ACCEPTED',
  ];

  return {
    ...base,
    shares: submission.shares,
    attachments: submission.attachments,
    reviewNotes: submission.reviewNotes,
    formData: submission.formData,
    formSnapshots: state.formSnapshots.filter(
      (snapshot) =>
        snapshot.targetType === 'SUBMISSION' &&
        snapshot.targetId === submission.id,
    ),
    committeeNotices: state.committeeNotices.filter(
      (notice) => notice.submissionId === submission.id,
    ),
    appealRequests: state.appealRequests.filter(
      (appeal) => appeal.submissionId === submission.id,
    ),
    appealDecisions: state.appealDecisions.filter((decisionItem) =>
      state.appealRequests.some(
        (appeal) =>
          appeal.submissionId === submission.id &&
          appeal.id === decisionItem.appealRequestId,
      ),
    ),
    lifecycle: computeStepStatus(lifecycleOrder, submission.status).map(
      (step) => ({
        key: step.key,
        label: submissionStatusLabel[step.key as SubmissionStatus],
        status: step.status,
      }),
    ),
    timeline: buildSubmissionTimeline(state, submission),
    linkedPatent:
      state.patents.find((patent) => patent.submissionId === submission.id) ??
      null,
    linkedRewards: state.rewards
      .filter((reward) => reward.targetId === submission.id)
      .map((reward) => ({
        id: reward.id,
        rewardNo: reward.rewardNo,
        status: reward.status,
        totalAmount: reward.totalAmount,
      })),
    successionDecision: decision ?? null,
  };
}

export function presentPatentSummary(state: AppState, patent: PatentMaster) {
  const latestHistory = patent.statusHistory[0];
  const pendingOa = patent.oaEvents.find(
    (event) => event.status !== 'SUBMITTED',
  );
  return {
    id: patent.id,
    title: patent.title,
    applicationNo: patent.applicationNo,
    countryCode: patent.countryCode,
    currentStatus: patent.currentStatus,
    currentStatusLabel: patentStatusLabel[patent.currentStatus],
    nextAction: nextPatentAction(patent.currentStatus, patent),
    assigneeName: findUserName(state, patent.managerUserId),
    updatedAt: latestHistory?.changedAt ?? patent.applicationDate,
    dueDate: pendingOa?.dueDate,
    rightType: patent.rightType,
    oaPending: Boolean(pendingOa),
    linkedSubmissionId: patent.submissionId,
  };
}

export function presentPatentDetail(state: AppState, patent: PatentMaster) {
  const base = presentPatentSummary(state, patent);
  const submission = patent.submissionId
    ? state.submissions.find((item) => item.id === patent.submissionId)
    : undefined;
  return {
    ...base,
    documents: patent.documents,
    oaEvents: patent.oaEvents,
    applicationNotices: state.applicationNotices.filter(
      (notice) => notice.patentId === patent.id,
    ),
    formSnapshots: state.formSnapshots.filter(
      (snapshot) =>
        (snapshot.targetType === 'PATENT' ||
          snapshot.targetType === 'APPLICATION_NOTICE') &&
        snapshot.targetId === patent.id,
    ),
    lifecycle: computeStepStatus(
      ['FILED', 'OA', 'REGISTERED', 'ACTIVE', 'EXPIRED'],
      patent.currentStatus,
    ).map((step) => ({
      key: step.key,
      label: patentStatusLabel[step.key as PatentStatus],
      status: step.status,
    })),
    timeline: buildPatentTimeline(state, patent),
    linkedSubmission: submission
      ? {
          id: submission.id,
          submissionNo: submission.submissionNo,
          title: submission.title,
        }
      : null,
    linkedRewards: state.rewards
      .filter(
        (reward) =>
          reward.targetType === 'PATENT' && reward.targetId === patent.id,
      )
      .map((reward) => ({
        id: reward.id,
        rewardNo: reward.rewardNo,
        status: reward.status,
        totalAmount: reward.totalAmount,
      })),
  };
}

export function presentRewardSummary(state: AppState, reward: RewardCase) {
  const owner =
    reward.distributions.find((distribution) => distribution.userId)
      ?.inventorName ??
    reward.distributions[0]?.inventorName ??
    '미지정';
  return {
    id: reward.id,
    rewardNo: reward.rewardNo,
    rewardType: reward.rewardType,
    currentStatus: reward.status,
    currentStatusLabel: rewardStatusLabel[reward.status],
    nextAction: nextRewardAction(reward.status),
    ownerName: owner,
    totalAmount: reward.totalAmount,
    updatedAt: reward.updatedAt,
    policyVersionId: reward.policyVersionId,
    policyVersionCode: reward.calculationSnapshot.policyVersionCode,
    targetType: reward.targetType,
    targetId: reward.targetId,
    gradeCode: reward.calculationSnapshot.gradeCode,
    paymentProgress: `${reward.payments.filter((payment) => payment.paymentStatus === 'PAID').length}/${reward.distributions.length}`,
  };
}

export function presentRewardDetail(state: AppState, reward: RewardCase) {
  const base = presentRewardSummary(state, reward);
  const linkedPolicy = state.policies.find(
    (policy) => policy.id === reward.policyVersionId,
  );
  const linkedEvaluation = reward.evaluationId
    ? state.evaluations.find((item) => item.id === reward.evaluationId)
    : undefined;
  const rewardPath: RewardStatus[] =
    reward.status === 'CANCELED'
      ? ['PENDING', 'CALCULATED', 'APPROVAL_WAITING', 'APPROVED', 'CANCELED']
      : [
          'PENDING',
          'CALCULATED',
          'APPROVAL_WAITING',
          'APPROVED',
          'PAYMENT_REQUESTED',
          'PAID',
        ];
  return {
    ...base,
    distributions: reward.distributions,
    adjustments: reward.adjustments,
    payments: reward.payments,
    lifecycle: computeStepStatus(rewardPath, reward.status).map((step) => ({
      key: step.key,
      label: rewardStatusLabel[step.key as RewardStatus] ?? step.key,
      status: step.status,
    })),
    timeline: buildRewardTimeline(reward),
    calculationSnapshot: reward.calculationSnapshot,
    linkedPolicy: linkedPolicy
      ? {
          id: linkedPolicy.id,
          versionCode: linkedPolicy.versionCode,
          name: linkedPolicy.name,
        }
      : null,
    linkedEvaluation: linkedEvaluation
      ? {
          id: linkedEvaluation.id,
          totalScore: linkedEvaluation.totalScore,
          gradeCode: linkedEvaluation.gradeCode,
        }
      : null,
  };
}

export function presentEvaluationSummary(
  state: AppState,
  evaluation: Evaluation,
) {
  const targetSubmission = state.submissions.find(
    (submission) =>
      evaluation.targetType === 'SUBMISSION' &&
      submission.id === evaluation.targetId,
  );
  const targetPatent = state.patents.find(
    (patent) =>
      evaluation.targetType === 'PATENT' && patent.id === evaluation.targetId,
  );

  return {
    id: evaluation.id,
    targetType: evaluation.targetType,
    targetId: evaluation.targetId,
    targetLabel:
      targetSubmission?.title ?? targetPatent?.title ?? evaluation.targetId,
    status: evaluation.status,
    totalScore: evaluation.totalScore,
    gradeCode: evaluation.gradeCode,
    evaluationRound: evaluation.evaluationRound,
    policyVersionId: evaluation.policyVersionId,
    evaluatorName: findUserName(state, evaluation.evaluatorUserId),
    updatedAt: evaluation.updatedAt,
  };
}

export function presentPolicySummary(state: AppState, policy: PolicyVersion) {
  const rewardRows = policy.rewardMatrix.length;
  return {
    id: policy.id,
    versionCode: policy.versionCode,
    name: policy.name,
    currentStatus: policy.status,
    currentStatusLabel:
      policy.status === 'ACTIVE'
        ? '적용 중'
        : policy.status === 'DRAFT'
          ? '초안'
          : policy.status === 'APPROVAL_WAITING'
            ? '승인 대기'
            : policy.status === 'SCHEDULED'
              ? '적용 예정'
              : '종료',
    nextAction:
      policy.status === 'DRAFT'
        ? '시뮬레이션'
        : policy.status === 'APPROVAL_WAITING'
          ? '활성화'
          : '공지/비교',
    effectiveDate: policy.effectiveDate,
    updatedAt: policy.noticeDate,
    ownerName: findUserName(state, policy.createdBy),
    changeSummary: policy.changeSummary,
    rewardRows,
    criteriaCount: policy.criteria.length,
  };
}

export function presentPolicyDetail(state: AppState, policy: PolicyVersion) {
  const base = presentPolicySummary(state, policy);
  return {
    ...base,
    grades: policy.grades,
    criteria: policy.criteria,
    rewardMatrix: policy.rewardMatrix,
    formulaRules: policy.formulaRules,
    lifecycle: computeStepStatus(
      ['DRAFT', 'APPROVAL_WAITING', 'SCHEDULED', 'ACTIVE', 'EXPIRED'],
      policy.status,
    ).map((step) => ({
      key: step.key,
      label:
        step.key === 'DRAFT'
          ? '초안'
          : step.key === 'APPROVAL_WAITING'
            ? '승인 대기'
            : step.key === 'SCHEDULED'
              ? '적용 예정'
              : step.key === 'ACTIVE'
                ? '적용 중'
                : '종료',
      status: step.status,
    })),
    timeline: state.announcements
      .filter((announcement) => announcement.policyVersionId === policy.id)
      .map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        description: announcement.body,
        timestamp: announcement.announcedAt ?? policy.noticeDate,
        tone: announcement.status === 'SENT' ? 'success' : 'neutral',
      })),
  };
}
