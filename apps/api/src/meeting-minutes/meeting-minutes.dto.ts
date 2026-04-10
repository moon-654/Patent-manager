import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class MeetingMinuteSectionDto {
  @IsString()
  value!: string;
}

export class CreateMeetingMinuteDto {
  @IsString()
  title!: string;

  @IsString()
  meetingDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingMinuteSectionDto)
  attendees!: MeetingMinuteSectionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingMinuteSectionDto)
  agenda!: MeetingMinuteSectionDto[];

  @IsString()
  resolution!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkedSubmissionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkedEvaluationIds?: string[];
}

export class ApproveMeetingMinuteDto {
  @IsOptional()
  @IsString()
  note?: string;
}
