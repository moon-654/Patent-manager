import { Injectable, UnauthorizedException } from '@nestjs/common';

import { InMemoryStoreService } from '../common/in-memory-store.service';

@Injectable()
export class AuthService {
  constructor(private readonly store: InMemoryStoreService) {}

  login(email: string) {
    const user = this.store.snapshot.users.find((item) => item.email === email);

    if (!user) {
      throw new UnauthorizedException('등록된 사용자를 찾을 수 없습니다.');
    }

    return {
      accessToken: `demo-token-${user.id}`,
      user,
    };
  }

  me(userId: string) {
    const user = this.store.snapshot.users.find((item) => item.id === userId);

    if (!user) {
      throw new UnauthorizedException('사용자 컨텍스트가 없습니다.');
    }

    return user;
  }
}
