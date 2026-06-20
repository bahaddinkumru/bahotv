import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
    @IsOptional()
    @IsBoolean()
    filter_university?: boolean;

    @IsOptional()
    @IsBoolean()
    filter_gender?: boolean;
}