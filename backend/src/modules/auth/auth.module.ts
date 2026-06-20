import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { TokenService } from './token.service';
import { UserPenalty } from '../user/entities/user-penalty.entity';
import { APP_GUARD } from '@nestjs/core';
import { BanGuard } from './guards/ban.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, UserPenalty]),
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtAccessStrategy, JwtRefreshStrategy, {
    provide: APP_GUARD,
    useClass: BanGuard,
  },],
  exports: [JwtModule]
})
export class AuthModule { }