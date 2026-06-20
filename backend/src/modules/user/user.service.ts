import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { MailService } from '../email/mail.service';
import { UpdateSettingsDto } from './dto/update-user.dto';
import { UserPenalty } from './entities/user-penalty.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPenalty)
    private penaltyRepository: Repository<UserPenalty>,
    private readonly mailService: MailService,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser)
      throw new BadRequestException('Böyle bir kullanıcı zaten kayıtlı');

    const { password, ...rest } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(verificationCode, 10);
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    const user = this.userRepository.create({
      ...rest,
      password: hashedPassword,
      verification_code: hashedCode,
      verification_code_expires: expires,
    });

    const savedUser = await this.userRepository.save(user);

    await this.mailService.sendVerificationCode(user.email, verificationCode);

    return savedUser;
  }

  async findOne(id: number | string) {
    const user = await this.userRepository.findOne({
      where: { id: Number(id) },
    });

    if (!user)
      throw new NotFoundException(`User with ID ${id} not found`);

    return user;
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      relations: ['penalty']
    });
  }

  async updateSettings(userId: number, dto: UpdateSettingsDto) {
    await this.userRepository.update(userId, {
      ...dto
    });
    return { message: 'Ayarlar güncellendi' };
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    return this.userRepository.remove(user);
  }

  async warnUser(userId: number, adminNote?: string, proofImageUrl?: string) {
    let penalty = await this.penaltyRepository.findOne({ where: { userId } });

    if (!penalty)
      penalty = this.penaltyRepository.create({ userId, warning_count: 0 });

    penalty.warning_count++;

    if (proofImageUrl) penalty.proofImageUrl = proofImageUrl;

    if (penalty.warning_count > 3)
      return await this.banUser(userId, adminNote, proofImageUrl);

    if (adminNote) penalty.ban_reason = adminNote;

    await this.penaltyRepository.save(penalty);
    return { success: true, message: `Kullanıcı uyarıldı. Toplam uyarı: ${penalty.warning_count}` };
  }

  async banUser(userId: number, reason?: string, proofImageUrl?: string, forcePerma: boolean = false) {
    let penalty = await this.penaltyRepository.findOne({ where: { userId } });

    if (!penalty) {
      penalty = this.penaltyRepository.create({
        userId,
        warning_count: 0,
        ban_count: 0
      });
    }

    penalty.ban_count += 1;

    let banDurationDays = 0;

    let isPermanent = forcePerma;

    if (!isPermanent) {
      switch (penalty.ban_count) {
        case 1: banDurationDays = 1; break;
        case 2: banDurationDays = 3; break;
        case 3: banDurationDays = 7; break;
        case 4: banDurationDays = 30; break;
        default: isPermanent = true; break; // 5. Suçta otomatik perma
      }
    }

    const now = new Date();
    penalty.is_banned = true;
    penalty.banned_at = now;
    penalty.ban_reason = reason || "Topluluk kurallarını ihlal ettiniz.";
    if (proofImageUrl) penalty.proofImageUrl = proofImageUrl;

    if (isPermanent)
      penalty.banned_until = null; // Sınırsız Ban
    else {
      const untilDate = new Date(now.getTime() + (banDurationDays * 24 * 60 * 60 * 1000));
      penalty.banned_until = untilDate;
    }

    await this.penaltyRepository.save(penalty);

    return {
      success: true,
      message: `Kullanıcı ${isPermanent ? 'kalıcı olarak' : `${banDurationDays} günlüğüne`} yasaklandı.`
    };
  }

  async getPenalty(userId: number) {
    return await this.penaltyRepository.findOne({
      where: { userId },
      select: {
        id: true,
        warning_count: true,
        ban_count: true,
        is_banned: true,
        banned_at: true,
        banned_until: true,
        ban_reason: true,
        proofImageUrl: true
      }
    });
  }

  async getUsersCount(): Promise<number> {
    return this.userRepository.count();
  }
}
