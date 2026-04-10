import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  CreateSubmissionDraftDto,
  GenerateSubmissionFormSnapshotDto,
  RecordSuccessionDecisionDto,
  RequestCorrectionDto,
  StartCommitteeReviewDto,
  SubmitSubmissionDto,
  UpdateSubmissionDraftDto,
} from './submissions.dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  list(@Headers('x-user-id') actorUserId = 'user-inventor') {
    return this.submissionsService.list(actorUserId);
  }

  @Post()
  create(
    @Headers('x-user-id') actorUserId = 'user-inventor',
    @Body() payload: CreateSubmissionDraftDto,
  ) {
    return this.submissionsService.create(actorUserId, payload);
  }

  @Get(':id')
  get(
    @Headers('x-user-id') actorUserId = 'user-inventor',
    @Param('id') id: string,
  ) {
    return this.submissionsService.get(actorUserId, id);
  }

  @Patch(':id')
  update(
    @Headers('x-user-id') actorUserId = 'user-inventor',
    @Param('id') id: string,
    @Body() payload: UpdateSubmissionDraftDto,
  ) {
    return this.submissionsService.update(actorUserId, id, payload);
  }

  @Post(':id/submit')
  submit(
    @Headers('x-user-id') actorUserId = 'user-inventor',
    @Param('id') id: string,
    @Body() payload: SubmitSubmissionDto,
  ) {
    return this.submissionsService.submit(actorUserId, id, payload);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  attachment(
    @Headers('x-user-id') actorUserId = 'user-inventor',
    @Param('id') id: string,
    @UploadedFile()
    file?: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    @Body()
    payload: {
      originalName?: string;
      type?: string;
      attachmentType?: string;
      mimeType?: string;
      filePath?: string;
    } = {},
  ) {
    return this.submissionsService.addAttachment(actorUserId, id, {
      attachmentType: payload.attachmentType ?? payload.type ?? '',
      originalName: file?.originalname ?? payload.originalName ?? '',
      mimeType: file?.mimetype ?? payload.mimeType,
      filePath: payload.filePath,
      buffer: file?.buffer,
      size: file?.size,
    });
  }

  @Post(':id/request-correction')
  requestCorrection(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
    @Body() payload: RequestCorrectionDto,
  ) {
    return this.submissionsService.requestCorrection(actorUserId, id, payload);
  }

  @Post(':id/start-committee-review')
  startCommitteeReview(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
    @Body() payload: StartCommitteeReviewDto,
  ) {
    return this.submissionsService.startCommitteeReview(
      actorUserId,
      id,
      payload,
    );
  }

  @Post(':id/succession-decision')
  successionDecision(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
    @Body() payload: RecordSuccessionDecisionDto,
  ) {
    return this.submissionsService.decideSuccession(actorUserId, id, payload);
  }

  @Get(':id/form-snapshots')
  formSnapshots(@Param('id') id: string) {
    return this.submissionsService.listFormSnapshots(id);
  }

  @Post(':id/form-snapshots')
  generateFormSnapshot(
    @Headers('x-user-id') actorUserId = 'user-inventor',
    @Param('id') id: string,
    @Body() payload: GenerateSubmissionFormSnapshotDto,
  ) {
    return this.submissionsService.generateFormSnapshot(
      actorUserId,
      id,
      payload,
    );
  }

  @Get(':id/committee-notices')
  committeeNotices(@Param('id') id: string) {
    return this.submissionsService.listCommitteeNotices(id);
  }
}
