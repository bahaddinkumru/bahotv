import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { SocketService } from "./socket.service";

@WebSocketGateway({
    cors: {
        origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:4000', 'http://localhost:3000'],
        credentials: true
    }
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(AppGateway.name);

    constructor(
        private readonly socketService: SocketService
    ) { }

    afterInit(server: Server) {
        setInterval(async () => {
            const room = this.server.sockets.adapter.rooms.get('admin_dashboard');
            if (room && room.size > 0) {
                try {
                    const stats = await this.socketService.getSystemStats();
                    this.server.to('admin_dashboard').emit('system_stats_updated', stats);
                } catch (error) {
                    this.logger.error(`Canlı istatistik yayınında hata: ${error.message}`);
                }
            }
        }, 3000);
    }

    async handleConnection(client: Socket) {
        try {
            await this.socketService.Connection(client);
        } catch (err) {
            this.logger.error(`Bağlantı reddedildi (${client.id}): ${err.message}`);
            client.disconnect();
        }
    }

    async handleDisconnect(client: Socket) {
        try {
            await this.socketService.Disconnect(client, this.server);
        } catch (error) {
            this.logger.error(
                `Kopma işlemi sırasında kritik hata! Client ID: ${client.id}. Hata: ${error.message}`
            );
        }
    }

    @SubscribeMessage('find_match')
    async handleFindMatch(@ConnectedSocket() client: Socket) {
        try {
            await this.socketService.findMatch(client, this.server);
        } catch (error) {
            this.logger.error(`Eşleşme arama hatası. Client ID: ${client.id} - Hata: ${error.message}`);
        }
    }

    @SubscribeMessage('stop_search')
    async handleStopSearch(@ConnectedSocket() client: Socket) {
        try {
            await this.socketService.stopSearch(client);
        } catch (error) {
            this.logger.error(`Arama durdurma hatası. Client ID: ${client.id} - Hata: ${error.message}`);
        }
    }

    @SubscribeMessage('end_match')
    async handleEndMatch(@ConnectedSocket() client: Socket) {
        try {
            await this.socketService.endMatch(client, this.server);
        } catch (error) {
            this.logger.error(`Eşleşme sonlandırılırken hata oluştu. Client ID: ${client.id} - Hata: ${error.message}`);
        }
    }

    @OnEvent('maintenance.started')
    async handleSystemMaintenance() {
        try {
            await this.socketService.startMaintenance(this.server);
        } catch (error) {
            this.logger.error(`Bakım modu başlatılırken kritik hata: ${error.message}`);
        }
    }

    @OnEvent('maintenance.canceled')
    async handleMaintenanceCanceled() {
        try {
            await this.socketService.cancelMaintenance(this.server);
        } catch (error) {
            this.logger.error(`Bakım modu iptal edilirken hata: ${error.message}`);
        }
    }

    @SubscribeMessage('get_system_stats')
    async handleGetSystemStats(@ConnectedSocket() client: Socket) {
        try {
            await this.socketService.sendSystemStats(client);
        } catch (error) {
            this.logger.error(`İstatistik okuma hatası. Client ID: ${client.id} - Hata: ${error.message}`);
        }
    }

    @SubscribeMessage('subscribe_stats')
    async handleSubscribeStats(@ConnectedSocket() client: Socket) {
        try {
            await this.socketService.subscribeStats(client);
        } catch (error) {
            this.logger.error(`İstatistik abonelik hatası. Client ID: ${client.id} - Hata: ${error.message}`);
        }
    }

    @SubscribeMessage('unsubscribe_stats')
    async handleUnsubscribeStats(@ConnectedSocket() client: Socket) {
        try {
            await this.socketService.unsubscribeStats(client);
        } catch (error) {
            this.logger.error(`İstatistik abonelik iptali hatası. Client ID: ${client.id} - Hata: ${error.message}`);
        }
    }
    // Adminlerin yeni oluşturulan şikayetleri anlık görebilmesi için özel operasyon odasına (admin_room) katılmasını sağlar.
    @SubscribeMessage('join_admin_room')
    async handleJoinAdminRoom(@ConnectedSocket() client: Socket) {
        try {
            await this.socketService.joinAdminRoom(client);
        } catch (error) {
            this.logger.error(`Admin odasına katılırken hata oluştu. Client ID: ${client.id} - Hata: ${error.message}`);
        }
    }

    // Adminlerin şikayet bildirimlerinin aktığı operasyon odasından çıkmasını sağlar.
    @SubscribeMessage('leave_admin_room')
    async handleLeaveAdminRoom(@ConnectedSocket() client: Socket) {
        try {
            await this.socketService.leaveAdminRoom(client);
        } catch (error) {
            this.logger.error(`Admin odasından çıkarken hata oluştu. Client ID: ${client.id} - Hata: ${error.message}`);
        }
    }

    // Sistemde yeni bir şikayet oluşturulduğunda bunu anında operasyon odasındaki (admin_room) adminlere fırlatır.
    @OnEvent('complaint.created')
    async handleNewComplaintBroadcast(newComplaint: any) {
        try {
            await this.socketService.broadcastNewComplaint(this.server, newComplaint);
        } catch (error) {
            this.logger.error(`Yeni şikayet yayını sırasında hata oluştu: ${error.message}`);
        }
    }

    // Kullanıcıya özel bildirim yollar; eğer bildirim BAN veya PERMA_BAN ise adamı Redis'te banlayıp yaka paça sistemden atar.
    @OnEvent('notification.send')
    async handleDirectNotification(notification: any) {
        try {
            await this.socketService.handleDirectNotification(this.server, notification);
        } catch (error) {
            this.logger.error(`Bildirim/Ban işlemi Gateway üzerinden aktarılırken hata: ${error.message}`);
        }
    }


    // WebRTC için hayati olan eşler arası veri (offer, answer, ice-candidate) aktarımını, sadece eşleşmiş kişiler arasında güvenlice yapar.
    @SubscribeMessage('signal')
    async handleSignal(
        @MessageBody() data: { target: string; signal: any },
        @ConnectedSocket() client: Socket
    ) {
        try {
            await this.socketService.handleSignal(client, data, this.server);
        } catch (error) {
            this.logger.error(`Sinyal iletimi sırasında hata oluştu. Client ID: ${client.id} - Hata: ${error.message}`);
        }
    }
}