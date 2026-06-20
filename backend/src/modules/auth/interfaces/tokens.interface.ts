export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export interface TokensWithExpiry extends Tokens {
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
}