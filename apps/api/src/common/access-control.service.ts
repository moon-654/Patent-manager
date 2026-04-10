import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AppUser, RoleCode } from '../domain/models';
import { InMemoryStoreService } from './in-memory-store.service';

@Injectable()
export class AccessControlService {
  constructor(private readonly store: InMemoryStoreService) {}

  getUser(userId: string): AppUser {
    const user = this.store.snapshot.users.find((item) => item.id === userId);
    if (!user) {
      throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');
    }

    return user;
  }

  assertAnyRole(userId: string, roles: RoleCode[]) {
    const user = this.getUser(userId);
    const hasRole = user.roles.some((role) => roles.includes(role.code));
    if (!hasRole) {
      throw new ForbiddenException('이 작업을 수행할 권한이 없습니다.');
    }

    return user;
  }

  hasRole(userId: string, roles: RoleCode[]) {
    const user = this.getUser(userId);
    return user.roles.some((role) => roles.includes(role.code));
  }
}
