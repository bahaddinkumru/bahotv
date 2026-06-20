import { Module } from "@nestjs/common";
import { MaintenanceService } from "./maintenance.service";
import { MaintenanceController } from "./maintenance.controller";

@Module({
    imports: [],
    controllers: [MaintenanceController],
    providers: [MaintenanceService],
    exports: [MaintenanceService]
})

export class MaintenanceModule { }