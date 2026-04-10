import { Body, Controller, Post, Param, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PatentsService } from './patents.service';

@ApiTags('oa-events')
@Controller('oa-events')
export class OaEventsController {
  constructor(private readonly patentsService: PatentsService) {}

  @Post(':id/submit-response')
  submitResponse(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
    @Body()
    payload: { patentId: string; responseNote?: string; documentName?: string },
  ) {
    return this.patentsService.submitOaResponse(actorUserId, id, payload);
  }
}
