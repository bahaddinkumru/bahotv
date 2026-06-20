import { IsBoolean, IsNotEmpty } from "class-validator";

export class UpdateMaintenanceDto {
    @IsNotEmpty({ message: 'Durum bilgisi boş olamaz' })
    @IsBoolean({ message: 'Durum bilgisi true veya false olmalıdır' })
    is_active: boolean;
}