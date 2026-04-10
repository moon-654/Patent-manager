import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  ApproveMeetingMinuteDto,
  CreateMeetingMinuteDto,
} from './meeting-minutes.dto';
import { MeetingMinutesService } from './meeting-minutes.service';

@ApiTags('meeting-minutes')
@Controller('meeting-minutes')
export class MeetingMinutesController {
  constructor(private readonly meetingMinutesService: MeetingMinutesService) {}

  @Get()
  list() {
    return this.meetingMinutesService.list();
  }

  @Post()
  create(
    @Headers('x-user-id') actorUserId = 'user-committee',
    @Body() payload: CreateMeetingMinuteDto,
  ) {
    return this.meetingMinutesService.create(actorUserId, payload);
  }

  @Post(':id/approve')
  approve(
    @Headers('x-user-id') actorUserId = 'user-committee',
    @Param('id') id: string,
    @Body() payload: ApproveMeetingMinuteDto,
  ) {
    return this.meetingMinutesService.approve(actorUserId, id, payload);
  }
}
