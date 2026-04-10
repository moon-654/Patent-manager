import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { NotificationsService } from '../common/notifications.service';
import { PoliciesService } from '../policies/policies.service';
import { RewardsService } from '../rewards/rewards.service';

@ApiTags('my')
@Controller('my')
export class MyController {
  constructor(
    private readonly rewardsService: RewardsService,
    private readonly policiesService: PoliciesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('rewards')
  rewards(@Headers('x-user-id') userId = 'user-inventor') {
    return this.rewardsService.listMyRewards(userId);
  }

  @Get('policy-consents')
  consents(@Headers('x-user-id') userId = 'user-inventor') {
    return this.policiesService.listMyConsents(userId);
  }

  @Get('notifications')
  notifications(@Headers('x-user-id') userId = 'user-inventor') {
    return this.notificationsService.list(userId);
  }
}
