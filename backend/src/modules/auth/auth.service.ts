import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { User } from '../user/entities/user.entity';
import { VerifyDto } from './dto/verify.dto';
import { MailService } from '../email/mail.service';
import { TokenService } from './token.service';
import { UserPenalty } from '../user/entities/user-penalty.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UserService,
    private readonly _mailService: MailService,
    private readonly _tokenService: TokenService,
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(User) private readonly _userRepository: Repository<User>,
    @InjectRepository(UserPenalty) private readonly _penaltyRepository: Repository<UserPenalty>,
  ) { }

  // kullanıcı giriş yaparken hesabı aktif mi vs kontrollerin yapıldığı func
  async validateUser(email: string, password: string) {
    const user = await this._userService.findByEmail(email);

    const dummyHash = '$2b$10$abcdefghijklmnopqrstuv';
    const passwordToCheck = user?.password || dummyHash;
    const isPasswordMatching = await bcrypt.compare(password, passwordToCheck);

    if (!user || !isPasswordMatching)
      throw new UnauthorizedException('E-posta veya şifre hatalı.');

    if (user.penalty && user.penalty.is_banned) {
      const now = new Date();

      if (user.penalty.banned_until && user.penalty.banned_until <= now) {
        user.penalty.is_banned = false;
        user.penalty.banned_until = null;

        await this._penaltyRepository.save(user.penalty);
      }
      else {
        const dateStr = user.penalty.banned_until
          ? user.penalty.banned_until.toLocaleString('tr-TR')
          : 'Süresiz';

        throw new ForbiddenException({
          message: 'Hesabınız engellenmiştir.',
          reason: user.penalty.ban_reason || 'Sistem kurallarını ağır şekilde ihlal ettiniz.',
          banned_until: dateStr
        });
      }
    }

    if (user.is_active !== true)
      throw new UnauthorizedException(
        'Lütfen email hesabınızı kontrol edip onaylayınız.',
      );

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async login(user: any, ipAddress: string, userAgent: string) {
    const tokens = await this._tokenService.generateTokens(user, ipAddress, userAgent);

    const accessMaxAge = this._tokenService.getMsFromConfig('JWT_ACCESS_EXPIRATION', '15m');
    const refreshMaxAge = this._tokenService.getMsFromConfig('JWT_REFRESH_EXPIRATION', '7d');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        role: user.role,
        university: user.university,
        gender: user.gender,
        filter_university: user.filter_university,
        filter_gender: user.filter_gender,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      accessMaxAge,
      refreshMaxAge
    };
  }

  async verifyAccount(verifyDto: VerifyDto) {
    const { email, code } = verifyDto;

    const user = await this._userRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    if (user.is_active === true)
      throw new BadRequestException('Bu hesap zaten onaylanmış.');

    const attemptStatus = await this.checkVerifyAttempts(email);
    if (attemptStatus.blocked) {
      const ttl = await this.redis.ttl(`verify_attempts:${email}`);
      throw new BadRequestException(
        `Çok fazla yanlış deneme. ${ttl > 0 ? ttl : 600} saniye sonra tekrar deneyin.`,
      );
    }

    if (new Date() > user.verification_code_expires) {
      const newCode = (
        Math.floor(100000 + Math.random() * 900000)
      ).toString();
      const hashedCode = await bcrypt.hash(newCode, 10);

      user.verification_code = hashedCode;
      user.verification_code_expires = new Date(Date.now() + 10 * 60 * 1000);

      await this._userRepository.save(user);
      await this._mailService.sendVerificationCode(user.email, newCode);

      throw new BadRequestException(
        'Kodun süresi dolmuş. Yeni kod gönderildi.',
      );
    }

    const isValid = await bcrypt.compare(code, user.verification_code);
    if (!isValid) {
      await this.incrementVerifyAttempts(email);
      throw new BadRequestException('Doğrulama kodu hatalı.');
    }

    await this.redis.del(`verify_attempts:${email}`);

    user.is_active = true;
    user.verification_code = '';
    user.verification_code_expires = new Date();

    await this._userRepository.save(user);

    return {
      success: true,
      message: "Hesap doğrulandı."
    };
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token bulunamadı.');

    const tokens = await this._tokenService.refreshTokens(refreshToken);

    const accessMaxAge = this._tokenService.getMsFromConfig('JWT_ACCESS_EXPIRATION', '15m');
    const refreshMaxAge = this._tokenService.getMsFromConfig('JWT_REFRESH_EXPIRATION', '7d');

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      accessMaxAge,
      refreshMaxAge
    };
  }

  async checkVerifyAttempts(email: string) {
    const key = `verify_attempts:${email}`;
    const attempts = await this.redis.get(key);
    const count = attempts ? parseInt(attempts) : 0;

    if (count >= 5) return { blocked: true };

    const wait = { 3: 10, 4: 30 };

    if (wait[count]) {
      const ttl = await this.redis.ttl(key);
      if (ttl > 0) return { blocked: true };
    }

    return { blocked: false };
  }

  async incrementVerifyAttempts(email: string) {
    const key = `verify_attempts:${email}`;
    const attempts = await this.redis.get(key);
    const count = attempts ? parseInt(attempts) : 0;

    let ttl = 600;
    if (count === 2) ttl = 10;
    else if (count === 3) ttl = 30;
    else if (count === 4) ttl = 120;

    await this.redis.set(key, count + 1, 'EX', ttl);
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      try {
        await this._tokenService.revokeToken(refreshToken);
      } catch (e) {
        console.log(`Token revoke hatası: ${e.message}`);
      }
    }

    return { success: true, message: 'Oturum veritabanından temizlendi.' };
  }
}
