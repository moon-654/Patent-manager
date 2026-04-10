import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PatentsService } from './patents.service';

@ApiTags('patents')
@Controller('patents')
export class PatentsController {
  constructor(private readonly patentsService: PatentsService) {}

  @Get()
  list() {
    return this.patentsService.list();
  }

  @Post()
  create(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Body() payload: Record<string, unknown>,
  ) {
    return this.patentsService.create(actorUserId, payload);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.patentsService.get(id);
  }

  @Post(':id/status-transition')
  transition(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
    @Body('toStatus')
    toStatus: 'FILED' | 'OA' | 'REGISTERED' | 'ACTIVE' | 'EXPIRED',
    @Body('reason') reason: string,
  ) {
    return this.patentsService.transitionStatus(
      actorUserId,
      id,
      toStatus,
      reason,
    );
  }

  @Get(':id/oa-events')
  oaEvents(@Param('id') id: string) {
    return this.patentsService.oaList(id);
  }

  @Post(':id/oa-events')
  createOa(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.patentsService.createOa(actorUserId, id, payload);
  }

  @Post(':id/documents')
  documents(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.patentsService.addDocument(actorUserId, id, payload);
  }

  @Post(':id/application-notices')
  async applicationNotices(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
  ) {
    return this.patentsService.sendApplicationNotice(actorUserId, id);
  }

  @Get(':id/application-notices')
  listApplicationNotices(@Param('id') id: string) {
    return this.patentsService.listApplicationNotices(id);
  }
}
