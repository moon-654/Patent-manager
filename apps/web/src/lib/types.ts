export type RoleCode = "INVENTOR" | "IP_MANAGER" | "COMMITTEE" | "ADMIN";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  department: string;
  positionName: string;
  roles: { code: RoleCode; scopeType: "SELF" | "DEPT" | "ALL" }[];
}

export interface DashboardHealth {
  service: string;
  status: string;
  timestamp: string;
  counts: {
    users: number;
    submissions: number;
    patents: number;
    rewards: number;
    policies: number;
  };
}

export interface LifecycleStep {
  key: string;
  label: string;
  status: "done" | "current" | "pending";
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone?: "neutral" | "warning" | "success";
}

export interface GeneratedDocument {
  id: string;
  formCode: string;
  targetType: string;
  targetId: string;
  revisionNo?: number;
  title: string;
  generatedAt: string;
  generatedBy: string;
  fileName: string;
  filePath: string;
  previewLines: string[];
}

export interface SubmissionSummary {
  id: string;
  submissionNo: string;
  title: string;
  summary: string;
  businessUnit: string;
  currentStatus: string;
  currentStatusLabel: string;
  nextAction: string;
  dueDate?: string;
  updatedAt: string;
  submittedAt?: string;
  ownerName: string;
  submitterName: string;
  shareSummary: string;
  attachmentsCount: number;
  linkedPatentId?: string;
  linkedPatentTitle?: string;
  linkedEvaluationId?: string;
  linkedEvaluationGrade?: string;
}

export interface SubmissionFormData {
  form1: {
    inventionTitleKo: string;
    inventionTitleEn?: string;
    desiredCountries: string[];
    disclosureType: string[];
    inventionCategory: string;
    inventionStage: string;
    additionalResearchNeeded: boolean;
    interestedCompanies: string[];
    relatedProjectName?: string;
    fundingAgency?: string;
    researchPeriod?: string;
    researchNoteManaged: boolean;
    researchNoteLocation?: string;
    relatedPatentKeywords?: string;
  };
  form2: {
    assignmentShares: {
      inventorName: string;
      shareRatio: number;
      address?: string;
      residentRegistrationNumber?: string;
    }[];
    assigneeName: string;
    assigneeTitle: string;
    assigneeCompany: string;
  };
  form3: {
    drawingDescription?: string;
    technicalField?: string;
    background?: string;
    technicalProblem?: string;
    solvingMeans?: string;
    functionAndEffect?: string;
    examples?: string;
    inventionEffect?: string;
    claims: string[];
  };
  form4: {
    priorPatentRows: {
      existingPatent?: string;
      noveltyDiff?: string;
      inventiveDiff?: string;
    }[];
    referenceRows: {
      reference?: string;
      summary?: string;
      distinguishingFeature?: string;
    }[];
  };
}

export interface SubmissionDetail extends SubmissionSummary {
  shares: {
    id: string;
    inventorName: string;
    inventorNameEn?: string;
    shareRatio: number;
    isPrimary: boolean;
    department?: string;
    phoneNumber?: string;
  }[];
  attachments: {
    id: string;
    originalName: string;
    type: string;
    versionNo: number;
    uploadedAt?: string;
  }[];
  reviewNotes: {
    id: string;
    reason: string;
    createdAt: string;
    type: string;
  }[];
  formData: SubmissionFormData;
  formSnapshots: GeneratedDocument[];
  committeeNotices: {
    id: string;
    templateCode: string;
    documentNo: string;
    noticeDate: string;
    title: string;
    decisionItems: Record<string, string | undefined>;
  }[];
  appealRequests: {
    id: string;
    requestType: string;
    receivedNo: string;
    receivedAt: string;
    purpose: string;
    reason: string;
    status: string;
  }[];
  appealDecisions: {
    id: string;
    documentNo: string;
    decisionDate: string;
    decisionSummary: string;
  }[];
  lifecycle: LifecycleStep[];
  timeline: TimelineItem[];
  linkedPatent: {
    id: string;
    submissionNo?: string;
    title: string;
    applicationNo?: string;
  } | null;
  linkedRewards: {
    id: string;
    rewardNo: string;
    status: string;
    totalAmount: number;
  }[];
  successionDecision: {
    decisionType: string;
    decidedAt: string;
    reason: string;
  } | null;
  currentRevisionNo: number;
  availableActions: string[];
  requiredAttachments: {
    code: string;
    label: string;
    uploaded: boolean;
  }[];
  checklist: {
    code: string;
    label: string;
    passed: boolean;
    note?: string;
  }[];
  decisionDueAt?: string;
  linkedEvaluations: {
    id: string;
    status: string;
    totalScore: number;
    gradeCode: string;
    evaluationRound: number;
    policyVersionCode: string;
    isLocked: boolean;
  }[];
  linkedMeetingMinutes: {
    id: string;
    title: string;
    status: string;
    meetingDate: string;
    retentionUntil: string;
  }[];
}

