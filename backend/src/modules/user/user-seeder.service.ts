import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import * as bcrypt from 'bcrypt';
import { Role } from "../../common/enums/role.enum";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UserSeederService implements OnApplicationBootstrap {
    private readonly logger = new Logger(UserSeederService.name);

    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>,
        private configService: ConfigService,
    ) { }

    async onApplicationBootstrap() {
        this.logger.log('Veritabanı kontrol ediliyor... (Seeding)');

        const adminEmail = 'admin@bahotv.com';
        const existingAdmin = await this.userRepository.findOne({
            where: { email: adminEmail }
        });

        if (!existingAdmin) {
            this.logger.log('Sistemde Super Admin bulunamadı, yenisi oluşturuluyor...');

            const password = this.configService.get('ADMIN_INITIAL_PASSWORD');
            if (!password) throw new Error('ADMIN_INITIAL_PASSWORD must be set');

            const hashedPassword = await bcrypt.hash(password, 10);

            const superAdmin = this.userRepository.create({
                name: 'Super',
                surname: 'Admin',
                gender: 'male',
                email: adminEmail,
                password: hashedPassword,
                is_active: true,
                university: 'subu',
                role: Role.SUPER_ADMIN,
            });

            await this.userRepository.save(superAdmin);
            this.logger.verbose('Super Admin başarıyla oluşturuldu! (admin@bahotv.com / admin123)');
        } else
            this.logger.log('Super Admin zaten mevcut, seeding atlandı.');
    }
}