import { Controller, Get, Put, Param, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';

@Controller('notifications')
@UseGuards(JwtAccessGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get('unread')
    async getUnread(@Req() req) {
        const userId = req.user.id || req.user.sub;
        return await this.notificationService.getUnreadNotifications(userId);
    }

    @Put(':id/read')
    async markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req) {
        const userId = req.user.id || req.user.sub;
        return await this.notificationService.markAsRead(id, userId);
    }
}