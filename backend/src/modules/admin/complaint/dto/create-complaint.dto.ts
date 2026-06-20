import { IsNotEmpty, IsOptional, IsEnum, IsNumberString } from 'class-validator';
import { ComplaintReason } from '../enums/complaint.enum';

export class CreateComplaintDto {
    @IsNotEmpty({ message: 'Şikayet edilen kullanıcı ID eksik!' })
    @IsNumberString({}, { message: 'Şikayet edilen ID geçerli bir sayı olmalıdır!' })
    reportedId: string;

    @IsEnum(ComplaintReason, { message: 'Geçersiz bir şikayet sebebi seçtiniz!' })
    reason: ComplaintReason;

    @IsOptional()
    proofImageUrl?: string;
}