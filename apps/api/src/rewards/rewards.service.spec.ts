import { Test, TestingModule } from '@nestjs/testing';

import { CommonModule } from '../common/common.module';
import { PoliciesModule } from '../policies/policies.module';
import { RewardsService } from './rewards.service';

describe('RewardsService', () => {
  let service: RewardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule, PoliciesModule],
      providers: [RewardsService],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
  });

  it('generates application reward distributions from inventor shares', () => {
    const reward = service.generate('user-manager', {
      targetId: 'pat-1',
      targetType: 'PATENT',
      rewardType: 'APPLICATION',
    });

    expect(reward.distributions).toHaveLength(2);
    expect(
      reward.distributions[0].shareRatio + reward.distributions[1].shareRatio,
    ).toBe(100);
    expect(reward.currentStatus).toBe('CALCULATED');
  });
});
