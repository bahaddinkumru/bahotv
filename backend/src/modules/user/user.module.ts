import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MailModule } from '../email/mail.module';
import { UserPenalty } from './entities/user-penalty.entity';
import { UserSeederService } from './user-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPenalty]), MailModule],
  controllers: [UserController],
  providers: [UserService, UserSeederService],
  exports: [UserService]
})
export class UserModule { }
