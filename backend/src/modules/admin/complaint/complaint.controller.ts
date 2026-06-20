import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Req,
    UseInterceptors,
    UploadedFile,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { TakeActionDto } from './dto/take-action.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('complaint')
export class ComplaintController {
    constructor(private readonly complaintService: ComplaintService) { }

    @Roles(Role.USER)
    @Post()
    @UseInterceptors(FileInterceptor('evidence', {
        storage: diskStorage({}),
        fileFilter: (req, file, cb) => {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
                return cb(new BadRequestException('Sadece resim yükleyebilirsiniz'), false);
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 }
    }))
    async create(
        @Req() req,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: CreateComplaintDto
    ) {
        const reporterId = req.user.id;

        if (file)
            dto.proofImageUrl = `/uploads/evidence/${file.filename}`;

        return this.complaintService.create(reporterId, dto);
    }

    @Get('pending')
    async getPending() {
        return await this.complaintService.getPending();
    }

    @Post('action')
    async takeAction(@Body() dto: TakeActionDto) {
        return await this.complaintService.takeAction(dto);
    }
}