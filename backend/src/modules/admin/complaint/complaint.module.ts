import { Module } from "@nestjs/common";
import { ComplaintController } from "./complaint.controller";
import { ComplaintService } from "./complaint.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Complaint } from "./entities/complaint.entity";
import { UserModule } from "../../user/user.module";
import { NotificationModule } from "../../notification/notification.module";
import { ClientsModule } from "@nestjs/microservices";
import { kafkaConfig } from "../../../common/config/kafka.config";
import { AiModerationConsumer } from "./consumers/ai-moderation.consumer";

@Module({
    imports: [
        TypeOrmModule.forFeature([Complaint]), UserModule, NotificationModule,
        ClientsModule.register([kafkaConfig]),
    ],
    controllers: [ComplaintController, AiModerationConsumer],
    providers: [ComplaintService],
})
export class ComplaintModule { }