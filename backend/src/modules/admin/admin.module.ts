import { Module } from "@nestjs/common";
import { MaintenanceModule } from "./maintenance/maintenance.module";
import { ComplaintModule } from "./complaint/complaint.module";

@Module({
    imports: [MaintenanceModule, ComplaintModule],
    controllers: [],
    providers: [],
    exports: [MaintenanceModule]
})

export class AdminModule { }
