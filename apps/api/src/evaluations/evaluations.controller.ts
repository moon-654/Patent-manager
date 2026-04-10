import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CreateEvaluationDto,
  FinalizeEvaluationDto,
  UpdateEvaluationItemsDto,
} from './evaluations.dto';
import { EvaluationsService } from './evaluations.service';

@ApiTags('evaluations')
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get()
  list() {
    return this.evaluationsService.list();
  }

  @Get('targets')
  targets() {
    return this.evaluationsService.targets();
  }

  @Post()
  create(
    @Headers('x-user-id') actorUserId = 'user-committee',
    @Body() payload: CreateEvaluationDto,
  ) {
    return this.evaluationsService.create(actorUserId, payload);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.evaluationsService.get(id);
  }

  @Patch(':id')
  update(
    @Headers('x-user-id') actorUserId = 'user-committee',
    @Param('id') id: string,
    @Body() payload: UpdateEvaluationItemsDto,
  ) {
    return this.evaluationsService.update(actorUserId, id, payload);
  }

  @Post(':id/finalize')
  finalize(
    @Headers('x-user-id') actorUserId = 'user-committee',
    @Param('id') id: string,
    @Body() payload: FinalizeEvaluationDto,
  ) {
    return this.evaluationsService.finalize(actorUserId, id, payload);
  }
}
