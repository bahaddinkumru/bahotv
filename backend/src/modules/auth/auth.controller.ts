import {
  Controller,
  Post,
  Body,
  Ip,
  Headers,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { SkipBanCheck } from './decarators/skip-ban-check.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-client-type') clientType: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    const result = await this.authService.login(
      user,
      ip,
      userAgent || 'Unknown Device',
    );

    if (clientType === 'web') {
      const isProd = this.configService.get<string>('NODE_ENV') === 'production';

      const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax' as const,
        path: '/',
      };

      res.cookie('access_token', result.access_token, {
        ...cookieOptions,
        maxAge: result.accessMaxAge,
      });

      res.cookie('refresh_token', result.refresh_token, {
        ...cookieOptions,
        maxAge: result.refreshMaxAge,
      });

      return {
        user: result.user,
        message: 'Web girişi başarılı, tokenlar kilitlendi.',
      };
    }

    return result;
  }

  @SkipBanCheck()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body('refresh_token') bodyRefreshToken: string,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-client-type') clientType: string,
  ) {
    const token = req.cookies?.refresh_token || bodyRefreshToken;
    const result = await this.authService.refreshTokens(token);

    if (clientType === 'web') {
      const isProd = this.configService.get<string>('NODE_ENV') === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax' as const,
        path: '/',
      };

      res.cookie('access_token', result.access_token, {
        ...cookieOptions,
        maxAge: (result as any).accessMaxAge,
      });

      res.cookie('refresh_token', result.refresh_token, {
        ...cookieOptions,
        maxAge: (result as any).refreshMaxAge,
      });

      return { success: true };
    }

    return result;
  }

  @Post('verify')
  async verify(@Body() dto: VerifyDto) {
    return this.authService.verifyAccount(dto);
  }

  @SkipBanCheck()
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-client-type') clientType: string,
  ) {
    const refreshToken = req.cookies?.refresh_token || (req.body as any)?.refresh_token;

    await this.authService.logout(refreshToken);

    if (clientType === 'web') {
      const clearOptions = {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };

      res.clearCookie('access_token', clearOptions);
      res.clearCookie('refresh_token', clearOptions);
    }

    return { message: 'Başarıyla çıkış yapıldı.' };
  }
}