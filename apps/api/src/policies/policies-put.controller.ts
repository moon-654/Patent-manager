import { Body, Controller, Headers, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PoliciesService } from './policies.service';

@ApiTags('policies')
@Controller('policies')
export class PoliciesPutController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Put(':id/reward-matrix')
  rewardMatrix(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
    @Body('rewardMatrix') rewardMatrix: never[],
  ) {
    return this.policiesService.updateRewardMatrix(
      actorUserId,
      id,
      rewardMatrix,
    );
  }

  @Put(':id/evaluation-criteria')
  evaluationCriteria(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
    @Body('criteria') criteria: never[],
    @Body('grades') grades?: never[],
  ) {
    return this.policiesService.updateEvaluationCriteria(
      actorUserId,
      id,
      criteria,
      grades,
    );
  }

  @Put(':id/formula-rules')
  formulaRules(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
    @Body('formulaRules') formulaRules: never[],
  ) {
    return this.policiesService.updateFormulaRules(
      actorUserId,
      id,
      formulaRules,
    );
  }
}
