import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Complaint } from "./entities/complaint.entity";
import { Repository } from "typeorm";
import { UserService } from "../../user/user.service";
import { CreateComplaintDto } from "./dto/create-complaint.dto";
import { ComplaintAction, ComplaintReason, ComplaintStatus } from "./enums/complaint.enum";
import { TakeActionDto } from "./dto/take-action.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationService } from "../../notification/notification.service";
import { ClientKafka } from "@nestjs/microservices";

@Injectable()
export class ComplaintService {
    private readonly logger = new Logger(ComplaintService.name);
    constructor(
        @InjectRepository(Complaint)
        private complaintRepository: Repository<Complaint>,
        private userService: UserService,
        private eventEmitter: EventEmitter2,
        private notificationService: NotificationService,
        @Inject('AI_MODERATION_SERVICE') private readonly kafkaClient: ClientKafka,
    ) { }

    async create(reporterId: number, dto: CreateComplaintDto) {
        if (reporterId === Number(dto.reportedId))
            throw new BadRequestException("Kendinizi şikayet edemezsiniz!");

        const complaint = this.complaintRepository.create({
            reporterId,
            reportedId: Number(dto.reportedId),
            reason: dto.reason,
            proofImageUrl: dto.proofImageUrl
        });
        const savedComplaint = await this.complaintRepository.save(complaint);

        if (dto.reason === ComplaintReason.INAPPROPRIATE_CONTENT && dto.proofImageUrl) {
            this.logger.log(`AI Analizi tetikleniyor: Kullanıcı ID ${dto.reportedId}`);

            this.kafkaClient.emit('analyze_nsfw_image', {
                complaintId: savedComplaint.id,
                reportedId: Number(dto.reportedId),
                imagePath: dto.proofImageUrl,
                timestamp: new Date().toISOString()
            });
        }

        const fullComplaint = await this.complaintRepository.findOne({
            where: { id: savedComplaint.id },
            relations: ['reporter', 'reported']
        });

        this.eventEmitter.emit('complaint.created', fullComplaint);

        return { success: true, message: 'Şikayetiniz yönetime iletildi.' };
    }

    async getPending() {
        return await this.complaintRepository.find({
            where: { status: ComplaintStatus.PENDING },
            relations: ['reporter', 'reported'],
            select: {
                id: true,
                reason: true,
                proofImageUrl: true,
                status: true,
                createdAt: true,

                reporter: {
                    id: true,
                    name: true,
                    surname: true,
                    email: true
                },

                reported: {
                    id: true,
                    name: true,
                    surname: true,
                    email: true
                }
            },
            order: { createdAt: 'ASC' }
        });
    }

    async takeAction(dto: TakeActionDto) {
        const complaint = await this.complaintRepository.findOne({
            where: { id: dto.reportId },
            relations: ['reporter', 'reported']
        });

        if (!complaint)
            throw new BadRequestException("Şikayet bulunamadı!");

        if (complaint.status !== ComplaintStatus.PENDING)
            throw new BadRequestException("Bu şikayet zaten sonuçlandırılmış!");

        let actionMessage = "";

        const reporterFullName = `${complaint.reporter.name} ${complaint.reporter.surname}`;
        const reportedFullName = `${complaint.reported.name} ${complaint.reported.surname}`;

        switch (dto.action) {
            case ComplaintAction.REJECT:
                complaint.status = ComplaintStatus.REJECTED;
                actionMessage = "Şikayet reddedildi";

                await this.notificationService.createNotification(
                    complaint.reporterId,
                    "ℹ️ Şikayet Sonucu",
                    `Sayın ${reporterFullName}, "${reportedFullName}" isimli kullanıcı hakkında yapmış olduğunuz şikayet incelendi ve ihlal tespit edilemediği için reddedildi. ${dto.adminNote ? `\nAdmin Notu: ${dto.adminNote}` : ''}`,
                    ComplaintAction.REJECT
                );
                break;

            case ComplaintAction.WARN:
                await this.userService.warnUser(complaint.reportedId, dto?.adminNote, complaint?.proofImageUrl);
                complaint.status = ComplaintStatus.RESOLVED;
                actionMessage = "Kullanıcıya uyarı gönderildi";

                await this.notificationService.createNotification(
                    complaint.reportedId,
                    "⚠️ Sistem Uyarısı!",
                    `Sayın ${reportedFullName}, topluluk kurallarını ihlal ettiğiniz tespit edildi. ${dto.adminNote ? `\nSebep: ${dto.adminNote}` : '\nLütfen kurallara uyun, aksi takdirde hesabınız kısıtlanacaktır.'}`,
                    ComplaintAction.WARN
                );
                break;

            case ComplaintAction.BAN:
                await this.userService.banUser(complaint.reportedId, dto?.adminNote, complaint?.proofImageUrl);
                complaint.status = ComplaintStatus.RESOLVED;
                actionMessage = "Kullanıcı banlandı";

                await this.notificationService.createNotification(
                    complaint.reportedId,
                    "🚫 Hesabınız Askıya Alındı!",
                    `Sayın ${reportedFullName}, hesabınız kural ihlali sebebiyle geçici olarak durdurulmuştur. ${dto.adminNote ? `\nSebep: ${dto.adminNote}` : ''}`,
                    ComplaintAction.BAN
                );
                break;

            case ComplaintAction.PERMA_BAN:
                await this.userService.banUser(complaint.reportedId, dto.adminNote, complaint?.proofImageUrl, true);
                complaint.status = ComplaintStatus.RESOLVED;
                actionMessage = "Kullanıcı kalıcı olarak banlandı";

                await this.notificationService.createNotification(
                    complaint.reportedId,
                    "☠️ Hesabınız Kalıcı Olarak Kapatıldı!",
                    `Sayın ${reportedFullName}, sistem kurallarını ağır şekilde ihlal ettiğiniz için platformdan kalıcı olarak uzaklaştırıldınız. ${dto.adminNote ? `\nSebep: ${dto.adminNote}` : ''}`,
                    ComplaintAction.PERMA_BAN
                );
                break;
        }

        if (dto.adminNote)
            complaint.adminNote = dto.adminNote;

        await this.complaintRepository.save(complaint);

        return { success: true, message: actionMessage };
    }
}