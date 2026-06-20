import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPenalty } from '../../user/entities/user-penalty.entity';
import { IS_BAN_CHECK_SKIPPED } from '../decarators/skip-ban-check.decorator';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BanGuard implements CanActivate {
    constructor(
        @InjectRepository(UserPenalty)
        private penaltyRepo: Repository<UserPenalty>,
        private reflector: Reflector,
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isSkipped = this.reflector.getAllAndOverride<boolean>(IS_BAN_CHECK_SKIPPED, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isSkipped)
            return true;

        const request = context.switchToHttp().getRequest();

        let jwtUser = request.user;

        // Global Guard'lar AuthGuard'dan önce çalıştığı için request.user henüz dolmamış olabilir.
        if (!jwtUser) {
            const token = request.cookies?.access_token || request.headers.authorization?.replace('Bearer ', '');
            if (token) {
                try {
                    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
                    jwtUser = await this.jwtService.verifyAsync(token, { secret });
                } catch (e) {
                    return true;
                }
            }
        }

        if (!jwtUser) return true;

        const userId = jwtUser.id || jwtUser.sub;

        const penalty = await this.penaltyRepo.findOne({ where: { userId } });

        if (penalty && penalty.is_banned) {
            const now = new Date();

            if (penalty.banned_until && penalty.banned_until <= now) {
                penalty.is_banned = false;
                penalty.banned_until = null;

                await this.penaltyRepo.save(penalty);
                return true;
            }

            const dateStr = penalty.banned_until
                ? penalty.banned_until.toLocaleString('tr-TR')
                : 'Süresiz';

            throw new ForbiddenException({
                message: 'Hesabınız engellenmiştir.',
                reason: penalty.ban_reason,
                banned_until: dateStr
            });
        }

        return true;
    }
}