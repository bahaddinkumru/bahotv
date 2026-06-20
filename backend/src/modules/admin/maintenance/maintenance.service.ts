import { InjectRedis } from "@nestjs-modules/ioredis";
import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MaintenanceService {
    private readonly logger = new Logger(MaintenanceService.name);
    private readonly MAINTENANCE_KEY = 'system:maintenance_mode';

    constructor(
        @InjectRedis() private readonly redis: Redis,
        private readonly eventEmitter: EventEmitter2
    ) { }

    async toggleMaintenanceMode(is_active: boolean) {
        await this.redis.set(this.MAINTENANCE_KEY, is_active ? 1 : 0);

        this.logger.warn(`Sistem Bakım Modu: ${is_active ? 'AÇIK (DANGER)' : 'KAPALI (SAFE)'}`);

        if (is_active) this.eventEmitter.emit('maintenance.started');
        else this.eventEmitter.emit('maintenance.cancelled');

        return {
            success: true,
            message: is_active ? 'Sistem bakım moduna alındı!' : 'Sistem normal seyrine döndü.',
            maintenance_mode: is_active
        }
    }

    async getMaintenanceStatus() {
        const maintenanceStatus = await this.redis.get(this.MAINTENANCE_KEY);

        return {
            maintenance_mode: maintenanceStatus === '1'
        };
    }

}