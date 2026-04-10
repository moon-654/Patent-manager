import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuditService } from '../common/audit.service';
import { InMemoryStoreService } from '../common/in-memory-store.service';
import { NotificationsService } from '../common/notifications.service';

@ApiTags('system')
@Controller()
export class SystemController {
  constructor(
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly store: InMemoryStoreService,
  ) {}

  @Get('search')
  search(@Query('keyword') keyword = '') {
    return {
      submissions: this.store.snapshot.submissions.filter((item) =>
        item.title.includes(keyword),
      ),
      patents: this.store.snapshot.patents.filter((item) =>
        item.title.includes(keyword),
      ),
      rewards: this.store.snapshot.rewards.filter((item) =>
        item.rewardNo.includes(keyword),
      ),
    };
  }

  @Get('reports/operations')
  operationsReport() {
    return {
      pendingSubmissions: this.store.snapshot.submissions.filter(
        (item) => item.status !== 'ACCEPTED',
      ).length,
      oaUpcoming: this.store.snapshot.patents
        .flatMap((item) => item.oaEvents)
        .filter((event) => event.status !== 'SUBMITTED').length,
      calculatedRewards: this.store.snapshot.rewards.filter(
        (item) => item.status === 'CALCULATED',
      ).length,
      activePolicy: this.store.snapshot.policies.find(
        (item) => item.status === 'ACTIVE',
      )?.versionCode,
    };
  }

  @Get('reports/export')
  exportReport() {
    return {
      status: 'queued',
      requestedAt: now(),
    };
  }

  @Get('audit-logs')
  auditLogs() {
    return this.audit.list();
  }

  @Get('notifications')
  notificationsList() {
    return this.notifications.list();
  }
}

function now() {
  return new Date().toISOString();
}
