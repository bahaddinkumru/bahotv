import { Injectable } from "@nestjs/common";
import { SocketRepository } from "./socket.repository";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { MaintenanceService } from "../admin/maintenance/maintenance.service";
import { Role } from "../../common/enums/role.enum";
import { UserService } from "../user/user.service";
import { Server, Socket } from "socket.io";
import { ComplaintAction } from "../admin/complaint/enums/complaint.enum";

@Injectable()
export class SocketService {
    private readonly logger = new Logger(SocketService.name);
    private maintenanceTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private readonly socketRepository: SocketRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly maintenanceService: MaintenanceService,
        private readonly userService: UserService
    ) { }

    private parseCookies(cookieStr: string): Record<string, string> {
        return Object.fromEntries(
            cookieStr.split(';').map(c => {
                const [key, ...rest] = c.trim().split('=');
                return [key, rest.join('=')];
            })
        );
    }

    async Connection(client: Socket) {
        this.logger.log("----------------------------");
        this.logger.log(`BİRİ BAĞLANMAYA ÇALIŞIYOR: ${client.id}`);
        this.logger.log("----------------------------");

        let token = client.handshake.auth?.token || client.handshake.headers.authorization;

        if (!token && client.handshake.headers.cookie) {
            const cookies = this.parseCookies(client.handshake.headers.cookie);
            token = cookies['access_token'];
        }

        if (!token) {
            this.logger.warn(`Token bulunamadı! Bağlantı reddedildi. ID: ${client.id}`);
            client.emit('error_message', 'Bağlantı reddedildi.');
            setTimeout(() => client.disconnect(), 1000);
            return;
        }

        const cleanToken = token.replace('Bearer', '').trim();
        const secret = this.configService.get<string>('JWT_ACCESS_SECRET');

        const payload = await this.jwtService.verifyAsync(cleanToken, { secret });

        client.data.userId = payload.sub;
        client.data.email = payload.email;

        const isBanned = await this.socketRepository.isUserBanned(payload.sub);
        if (isBanned) {
            this.logger.warn(`Banlı kullanıcı bağlanmaya çalıştı. ID: ${payload.sub}`);
            client.emit('error_message', 'Hesabınız engellendiği için sisteme bağlanamazsınız.');
            setTimeout(() => client.disconnect(), 1000);
            return;
        }

        const isMaintenance = await this.maintenanceService.getMaintenanceStatus();
        if (payload.role !== Role.SUPER_ADMIN && isMaintenance.maintenance_mode) {
            client.emit('error_message', 'Sistem bakım modunda. Lütfen daha sonra tekrar deneyin.');
            setTimeout(() => {
                client.disconnect();
            }, 2000);
            return;
        }

        if (String(payload.sub).startsWith('bot_')) {
            client.data.user = {
                id: payload.sub,
                email: payload.email,
                university: Math.random() > 0.5 ? 'sau' : 'subu',
                gender: Math.random() > 0.5 ? 'male' : 'female',
                filter_university: false,
                filter_gender: false
            };
        } else {
            let userProfile = await this.socketRepository.getUserProfileFromCache(payload.sub);

            if (!userProfile) {
                this.logger.warn(`Cache bulunamadı, DB'ye gidiliyor. ID: ${payload.sub}`);

                const user = await this.userService.findOne(payload.sub);

                if (!user || !user.is_active) {
                    client.emit('error_message', 'Kullanıcı bulunamadı veya pasif durumda.');
                    setTimeout(() => client.disconnect(), 1000);
                    return;
                }

                userProfile = {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    university: user.university,
                    gender: user.gender,
                    filter_university: user.filter_university,
                    filter_gender: user.filter_gender
                };

                await this.socketRepository.saveUserProfileToCache(user.id, userProfile);
            }
            client.data.user = userProfile;
        }

        this.logger.log(`Başarıyla bağlandı ve doğrulandı: ${client.data.user.email}`);
        client.join(`user_${payload.sub}`);
        client.emit('auth_success');
    }

    async Disconnect(client: Socket, server: Server) {
        await this.socketRepository.removeUserQueue(client.id);
        await this.socketRepository.deleteUserData(client.id);

        await this.endMatch(client, server);

        if (client.data && client.data.userId)
            await this.socketRepository.clearUserBusy(client.data.userId);
    }

    async findMatch(client: Socket, server: Server) {
        const userId = client.data.userId;

        if (!userId || !client.data.user) {
            client.emit('error_message', 'Oturum bilgisi eksik. Yeniden bağlanın.');
            return;
        }

        const isAllowed = await this.socketRepository.checkRateLimit(client.id);

        if (!isAllowed) {
            client.emit('error_message', 'Çok hızlı işlem yapıyorsunuz. Lütfen biraz bekleyin.');
            return;
        }

        const isMaintenance = await this.maintenanceService.getMaintenanceStatus();
        if (isMaintenance.maintenance_mode) {
            client.emit('error_message', 'Sistem bakım modunda. Lütfen daha sonra tekrar deneyin.');
            return;
        }

        try {
            const currentMatch = await this.socketRepository.getMatch(client.id);
            if (currentMatch)
                await this.endMatch(client, server);

            await this.socketRepository.removeUserQueue(client.id);
            const sUserId = String(userId);
            await this.socketRepository.clearUserBusy(sUserId);

            const myUser = client.data.user;

            const targetUni = myUser.filter_university ? myUser.university : 'any';
            const targetGender = myUser.filter_gender ? myUser.gender : 'any';

            const myData = {
                socketId: client.id,
                userId: myUser.id,
                email: myUser.email,
                university: myUser.university,
                gender: myUser.gender,
                targetUni,
                targetGender
            };

            await this.socketRepository.saveUserData(client.id, myData);
            await this.socketRepository.addUserToQueue(client.id, myData);

            let candidatesData = await this.socketRepository.findCandidatesData(targetUni, targetGender, 15) || [];
            candidatesData = candidatesData.filter(c => c && c.socketId !== client.id);

            this.logger.log(`Eşleşme Aranıyor: ${myUser.email} için ${candidatesData.length} aday değerlendiriliyor...`);

            for (const partnerData of candidatesData) {
                const myId = String(myUser.id);
                const partnerId = String(partnerData.userId);
                const [firstToLock, secondToLock] = [myId, partnerId].sort();

                let isFirstLocked = await this.socketRepository.lockUser(firstToLock);

                // Yarış durumlarını (race condition) önlemek için kilit alınamazsa bir kez daha dene
                if (!isFirstLocked) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    isFirstLocked = await this.socketRepository.lockUser(firstToLock);
                }

                if (!isFirstLocked) continue;

                const isSecondLocked = await this.socketRepository.lockUser(secondToLock);
                if (!isSecondLocked) {
                    await this.socketRepository.clearUserBusy(firstToLock);
                    continue;
                }

                const amIOkForHim =
                    (partnerData.targetUni === 'any' || partnerData.targetUni === myUser.university) &&
                    (partnerData.targetGender === 'any' || partnerData.targetGender === myUser.gender);

                if (!amIOkForHim) {
                    await this.socketRepository.clearUserBusy(partnerId);
                    await this.socketRepository.clearUserBusy(myId);
                    continue;
                }

                await this.socketRepository.createMatch(client.id, partnerData.socketId);
                await this.socketRepository.removeUserQueue(client.id);
                await this.socketRepository.removeUserQueue(partnerData.socketId);

                server.to(partnerData.socketId).emit('match_found', {
                    partnerId: client.id,
                    partnerDbId: myUser.id,
                    initiator: true
                });

                client.emit('match_found', {
                    partnerId: partnerData.socketId,
                    partnerDbId: partnerData.userId,
                    initiator: false
                });

                this.logger.log(`EŞLEŞME BAŞARILI: ${myUser.email} <-> ${partnerData.email}`);
                return;
            }

            client.emit('waiting', 'Kriterlerinize uygun eşleşme aranıyor...');

        } catch (error) {
            this.logger.error(`Eşleşme aranırken hata oluştu. ID: ${client.id} - Hata: ${error.message}`);
            client.emit('error_message', 'Eşleşme sisteminde geçici bir sorun var.');
        }
    }

    async endMatch(client: Socket, server: Server) {
        try {
            const partnerId = await this.socketRepository.getMatch(client.id);

            const clientData = await this.socketRepository.getUserData(client.id);
            // ID'lerin string olduğundan emin oluyoruz (Redis anahtarları için kritik)
            const clientIdToClear = (clientData && clientData.userId) ? String(clientData.userId) : (client.data?.userId ? String(client.data.userId) : null);

            if (clientIdToClear)
                await this.socketRepository.clearUserBusy(clientIdToClear);

            await this.socketRepository.deleteMatch(client.id);

            if (partnerId) {
                const partnerData = await this.socketRepository.getUserData(partnerId);

                if (partnerData && partnerData.userId)
                    await this.socketRepository.clearUserBusy(String(partnerData.userId));

                server.to(partnerId).emit('partner_disconnected');
            }
        } catch (error) {
            this.logger.error(`Eşleşme sonlandırılırken hata oluştu. ID: ${client.id} - Hata: ${error.message}`);
        }
    }

    async stopSearch(client: Socket) {
        await this.socketRepository.removeUserQueue(client.id);
        if (client.data.userId)
            await this.socketRepository.clearUserBusy(String(client.data.userId));
    }

    async startMaintenance(server: Server) {
        this.logger.warn('Bakım modu tetiklendi! 1 dakika tahliye süresi başladı...');

        server.emit('error_message', 'DİKKAT: Sistem 1 dakika içinde acil bakıma alınacaktır. Lütfen görüşmelerinizi sonlandırın.');

        if (this.maintenanceTimeout) clearTimeout(this.maintenanceTimeout);

        this.maintenanceTimeout = setTimeout(() => {
            this.logger.warn('Süre doldu! Herkes yaka paça atılıyor...');
            server.emit('error_message', 'Sistem bakıma alındı. Bağlantınız kesiliyor...');

            server.disconnectSockets();
            this.maintenanceTimeout = null;
        }, 60000);
    }

    async cancelMaintenance(server: Server) {
        if (this.maintenanceTimeout) {
            clearTimeout(this.maintenanceTimeout);
            this.maintenanceTimeout = null;

            this.logger.log('Bakım modu iptal edildi. Geri sayım durduruldu.');
            server.emit('error_message', 'Bakım işlemi iptal edilmiştir. Kesintisiz sohbete devam edebilirsiniz!');
        }
    }

    async joinAdminRoom(client: Socket) {
        if (client.data.user.role !== Role.SUPER_ADMIN) {
            this.logger.warn(`Yetkisiz odaya sızma girişimi! ID: ${client.id}`);
            client.emit('error_message', 'Bu odaya katılma yetkiniz yok.');
            return;
        }

        client.join('admin_room');
        this.logger.log(`Bir Admin operasyon odasına katıldı: ${client.data.user.email || client.id}`);
    }

    async leaveAdminRoom(client: Socket) {
        client.leave('admin_room');
        this.logger.log(`Bir Admin operasyon odasından ayrıldı: ${client.data.user.email || client.id}`);
    }

    async getSystemStats() {
        try {
            const [
                activeUsersCount,
                activeMatchesCount,
                queueCount,
                universityStats,
                genderStats
            ] = await Promise.all([
                this.socketRepository.getActiveUsersCount(),
                this.socketRepository.getActiveMatchesCount(),
                this.socketRepository.getQueueCount(),
                this.socketRepository.getUniversityStatsForPanel(),
                this.socketRepository.getGenderCount()
            ]);

            return {
                activeUsersCount,
                activeMatchesCount,
                queueCount,
                universityStats,
                genderStats
            };
        } catch (error) {
            this.logger.error(`Sistem istatistikleri alınırken hata: ${error.message}`);
            throw error;
        }
    }

    async sendSystemStats(client: Socket) {
        if (client.data?.user?.role !== Role.SUPER_ADMIN) {
            this.logger.warn(`Yetkisiz istatistik talebi! ID: ${client.id}`);
            client.emit('error_message', 'Bu verileri görme yetkiniz yok.');
            return;
        }
        const stats = await this.getSystemStats();
        client.emit('system_stats_updated', stats);
    }

    async subscribeStats(client: Socket) {
        if (client.data?.user?.role !== Role.SUPER_ADMIN) {
            this.logger.warn(`Yetkisiz istatistik aboneliği denemesi! ID: ${client.id}`);
            client.emit('error_message', 'Bu verileri görme yetkiniz yok.');
            return;
        }

        client.join('admin_dashboard');
        this.logger.log(`Admin istatistik paneline abone oldu: ${client.data.user.email || client.id}`);

        const stats = await this.getSystemStats();
        client.emit('system_stats_updated', stats);
    }

    async unsubscribeStats(client: Socket) {
        client.leave('admin_dashboard');
        this.logger.log(`Admin istatistik panelinden ayrıldı: ${client.data.user.email || client.id}`);
    }

    async broadcastNewComplaint(server: Server, newComplaint: any) {
        this.logger.log(`Yeni şikayet (#${newComplaint.id}) operasyon odasına (adminlere) iletiliyor...`);
        server.to('admin_room').emit('new_complaint', newComplaint);
    }

    async handleDirectNotification(server: Server, notification: any) {
        this.logger.log(`Sinyal yakalandı! Bildirim #${notification.id} -> User #${notification.userId}`);

        server.to(`user_${notification.userId}`).emit('new_notification', notification);

        if (notification.type === ComplaintAction.BAN || notification.type === ComplaintAction.PERMA_BAN) {

            const bannedUntil = notification.type === ComplaintAction.PERMA_BAN ? null : notification.banned_until;

            await this.socketRepository.setBannedUser(notification.userId, bannedUntil);

            server.to(`user_${notification.userId}`).emit('force_logout', {
                reason: notification.message
            });

            setTimeout(() => {
                server.in(`user_${notification.userId}`).disconnectSockets(true);
            }, 3000);
        }
    }

    async handleSignal(client: Socket, data: { target: string; signal: any }, server: Server) {
        const activePartnerId = await this.socketRepository.getMatch(client.id);

        if (activePartnerId && activePartnerId === data.target) {
            server.to(data.target).emit('signal', {
                sender: client.id,
                signal: data.signal,
            });
        } else
            this.logger.warn(`Yetkisiz veya kopmuş sinyal denemesi: ${client.id} -> ${data.target}`);
    }
}   