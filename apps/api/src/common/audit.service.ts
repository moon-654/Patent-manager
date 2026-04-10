import { Injectable } from '@nestjs/common';

import { createId, now } from '../domain/utils';
import type { AuditLog } from '../domain/models';
import { InMemoryStoreService } from './in-memory-store.service';

@Injectable()
export class AuditService {
  constructor(private readonly store: InMemoryStoreService) {}

  record(entry: Omit<AuditLog, 'id' | 'createdAt'>) {
    this.store.snapshot.auditLogs.unshift({
      id: createId(),
      createdAt: now(),
      ...entry,
    });
  }

  list() {
    return this.store.snapshot.auditLogs;
  }
}
