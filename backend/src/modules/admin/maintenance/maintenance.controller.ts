import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { MaintenanceService } from "./maintenance.service";
import { JwtAccessGuard } from "../../auth/guards/jwt-access.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { UpdateMaintenanceDto } from "./dto/update-maintenance.dto";

@Controller('admin/maintenance')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

    @Get()
    async getStatus() {
        return this.maintenanceService.getMaintenanceStatus();
    }

    @Post()
    async toogleMode(@Body() dto: UpdateMaintenanceDto) {
        return this.maintenanceService.toggleMaintenanceMode(dto.is_active);
    }
}