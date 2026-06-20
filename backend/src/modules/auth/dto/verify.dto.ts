// src/auth/dto/verify.dto.ts
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    code: string;
}