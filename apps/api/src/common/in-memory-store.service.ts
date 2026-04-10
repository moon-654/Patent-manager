import { Injectable } from '@nestjs/common';

import type { AppState } from '../domain/models';
import { seedData } from '../domain/seed-data';

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

@Injectable()
export class InMemoryStoreService {
  private state: AppState = cloneState(seedData);

  get snapshot() {
    return this.state;
  }

  reset() {
    this.state = cloneState(seedData);
  }
}
