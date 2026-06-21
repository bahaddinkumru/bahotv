import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString, validateSync, IsOptional } from 'class-validator';

export enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

class EnvironmentVariables {
    @IsEnum(Environment)
    @IsOptional()
    NODE_ENV: Environment = Environment.Development;

    @IsString()
    @IsNotEmpty({ message: 'DB_HOST must not be empty' })
    DB_HOST: string;

    @IsNumber()
    @IsNotEmpty({ message: 'DB_PORT must not be empty' })
    DB_PORT: number;

    @IsString()
    @IsNotEmpty({ message: 'DB_USER must not be empty' })
    DB_USER: string;

    @IsString()
    @IsNotEmpty({ message: 'DB_PASSWORD must not be empty' })
    DB_PASSWORD: string;

    @IsString()
    @IsNotEmpty({ message: 'DB_NAME must not be empty' })
    DB_NAME: string;

    @IsString()
    @IsNotEmpty({ message: 'JWT_ACCESS_SECRET must not be empty' })
    JWT_ACCESS_SECRET: string;

    @IsString()
    @IsNotEmpty({ message: 'JWT_REFRESH_SECRET must not be empty' })
    JWT_REFRESH_SECRET: string;

    @IsString()
    @IsNotEmpty({ message: 'JWT_ACCESS_EXPIRATION must not be empty' })
    JWT_ACCESS_EXPIRATION: string;

    @IsString()
    @IsNotEmpty({ message: 'JWT_REFRESH_EXPIRATION must not be empty' })
    JWT_REFRESH_EXPIRATION: string;

    @IsString()
    @IsNotEmpty({ message: 'REDIS_HOST must not be empty' })
    REDIS_HOST: string;

    @IsNumber()
    @IsNotEmpty({ message: 'REDIS_PORT must not be empty' })
    REDIS_PORT: number;

    @IsString()
    @IsNotEmpty({ message: 'REDIS_PASSWORD must not be empty' })
    REDIS_PASSWORD: string;

    @IsString()
    @IsNotEmpty({ message: 'GEMINI_API_KEY must not be empty' })
    GEMINI_API_KEY: string;

    @IsString()
    @IsNotEmpty({ message: 'MAIL_USER must not be empty' })
    MAIL_USER: string;

    @IsString()
    @IsNotEmpty({ message: 'MAIL_PASS must not be empty' })
    MAIL_PASS: string;

    @IsString()
    @IsNotEmpty({ message: 'ADMIN_INITIAL_PASSWORD must not be empty' })
    ADMIN_INITIAL_PASSWORD: string;
}

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToInstance(
        EnvironmentVariables,
        config,
        { enableImplicitConversion: true },
    );

    const errors = validateSync(validatedConfig, { skipMissingProperties: false });

    if (errors.length > 0) {
        const errorMessages = errors.map((error) => Object.values(error.constraints || {})).flat();
        throw new Error(`\n⚠️  Environment Variable Validation Error:\n${errorMessages.join('\n')}\n`);
    }

    return validatedConfig;
}
