import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request): string | null => {
                    let token: string | null = null;
                    token = request.cookies['access_token'];

                    if (!token && request.headers.authorization)
                        token = request.headers.authorization.replace('Bearer ', '');

                    return token;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
        });
    }

    async validate(payload: JwtPayload) {
        if (payload.type !== 'access')
            throw new UnauthorizedException('Geçersiz token tipi');

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}   