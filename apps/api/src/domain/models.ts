export type RoleCode = 'INVENTOR' | 'IP_MANAGER' | 'COMMITTEE' | 'ADMIN';
export type ScopeType = 'SELF' | 'DEPT' | 'ALL';
export type SubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'INTAKE_REVIEW'
  | 'UNDER_REVIEW'
  | 'RETURNED'
  | 'COMMITTEE_REVIEW'
  | 'REJECTED'
  | 'ACCEPTED'
  | 'HOLD';
export type DecisionType = 'ACCEPT' | 'REJECT' | 'HOLD';
export type EvaluationStatus = 'DRAFT' | 'FINALIZED';
export type PatentStatus = 'FILED' | 'OA' | 'REGISTERED' | 'ACTIVE' | 'EXPIRED';
export type RewardStatus =
  | 'PENDING'
  | 'CALCULATED'
  | 'APPROVAL_WAITING'
  | 'APPROVED'
  | 'PAYMENT_REQUESTED'
  | 'PAID'
  | 'CANCELED';
export type PolicyStatus =
  | 'DRAFT'
  | 'APPROVAL_WAITING'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED';
export type OaStatus = 'PREPARING' | 'SUBMITTED' | 'OVERDUE';
export type FormCode =
  | 'FORM1'
  | 'FORM2'
  | 'FORM3_1'
  | 'FORM3_2'
  | 'FORM4'
  | 'FORM5'
  | 'FORM6'
  | 'FORM7'
  | 'FORM8'
  | 'FORM9';

export interface AppUser {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  department: string;
  positionName: string;
  status: 'ACTIVE' | 'INACTIVE';
  roles: { code: RoleCode; scopeType: ScopeType }[];
}

export interface FileAttachment {
  id: string;
  originalName: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  versionNo: number;
}

export interface SubmissionInventorShare {
  id: string;
  userId?: string;
  inventorName: string;
  inventorNameEn?: string;
  shareRatio: number;
  isPrimary: boolean;
  department?: string;
  phoneNumber?: string;
  residentRegistrationNumber?: string;
  address?: string;
}

