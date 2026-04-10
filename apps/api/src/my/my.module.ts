import { Module } from '@nestjs/common';

import { PoliciesModule } from '../policies/policies.module';
import { RewardsModule } from '../rewards/rewards.module';
import { MyController } from './my.controller';

@Module({
  imports: [RewardsModule, PoliciesModule],
  controllers: [MyController],
})
export class MyModule {}
