import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query('keyword') keyword?: string) {
    return this.usersService.list(keyword);
  }

  @Patch(':id/roles')
  updateRoles(
    @Headers('x-user-id') actorUserId = 'user-admin',
    @Param('id') id: string,
    @Body('roles')
    roles: {
      code: 'INVENTOR' | 'IP_MANAGER' | 'COMMITTEE' | 'ADMIN';
      scopeType: 'SELF' | 'DEPT' | 'ALL';
    }[],
  ) {
    return this.usersService.updateRoles(actorUserId, id, roles);
  }
}
