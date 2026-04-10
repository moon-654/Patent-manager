import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  login(@Body('email') email: string) {
    return this.authService.login(email);
  }

  @Get('me')
  me(@Headers('x-user-id') userId = 'user-admin') {
    return this.authService.me(userId);
  }
}
