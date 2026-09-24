import { Injectable } from '@nestjs/common';
import { verify } from 'argon2';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../http/api-exceptions';
import { HttpStatus } from '@nestjs/common';
import type { AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async authenticate(account: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.db.iamUser.findFirst({
      where: { normalizedAccount: account.trim().toLowerCase() },
      orderBy: { createdAt: 'asc' },
    });
    if (!user || !user.passwordHash || user.status === 'DISABLED') throw new ApiException('UNAUTHENTICATED', HttpStatus.UNAUTHORIZED, '账号或密码错误');
    if (user.status === 'LOCKED') throw new ApiException('ACCOUNT_LOCKED', 423, '账号不可用');
    if (!(await verify(user.passwordHash, password))) throw new ApiException('UNAUTHENTICATED', HttpStatus.UNAUTHORIZED, '账号或密码错误');
    return { id: user.id, account: user.account, displayName: user.displayName };
  }

  async loadActiveUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.db.iamUser.findFirst({ where: { id: userId, status: 'ACTIVE' } });
    if (!user) throw new ApiException('UNAUTHENTICATED', HttpStatus.UNAUTHORIZED, '登录已失效');
    return { id: user.id, account: user.account, displayName: user.displayName };
  }
}
