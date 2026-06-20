import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request): string | null => {
                    let token: string | null = null;
                    if (request && request.cookies)
                        token = request.cookies['refresh_token'];

                    if (!token && request.body)
                        token = request.body.refreshToken;

                    return token;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: JwtPayload) {
        if (payload.type !== 'refresh')
            throw new UnauthorizedException('Geçersiz token tipi');

        const refreshToken: string = req.cookies?.refresh_token || req.body?.refreshToken;

        if (!refreshToken)
            throw new UnauthorizedException('Refresh token bulunamadı');

        return {
            userId: payload.sub,
            email: payload.email,
            refreshToken,
        };
    }
}