export interface SubmissionFormData {
  form1: {
    receiptNumber?: string;
    receiptDate?: string;
    receiverTitle?: string;
    receiverName?: string;
    inventionTitleKo: string;
    inventionTitleEn?: string;
    relatedProjectName?: string;
    fundingAgency?: string;
    researchPeriod?: string;
    desiredCountries: string[];
    disclosureType: string[];
    disclosureDate?: string;
    disclosureAttachmentNote?: string;
    inventionCategory: 'JOB_INVENTION' | 'PERSONAL_INVENTION';
    inventionStage: string;
    additionalResearchNeeded: boolean;
    commercializationAreas?: string;
    interestedCompanies: string[];
    researchNoteManaged: boolean;
    researchNoteLocation?: string;
    relatedPatentKeywords?: string;
  };
  form2: {
    assignmentShares: {
      inventorName: string;
      residentRegistrationNumber?: string;
      address?: string;
      shareRatio: number;
      signedAt?: string;
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

export interface FormSnapshot {
  id: string;
  formCode: FormCode;
  targetType:
    | 'SUBMISSION'
    | 'PATENT'
    | 'COMMITTEE_NOTICE'
    | 'APPEAL_REQUEST'
    | 'APPEAL_DECISION'
    | 'APPLICATION_NOTICE'
    | 'MEETING_MINUTE';
  targetId: string;
  revisionNo?: number;
  title: string;
  generatedBy: string;
  generatedAt: string;
  fileName: string;
  filePath: string;
  previewLines: string[];
}

export interface InventionSubmission {
  id: string;
  submissionNo: string;
  title: string;
  submitterUserId: string;
  summary: string;
  businessUnit: string;
  status: SubmissionStatus;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  shares: SubmissionInventorShare[];
  attachments: FileAttachment[];
  reviewNotes: {
    id: string;
    type: 'REVIEW_REQUEST' | 'RETURN' | 'REJECTION';
    reason: string;
    createdAt: string;
    createdBy: string;
  }[];
  snapshot: {
    title: string;
    summary: string;
    submittedAt?: string;
    shares: SubmissionInventorShare[];
  };
  formData: SubmissionFormData;
}

export interface SuccessionDecision {
  id: string;
  submissionId: string;
  decisionType: DecisionType;
  decidedBy: string;
  decidedAt: string;
  dueDate: string;
  reason: string;
}

export interface CommitteeNotice {
  id: string;
  submissionId: string;
  templateCode: 'FORM5' | 'FORM6';
  documentNo: string;
  noticeDate: string;
  recipientUserId: string;
  title: string;
  committeeChairName: string;
  representativeName: string;
  decisionItems: {
    jobInventionDecision?: string;
    successionDecision?: string;
    patentGrade?: string;
    domesticOverseasPlan?: string;
    examinationRequestPlan?: string;
    remarks?: string;
  };
  generatedAt: string;
  generatedBy: string;
  sentAt?: string;
}

export interface AppealRequest {
  id: string;
  submissionId?: string;
  rewardId?: string;
  requestType: 'REVIEW' | 'REHEARING';
  applicantUserId: string;
  applicantName: string;
  applicantDepartment?: string;
  applicantAddress?: string;
  applicantResidentRegistrationNumber?: string;
  receivedAt: string;
  receivedNo: string;
  inventionTitle: string;
  reasonOccurredAt?: string;
  committeeNoticeDate?: string;
  purpose: string;
  reason: string;
  evidenceFiles: FileAttachment[];
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'DECIDED' | 'NOTIFIED';
}

export interface AppealDecision {
  id: string;
  appealRequestId: string;
  templateCode: 'FORM8';
  documentNo: string;
  decisionDate: string;
  requestSummary: string;
  decisionSummary: string;
  generatedBy: string;
  notifiedAt?: string;
}

export interface PolicyGrade {
  gradeCode: string;
  gradeName: string;
  minScore: number;
  maxScore: number;
}

export interface PolicyEvaluationLevel {
  levelCode: string;
  levelName: string;
  mappedScore: number;
}

export interface PolicyCriterion {
  criterionCode: string;
  criterionName: string;
  maxScore: number;
  displayOrder: number;
  levels: PolicyEvaluationLevel[];
}

export interface PolicyRewardMatrixRow {
  id: string;
  rewardType: 'APPLICATION' | 'REGISTRATION' | 'HOLD';
  rightType: 'PATENT' | 'UTILITY_MODEL' | 'DESIGN';
  domesticOverseasType: 'DOMESTIC' | 'OVERSEAS';
  gradeCode: string;
  amount: number;
}

export interface PolicyFormulaRule {
  id: string;
  rewardType: 'PRACTICE' | 'DISPOSAL';
  profitMin: number;
  profitMax?: number;
  formulaType: 'FIXED' | 'VARIABLE';
  fixedAmount?: number;
  numeratorSource?: 'profit';
  denominatorValue?: number;
  extraAmount?: number;
  roundingRule: 'FLOOR' | 'ROUND' | 'CEIL';
}

export interface PolicyVersion {
  id: string;
  versionCode: string;
  name: string;
  status: PolicyStatus;
  effectiveDate: string;
  noticeDate: string;
  createdBy: string;
  approvedBy?: string;
  isDisadvantageous: boolean;
  changeSummary: string;
  grades: PolicyGrade[];
  criteria: PolicyCriterion[];
  cutoffRules: {
    applicationScope: 'DOMESTIC' | 'OVERSEAS';
    cutoffScore: number;
  }[];
  rewardMatrix: PolicyRewardMatrixRow[];
  formulaRules: PolicyFormulaRule[];
}

export interface EvaluationItem {
  criterionCode: string;
  selectedLevelCode: string;
  selectedScore: number;
  comment?: string;
}

export interface Evaluation {
  id: string;
  targetType: 'SUBMISSION' | 'PATENT';
  targetId: string;
  policyVersionId: string;
  evaluationRound: number;
  status: EvaluationStatus;
  totalScore: number;
  gradeCode: string;
  evaluatorUserId: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: EvaluationItem[];
}

export interface MeetingMinute {
  id: string;
  title: string;
  meetingDate: string;
  status: 'DRAFT' | 'APPROVED';
  retentionUntil: string;
  attendees: string[];
  agenda: string[];
  resolution: string;
  approvedBy?: string;
}

export interface PatentDocument {
  id: string;
  documentType: string;
  originalName: string;
  versionNo: number;
  uploadedAt: string;
}

export interface OaEvent {
  id: string;
  oaNo: string;
  dueDate: string;
  status: OaStatus;
  assigneeUserId: string;
  responseNote?: string;
  documents: PatentDocument[];
}

export interface ApplicationNotice {
  id: string;
  patentId: string;
  templateCode: 'FORM9';
  documentNo: string;
  recipientUserId: string;
  inventionTitle: string;
  inventorNames: string[];
  rightContent?: string;
  isFiled: boolean;
  applicationDate?: string;
  applicationNo?: string;
  notFiledReason?: string;
  generatedAt: string;
  generatedBy: string;
  sentAt?: string;
}

export interface PatentMaster {
  id: string;
  submissionId?: string;
  title: string;
  rightType: 'PATENT' | 'UTILITY_MODEL' | 'DESIGN';
  countryCode: string;
  applicationNo: string;
  applicationDate: string;
  registrationNo?: string;
  registrationDate?: string;
  currentStatus: PatentStatus;
  ownerType: 'COMPANY' | 'EMPLOYEE';
  managerUserId: string;
  documents: PatentDocument[];
  oaEvents: OaEvent[];
  statusHistory: {
    fromStatus?: PatentStatus;
    toStatus: PatentStatus;
    reason: string;
    changedBy: string;
    changedAt: string;
  }[];
}

export interface RewardDistribution {
  id: string;
  userId?: string;
  inventorName: string;
  shareRatio: number;
  calculatedAmount: number;
  adjustedAmount?: number;
}

export interface RewardAdjustment {
  id: string;
  adjustmentType: 'RECALC' | 'MANUAL';
  beforeAmount: number;
  afterAmount: number;
  reason: string;
  approvedBy?: string;
  createdAt: string;
}

export interface RewardPayment {
  id: string;
  rewardDistributionId: string;
  paymentStatus: 'REQUESTED' | 'APPROVED' | 'PAID';
  paidAt?: string;
  paymentMethod?: string;
  accountingRefNo?: string;
}

export interface RewardCase {
  id: string;
  rewardNo: string;
  rewardType: 'APPLICATION' | 'REGISTRATION' | 'PRACTICE' | 'DISPOSAL' | 'HOLD';
  targetType: 'SUBMISSION' | 'PATENT';
  targetId: string;
  policyVersionId: string;
  evaluationId?: string;
  status: RewardStatus;
  totalAmount: number;
  currency: 'KRW';
  calculationSnapshot: {
    policyVersionCode: string;
    gradeCode?: string;
    rewardType: string;
    rightType?: string;
    countryScope?: string;
    profit?: number;
    formula?: string;
  };
  distributions: RewardDistribution[];
  adjustments: RewardAdjustment[];
  payments: RewardPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface PolicyAnnouncement {
  id: string;
  policyVersionId: string;
  title: string;
  body: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED';
  announcedAt?: string;
  targets: {
    userId: string;
    deliveryStatus: 'PENDING' | 'SENT' | 'FAILED';
    readAt?: string;
  }[];
}

export interface PolicyConsent {
  id: string;
  policyVersionId: string;
  userId: string;
  consentStatus: 'AGREED' | 'DISAGREED' | 'PENDING';
  submittedAt?: string;
  signatureType?: 'SIMPLE' | 'CERTIFIED';
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  channel: 'IN_APP' | 'EMAIL';
  title: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  sentAt?: string;
  readAt?: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

export interface AppState {
  users: AppUser[];
  submissions: InventionSubmission[];
  successionDecisions: SuccessionDecision[];
  committeeNotices: CommitteeNotice[];
  appealRequests: AppealRequest[];
  appealDecisions: AppealDecision[];
  applicationNotices: ApplicationNotice[];
  formSnapshots: FormSnapshot[];
  evaluations: Evaluation[];
  meetingMinutes: MeetingMinute[];
  patents: PatentMaster[];
  rewards: RewardCase[];
  policies: PolicyVersion[];
  announcements: PolicyAnnouncement[];
  consents: PolicyConsent[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}
