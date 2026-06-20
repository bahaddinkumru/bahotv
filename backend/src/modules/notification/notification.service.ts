import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplaintAction } from '../admin/complaint/enums/complaint.enum';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Notification)
        private notificationRepo: Repository<Notification>,
        private eventEmitter: EventEmitter2
    ) { }

    async createNotification(userId: number, title: string, message: string, type: ComplaintAction | 'INFO' = 'INFO') {
        const notification = this.notificationRepo.create({
            userId,
            title,
            message,
            type: type as string,
            is_read: false
        });

        const savedNotification = await this.notificationRepo.save(notification);

        this.eventEmitter.emit('notification.send', savedNotification);

        return savedNotification;
    }

    async getUnreadNotifications(userId: number) {
        return await this.notificationRepo.find({
            where: { userId, is_read: false },
            order: { createdAt: 'DESC' }
        });
    }

    async markAsRead(notificationId: number, userId: number) {
        const notification = await this.notificationRepo.findOne({
            where: { id: notificationId, userId }
        });

        if (!notification)
            throw new NotFoundException('Bildirim bulunamadı veya bu işlem için yetkiniz yok!');

        notification.is_read = true;
        await this.notificationRepo.save(notification);

        return { success: true, message: 'Bildirim okundu olarak işaretlendi ve arşive kaldırıldı.' };
    }
}