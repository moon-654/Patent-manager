import { Injectable } from '@nestjs/common';

import type { NotificationItem } from '../domain/models';
import { createId, now } from '../domain/utils';
import { InMemoryStoreService } from './in-memory-store.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly store: InMemoryStoreService) {}

  send(input: Omit<NotificationItem, 'id' | 'status' | 'sentAt'>) {
    const notification: NotificationItem = {
      id: createId(),
      status: 'SENT',
      sentAt: now(),
      ...input,
    };

    this.store.snapshot.notifications.unshift(notification);
    return notification;
  }

  list(userId?: string) {
    return userId
      ? this.store.snapshot.notifications.filter(
          (item) => item.userId === userId,
        )
      : this.store.snapshot.notifications;
  }
}
