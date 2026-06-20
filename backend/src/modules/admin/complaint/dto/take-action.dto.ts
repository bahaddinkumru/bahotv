import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ComplaintAction } from '../enums/complaint.enum';

export class TakeActionDto {
    @IsEnum(ComplaintAction, { message: 'Geçersiz bir infaz emri girdiniz!' })
    action: ComplaintAction;

    @IsNotEmpty()
    @IsInt()
    reportId: number;

    @IsOptional()
    @IsString({ message: 'Admin notu metin formatında olmalıdır.' })
    adminNote?: string;
}