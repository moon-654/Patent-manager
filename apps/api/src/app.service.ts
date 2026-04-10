import { Injectable } from '@nestjs/common';

import { InMemoryStoreService } from './common/in-memory-store.service';

@Injectable()
export class AppService {
  constructor(private readonly store: InMemoryStoreService) {}

  health() {
    return {
      service: 'patent-manager-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
      counts: {
        users: this.store.snapshot.users.length,
        submissions: this.store.snapshot.submissions.length,
        patents: this.store.snapshot.patents.length,
        rewards: this.store.snapshot.rewards.length,
        policies: this.store.snapshot.policies.length,
      },
    };
  }
}
