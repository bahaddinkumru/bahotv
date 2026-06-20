import {
    Injectable,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../user/entities/user.entity';
import { Tokens } from './interfaces/tokens.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TokenService {
    private readonly logger = new Logger(TokenService.name);

    constructor(
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async generateTokens(user: User, ipAddress: string, userAgent: string): Promise<Tokens> {
        const accessToken = this.signAccessToken(user);

        const expiresIn = this.configService.get('JWT_REFRESH_EXPIRATION', '7d');
        const expiresAt = this.calculateExpiryDate(expiresIn);

        const newRefreshTokenEntity = this.refreshTokenRepository.create({
            userId: user.id,
            tokenHash: 'pending',
            ipAddress,
            userAgent,
            expiresAt,
            lastUsedAt: new Date(),
        });

        const savedToken = await this.refreshTokenRepository.save(newRefreshTokenEntity);

        const refreshToken = this.jwtService.sign(
            {
                sub: user.id,
                email: user.email,
                type: 'refresh',
                tokenId: savedToken.id
            },
            {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn,
            },
        );

        const tokenHash = await bcrypt.hash(refreshToken, 10);

        await this.refreshTokenRepository.update(savedToken.id, {
            tokenHash: tokenHash
        });

        return { accessToken, refreshToken };
    }

    async refreshTokens(refreshToken: string): Promise<Tokens> {
        try {
            const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            if (payload.type !== 'refresh')
                throw new UnauthorizedException('Invalid token type');

            const tokenRecord = await this.refreshTokenRepository.findOne({
                where: { id: Number(payload.tokenId) },
                relations: ['user'],
            });

            if (!tokenRecord) throw new UnauthorizedException('Token not found');
            if (tokenRecord.isRevoked) throw new UnauthorizedException('Token revoked');

            if (new Date() > tokenRecord.expiresAt)
                throw new UnauthorizedException('Refresh token expired');

            const isValid = await bcrypt.compare(
                refreshToken,
                tokenRecord.tokenHash,
            );

            if (!isValid) throw new UnauthorizedException('Invalid token');

            if (!tokenRecord.user.is_active)
                throw new UnauthorizedException('User inactive');

            tokenRecord.lastUsedAt = new Date();
            await this.refreshTokenRepository.save(tokenRecord);

            const oneDay = 24 * 60 * 60 * 1000;
            const remaining = tokenRecord.expiresAt.getTime() - new Date().getTime();

            if (remaining <= oneDay) {
                tokenRecord.isRevoked = true;
                tokenRecord.revokedAt = new Date();

                const newTokens = await this.generateTokens(
                    tokenRecord.user,
                    tokenRecord.ipAddress,
                    tokenRecord.userAgent
                );

                const newPayload = this.jwtService.decode(newTokens.refreshToken) as JwtPayload;

                tokenRecord.replacedByTokenId = newPayload.tokenId!;
                await this.refreshTokenRepository.save(tokenRecord);

                return newTokens;
            }

            const accessToken = this.signAccessToken(tokenRecord.user);

            return { accessToken, refreshToken };
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    private signAccessToken(user: User): string {
        return this.jwtService.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                university: user.university,
                gender: user.gender,
                filter_university: user.filter_university,
                filter_gender: user.filter_gender,
                type: 'access'
            },
            {
                secret: this.configService.get('JWT_ACCESS_SECRET'),
                expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
            },
        );
    }

    async revokeToken(refreshToken: string) {
        const payload = this.jwtService.decode(refreshToken) as JwtPayload;
        if (!payload?.tokenId) return;

        await this.refreshTokenRepository.update(
            { id: Number(payload.tokenId) },
            { isRevoked: true, revokedAt: new Date() },
        );
    }

    async revokeAllUserTokens(userId: number) {
        await this.refreshTokenRepository.update(
            { userId: Number(userId), isRevoked: false },
            { isRevoked: true, revokedAt: new Date() },
        );
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupExpiredTokens() {
        this.logger.log('Cleaning up expired tokens...');
        const result = await this.refreshTokenRepository.delete({
            expiresAt: LessThan(new Date()),
        });
        this.logger.log(`Deleted ${result.affected} expired tokens.`);
    }

    private calculateExpiryDate(expiresIn: string): Date {
        const { value, unit } = this.parseDuration(expiresIn);
        const now = new Date();

        switch (unit) {
            case 'd': return new Date(now.getTime() + value * 86400000);
            case 'h': return new Date(now.getTime() + value * 3600000);
            case 'm': return new Date(now.getTime() + value * 60000);
            case 's': return new Date(now.getTime() + value * 1000);
            default: throw new Error('Invalid unit');
        }
    }

    public getMsFromConfig(configKey: string, defaultValue: string): number {
        const expiresIn = this.configService.get<string>(configKey, defaultValue);
        const { value, unit } = this.parseDuration(String(expiresIn));

        const multipliers = {
            'd': 86400000,
            'h': 3600000,
            'm': 60000,
            's': 1000
        };

        return value * (multipliers[unit] || 0);
    }

    private parseDuration(duration: string): { value: number, unit: string } {
        const matches = duration.match(/^(\d+)([dhms])$/);
        if (!matches) {
            this.logger.error(`Invalid duration format: ${duration}`);
            throw new Error('Invalid duration format');
        }
        return {
            value: parseInt(matches[1], 10),
            unit: matches[2]
        };
    }
}
