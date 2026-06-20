import { GoogleGenerativeAI } from "@google/generative-ai";
import { Controller, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventPattern, Payload } from "@nestjs/microservices";
import * as fs from 'fs';
import * as path from 'path';
import { ComplaintAction } from "../enums/complaint.enum";
import { ComplaintService } from "../complaint.service";

@Controller()
export class AiModerationConsumer {
    private readonly logger = new Logger(AiModerationConsumer.name);
    private genAI: GoogleGenerativeAI;

    constructor(
        private readonly configService: ConfigService,
        private readonly complaintService: ComplaintService
    ) {
        const apiKey = configService.get<string>('GEMINI_API_KEY');

        if (!apiKey)
            this.logger.error("gemini api key is not found");

        this.genAI = new GoogleGenerativeAI(apiKey!);
    }

    @EventPattern('analyze_nsfw_image')
    async handleImageAnalysis(@Payload() message: any) {
        const complaintId = Number(message.complaintId);
        this.logger.log(`\n🤖 AI Moderasyon Başladı - Şikayet ID: ${complaintId}`);

        if (!complaintId || isNaN(complaintId)) {
            this.logger.error(`Geçersiz complaintId geldi: ${message.complaintId}`);
            return;
        }

        try {
            const safePath = path.resolve('./uploads/evidence', path.basename(message.imagePath));
            if (!safePath.startsWith(path.resolve('./uploads/evidence')))
                throw new Error('Path traversal detected');

            if (!fs.existsSync(safePath)) {
                this.logger.error(`Görsel diskte bulunamadı: ${safePath}`);
                return;
            }

            const imageBase64 = fs.readFileSync(safePath).toString('base64');

            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType: 'image/jpeg'
                }
            };

            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `
                Sen katı bir içerik moderatörüsün. Bu görseli incele ve SADECE aşağıdaki JSON formatında cevap ver. Başka hiçbir metin ekleme.
                
                Kriterler:
                - Normal bir insan yüzü veya temiz bir arka plan ise: "REJECT"
                - Ortada bir el hareketi, küfür içeren bir yazı veya hafif uygunsuz bir durum varsa: "WARN"
                - Kesin bir çıplaklık veya cinsel içerik varsa: "BAN"
                - Aşırı şiddet, silah veya yasadışı madde varsa: "PERMA_BAN"

                Dönmen gereken kesin JSON Formatı:
                {
                    "isViolation": true veya false,
                    "reason": "Türkçe olarak çok kısa sebep belirt (örn: 'Görsel temiz', 'Çıplaklık tespit edildi')",
                    "action": "REJECT", "WARN", "BAN" veya "PERMA_BAN"
                }
            `;

            this.logger.log('Gemini modeline istek atılıyor...');

            const result = await model.generateContent([prompt, imagePart]);
            const responseText = result.response.text();

            this.logger.log(`📝 Gemini ham yanıtı: ${responseText}`);

            const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
            if (!jsonMatch) {
                this.logger.error(`❌ Gemini yanıtından JSON çıkarılamadı. Ham yanıt: ${responseText}`);
                return;
            }

            let aiDecision: { isViolation?: boolean; reason?: string; action?: string };
            try {
                aiDecision = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                this.logger.error(`❌ JSON parse hatası. Çıkarılan metin: ${jsonMatch[0]}`);
                return;
            }

            if (!aiDecision.action || !aiDecision.reason) {
                this.logger.error(`❌ AI yanıtında action veya reason eksik: ${JSON.stringify(aiDecision)}`);
                return;
            }

            this.logger.log(`🧠 AI Kararı: ${JSON.stringify(aiDecision)}`);

            const mappedAction = ComplaintAction[aiDecision.action as keyof typeof ComplaintAction];

            if (!mappedAction) {
                this.logger.warn(`Bilinmeyen AI aksiyonu: ${aiDecision.action}, işlem iptal edildi.`);
                return;
            }

            await this.complaintService.takeAction({
                reportId: complaintId,
                action: mappedAction,
                adminNote: `Kral Bahaddin Tarafından ${aiDecision.reason}`
            });

            this.logger.log(`✅ Süreç Tamamlandı! Şikayet #${complaintId} için ${mappedAction} uygulandı.\n`);

        } catch (error) {
            this.logger.error(`❌ AI Moderasyon İşlemi Çöktü: ${error.message}`, error.stack);
        }
    }
}