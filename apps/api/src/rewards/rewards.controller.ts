import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RewardsService } from './rewards.service';

@ApiTags('rewards')
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  list() {
    return this.rewardsService.list();
  }

  @Post('generate')
  generate(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Body()
    payload: {
      targetId: string;
      targetType: 'SUBMISSION' | 'PATENT';
      rewardType:
        | 'APPLICATION'
        | 'REGISTRATION'
        | 'PRACTICE'
        | 'DISPOSAL'
        | 'HOLD';
      profit?: number;
    },
  ) {
    return this.rewardsService.generate(actorUserId, payload);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.rewardsService.get(id);
  }

  @Post(':id/calculate')
  calculate(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
  ) {
    return this.rewardsService.calculate(actorUserId, id);
  }

  @Post(':id/approve-request')
  approveRequest(@Param('id') id: string) {
    return this.rewardsService.approveRequest(id);
  }

  @Post(':id/approve')
  approve(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
  ) {
    return this.rewardsService.approve(actorUserId, id);
  }

  @Post(':id/notify')
  notify(
    @Headers('x-user-id') actorUserId = 'user-manager',
    @Param('id') id: string,
  ) {
    return this.rewardsService.notify(actorUserId, id);
  }

  @Post(':id/payments')
  payments(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
    @Body() payload: { paymentMethod?: string; accountingRefNo?: string },
  ) {
    return this.rewardsService.addPayment(actorUserId, id, payload);
  }
}
