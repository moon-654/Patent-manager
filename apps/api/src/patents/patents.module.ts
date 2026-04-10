import { Module } from '@nestjs/common';

import { OaEventsController } from './oa.controller';
import { PatentsController } from './patents.controller';
import { PatentsService } from './patents.service';

@Module({
  controllers: [PatentsController, OaEventsController],
  providers: [PatentsService],
  exports: [PatentsService],
})
export class PatentsModule {}
