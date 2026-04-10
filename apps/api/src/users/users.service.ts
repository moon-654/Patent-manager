import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/audit.service';
import { InMemoryStoreService } from '../common/in-memory-store.service';
import type { RoleCode, ScopeType } from '../domain/models';

@Injectable()
export class UsersService {
  constructor(
    private readonly store: InMemoryStoreService,
    private readonly audit: AuditService,
  ) {}

  list(keyword?: string) {
    const users = this.store.snapshot.users;

    if (!keyword) {
      return users;
    }

    return users.filter(
      (user) =>
        user.name.includes(keyword) ||
        user.email.includes(keyword) ||
        user.department.includes(keyword),
    );
  }

  updateRoles(
    actorUserId: string,
    userId: string,
    roles: { code: RoleCode; scopeType: ScopeType }[],
  ) {
    const user = this.store.snapshot.users.find((item) => item.id === userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const before = [...user.roles];
    user.roles = roles;

    this.audit.record({
      actorUserId,
      actionType: 'USER_ROLES_UPDATED',
      targetType: 'USER',
      targetId: userId,
      before,
      after: roles,
      reason: '역할 범위 조정',
    });

    return user;
  }
}
