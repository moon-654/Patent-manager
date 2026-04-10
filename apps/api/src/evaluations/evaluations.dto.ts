import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class EvaluationItemDto {
  @IsString()
  criterionCode!: string;

  @IsString()
  selectedLevelCode!: string;

  @IsNumber()
  selectedScore!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateEvaluationDto {
  @IsIn(['SUBMISSION', 'PATENT'])
  targetType!: 'SUBMISSION' | 'PATENT';

  @IsString()
  targetId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  evaluationRound?: number;

  @IsOptional()
  @IsString()
  duplicateOf?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationItemDto)
  items!: EvaluationItemDto[];
}

export class UpdateEvaluationItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationItemDto)
  items!: EvaluationItemDto[];
}

export class FinalizeEvaluationDto {
  @IsOptional()
  @IsString()
  note?: string;
}
