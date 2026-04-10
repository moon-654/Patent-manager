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

import { PoliciesService } from './policies.service';

@ApiTags('policies')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  list() {
    return this.policiesService.list();
  }

  @Post()
  create(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Body() payload: Record<string, unknown>,
  ) {
    return this.policiesService.create(actorUserId, payload);
  }

  @Post(':id/clone')
  clone(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
  ) {
    return this.policiesService.clone(actorUserId, id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.policiesService.get(id);
  }

  @Patch(':id')
  update(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.policiesService.update(actorUserId, id, payload);
  }

  @Post(':id/approve')
  approve(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
  ) {
    return this.policiesService.approve(actorUserId, id);
  }

  @Post(':id/activate')
  activate(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
  ) {
    return this.policiesService.activate(actorUserId, id);
  }

  @Post(':id/simulate')
  simulate(
    @Param('id') id: string,
    @Body()
    payload: { totalScore?: number; rewardType?: string; rightType?: string },
  ) {
    return this.policiesService.simulate(
      id,
      payload.totalScore,
      payload.rewardType,
      payload.rightType,
    );
  }

  @Post(':id/announcements')
  createAnnouncement(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.policiesService.createAnnouncement(actorUserId, id, payload);
  }

  @Get(':id/announcements')
  announcements(@Param('id') id: string) {
    return this.policiesService.listAnnouncements(id);
  }

  @Get(':id/consents')
  consents(@Param('id') id: string) {
    return this.policiesService.listConsents(id);
  }

  @Post(':id/consents/me')
  consentMe(
    @Headers('x-user-id') userId = 'user-inventor',
    @Param('id') id: string,
    @Body('consentStatus') consentStatus: 'AGREED' | 'DISAGREED' | 'PENDING',
  ) {
    return this.policiesService.submitConsent(id, userId, consentStatus);
  }
}
