import { Module } from '@nestjs/common';

import { PoliciesController } from './policies.controller';
import { PoliciesPutController } from './policies-put.controller';
import { PoliciesService } from './policies.service';

@Module({
  controllers: [PoliciesController, PoliciesPutController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
