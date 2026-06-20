import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get('MAIL_USER'),
                pass: this.configService.get('MAIL_PASS'),
            },
        });
    }

    async sendVerificationCode(email: string, code: string) {
        try {
            const info = await this.transporter.sendMail({
                from: '"BahoTV Güvenlik" <bahaddinkumru7@gmail.com>',
                to: email,
                subject: 'BahoTV - Hesap Doğrulama',
                html: `
                 <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>BahoTV Doğrulama Kodu</h2>
                    <p>Hesabını onaylamak için aşağıdaki kodu gir:</p>
                    <h1 style="background: #eee; display: inline-block; padding: 10px 20px; letter-spacing: 5px; border-radius: 5px;">
                      ${code}
                    </h1>
                 </div>
                `,
            });

            this.logger.log(`Mail başarıyla gönderildi: ${email} | ID: ${info.messageId}`);
        } catch (error) {
            this.logger.error('Mail gönderilemedi:', error);
        }
    }
}