export interface EvaluationSummary {
  id: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  status: string;
  totalScore: number;
  gradeCode: string;
  evaluationRound: number;
  policyVersionId: string;
  policyVersionCode: string;
  evaluatorName: string;
  updatedAt: string;
  isLocked: boolean;
  duplicateOf?: string;
  items?: {
    id: string;
    criterionCode: string;
    criterionName: string;
    selectedLevelCode: string;
    selectedLevelName: string;
    selectedScore: number;
    comment?: string;
  }[];
}

export interface MeetingMinute {
  id: string;
  title: string;
  meetingDate: string;
  status: string;
  retentionUntil: string;
  linkedSubmissionIds?: string[];
  linkedEvaluationIds?: string[];
  resolution?: string;
}

export interface PatentSummary {
  id: string;
  title: string;
  applicationNo: string;
  countryCode: string;
  currentStatus: string;
  currentStatusLabel: string;
  nextAction: string;
  assigneeName: string;
  updatedAt: string;
  dueDate?: string;
  rightType: string;
  oaPending: boolean;
  linkedSubmissionId?: string;
}

export interface PatentDetail extends PatentSummary {
  documents: {
    id: string;
    documentType: string;
    originalName: string;
    versionNo: number;
    uploadedAt: string;
  }[];
  oaEvents: {
    id: string;
    oaNo: string;
    dueDate: string;
    status: string;
    responseNote?: string;
  }[];
  applicationNotices: {
    id: string;
    documentNo: string;
    generatedAt: string;
    applicationNo?: string;
    applicationDate?: string;
    isFiled: boolean;
  }[];
  formSnapshots: GeneratedDocument[];
  lifecycle: LifecycleStep[];
  timeline: TimelineItem[];
  linkedSubmission: {
    id: string;
    submissionNo: string;
    title: string;
  } | null;
  linkedRewards: {
    id: string;
    rewardNo: string;
    status: string;
    totalAmount: number;
  }[];
}

export interface RewardSummary {
  id: string;
  rewardNo: string;
  rewardType: string;
  currentStatus: string;
  currentStatusLabel: string;
  nextAction: string;
  ownerName: string;
  totalAmount: number;
  updatedAt: string;
  policyVersionId: string;
  policyVersionCode: string;
  targetType: string;
  targetId: string;
  gradeCode?: string;
  paymentProgress: string;
}

export interface RewardDetail extends RewardSummary {
  lifecycle: LifecycleStep[];
  timeline: TimelineItem[];
  calculationSnapshot: {
    policyVersionCode: string;
    gradeCode?: string;
    rewardType: string;
    rightType?: string;
    countryScope?: string;
    profit?: number;
    formula?: string;
  };
  distributions: {
    id: string;
    inventorName: string;
    shareRatio: number;
    calculatedAmount: number;
    adjustedAmount?: number;
  }[];
  adjustments: {
    id: string;
    adjustmentType: string;
    beforeAmount: number;
    afterAmount: number;
    reason: string;
    createdAt: string;
  }[];
  payments: {
    id: string;
    paymentStatus: string;
    paidAt?: string;
    paymentMethod?: string;
    accountingRefNo?: string;
  }[];
  linkedPolicy: {
    id: string;
    versionCode: string;
    name: string;
  } | null;
  linkedEvaluation: {
    id: string;
    totalScore: number;
    gradeCode: string;
  } | null;
}

export interface PolicySummary {
  id: string;
  versionCode: string;
  name: string;
  currentStatus: string;
  currentStatusLabel: string;
  nextAction: string;
  effectiveDate: string;
  updatedAt?: string;
  ownerName: string;
  changeSummary: string;
  rewardRows: number;
  criteriaCount: number;
}

export interface PolicyDetail extends PolicySummary {
  grades: {
    gradeCode: string;
    gradeName: string;
    minScore: number;
    maxScore: number;
  }[];
  criteria: {
    criterionCode: string;
    criterionName: string;
    levels: { levelCode: string; levelName: string; mappedScore: number }[];
  }[];
  rewardMatrix: {
    id: string;
    rewardType: string;
    rightType: string;
    gradeCode: string;
    amount: number;
  }[];
  formulaRules: {
    id: string;
    rewardType: string;
    profitMin: number;
    profitMax?: number;
    formulaType: string;
    fixedAmount?: number;
    denominatorValue?: number;
    extraAmount?: number;
    roundingRule: string;
  }[];
  lifecycle: LifecycleStep[];
  timeline: TimelineItem[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  status: string;
  sentAt?: string;
}
