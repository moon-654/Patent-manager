import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class InventorShareDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  inventorName!: string;

  @IsOptional()
  @IsString()
  inventorNameEn?: string;

  @IsNumber()
  shareRatio!: number;

  @IsBoolean()
  isPrimary!: boolean;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  residentRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

class SubmissionAttachmentDto {
  @IsIn(['ASSIGNMENT_DEED', 'DESCRIPTION', 'PRIOR_ART_REPORT', 'ETC'])
  attachmentType!: string;

  @IsString()
  originalName!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  filePath?: string;
}

class SubmissionForm1Dto {
  @IsString()
  inventionTitleKo!: string;

  @IsOptional()
  @IsString()
  inventionTitleEn?: string;

  @IsOptional()
  @IsString()
  relatedProjectName?: string;

  @IsOptional()
  @IsString()
  fundingAgency?: string;

  @IsOptional()
  @IsString()
  researchPeriod?: string;

  @IsArray()
  @IsString({ each: true })
  desiredCountries!: string[];

  @IsArray()
  @IsString({ each: true })
  disclosureType!: string[];

  @IsOptional()
  @IsString()
  disclosureDate?: string;

  @IsOptional()
  @IsString()
  disclosureAttachmentNote?: string;

  @IsIn(['JOB_INVENTION', 'PERSONAL_INVENTION'])
  inventionCategory!: 'JOB_INVENTION' | 'PERSONAL_INVENTION';

  @IsString()
  inventionStage!: string;

  @IsBoolean()
  additionalResearchNeeded!: boolean;

  @IsOptional()
  @IsString()
  commercializationAreas?: string;

  @IsArray()
  @IsString({ each: true })
  interestedCompanies!: string[];

  @IsBoolean()
  researchNoteManaged!: boolean;

  @IsOptional()
  @IsString()
  researchNoteLocation?: string;

  @IsOptional()
  @IsString()
  relatedPatentKeywords?: string;
}

class AssignmentShareDto {
  @IsString()
  inventorName!: string;

  @IsOptional()
  @IsString()
  residentRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  shareRatio!: number;

  @IsOptional()
  @IsString()
  signedAt?: string;
}

class SubmissionForm2Dto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentShareDto)
  assignmentShares!: AssignmentShareDto[];

  @IsString()
  assigneeName!: string;

  @IsString()
  assigneeTitle!: string;

  @IsString()
  assigneeCompany!: string;
}

class SubmissionForm3Dto {
  @IsOptional()
  @IsString()
  drawingDescription?: string;

  @IsOptional()
  @IsString()
  technicalField?: string;

  @IsOptional()
  @IsString()
  background?: string;

  @IsOptional()
  @IsString()
  technicalProblem?: string;

  @IsOptional()
  @IsString()
  solvingMeans?: string;

  @IsOptional()
  @IsString()
  functionAndEffect?: string;

  @IsOptional()
  @IsString()
  examples?: string;

  @IsOptional()
  @IsString()
  inventionEffect?: string;

  @IsArray()
  @IsString({ each: true })
  claims!: string[];
}

class PriorPatentRowDto {
  @IsOptional()
  @IsString()
  existingPatent?: string;

  @IsOptional()
  @IsString()
  noveltyDiff?: string;

  @IsOptional()
  @IsString()
  inventiveDiff?: string;
}

class ReferenceRowDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  distinguishingFeature?: string;
}

class SubmissionForm4Dto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriorPatentRowDto)
  priorPatentRows!: PriorPatentRowDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceRowDto)
  referenceRows!: ReferenceRowDto[];
}

class SubmissionFormDataDto {
  @ValidateNested()
  @Type(() => SubmissionForm1Dto)
  form1!: SubmissionForm1Dto;

  @ValidateNested()
  @Type(() => SubmissionForm2Dto)
  form2!: SubmissionForm2Dto;

  @ValidateNested()
  @Type(() => SubmissionForm3Dto)
  form3!: SubmissionForm3Dto;

  @ValidateNested()
  @Type(() => SubmissionForm4Dto)
  form4!: SubmissionForm4Dto;
}

class ChecklistItemDto {
  @IsString()
  code!: string;

  @IsString()
  label!: string;

  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateSubmissionDraftDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  businessUnit?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventorShareDto)
  shares!: InventorShareDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionAttachmentDto)
  attachments?: SubmissionAttachmentDto[];

  @ValidateNested()
  @Type(() => SubmissionFormDataDto)
  formData!: SubmissionFormDataDto;
}

export class UpdateSubmissionDraftDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  businessUnit?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventorShareDto)
  shares?: InventorShareDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionAttachmentDto)
  attachments?: SubmissionAttachmentDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SubmissionFormDataDto)
  formData?: SubmissionFormDataDto;
}

export class SubmitSubmissionDto {
  @IsOptional()
  @IsString()
  submitComment?: string;
}

export class RequestCorrectionDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklistItems?: ChecklistItemDto[];
}

export class StartCommitteeReviewDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklistItems!: ChecklistItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class RecordSuccessionDecisionDto {
  @IsIn(['ACCEPT', 'REJECT', 'HOLD'])
  decisionType!: 'ACCEPT' | 'REJECT' | 'HOLD';

  @IsString()
  reason!: string;
}

export class GenerateSubmissionFormSnapshotDto {
  @IsIn(['FORM1', 'FORM2', 'FORM3_1', 'FORM3_2', 'FORM4'])
  formCode!: 'FORM1' | 'FORM2' | 'FORM3_1' | 'FORM3_2' | 'FORM4';
}
