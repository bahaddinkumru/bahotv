import { Module } from '@nestjs/common';
import { SocketRepository } from './socket.repository';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { AppGateway } from './app.gateway';
import { MaintenanceModule } from '../admin/maintenance/maintenance.module';
import { SocketService } from './socket.service';

@Module({
    imports: [
        UserModule,
        AuthModule,
        MaintenanceModule
    ],
    providers: [SocketRepository, AppGateway, SocketService],
    exports: [SocketRepository, AppGateway]
})
export class SocketModule { }