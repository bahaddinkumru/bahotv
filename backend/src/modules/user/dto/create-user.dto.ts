import { IsNotEmpty, IsString, IsEmail, IsEnum, MinLength, Matches } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    surname: string;

    @IsString()
    @IsEnum(['male', 'female'])
    gender: string;

    @IsEmail()
    @Matches(/@(sakarya\.edu\.tr|subu\.edu\.tr)$/, { message: 'Sadece üniversite e-postası kullanabilirsiniz' })
    @IsNotEmpty()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsEnum(['sau', 'subu'])
    university: string;
}