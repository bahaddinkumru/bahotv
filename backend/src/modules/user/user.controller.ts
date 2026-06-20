import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, ClassSerializerInterceptor, Put, UseGuards, Request, BadRequestException, ForbiddenException, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { UpdateSettingsDto } from './dto/update-user.dto';
import { SkipBanCheck } from '../auth/decarators/skip-ban-check.decorator';

@Controller('user')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @UseGuards(JwtAccessGuard)
  @Patch('settings')
  async updateSettings(@Req() req, @Body() dto: UpdateSettingsDto) {
    return this.userService.updateSettings(req.user.id, dto);
  }

  @UseGuards(JwtAccessGuard)
  @Delete()
  async remove(@Request() req) {
    return await this.userService.remove(req.user.id);
  }

  @SkipThrottle()
  @UseGuards(JwtAccessGuard)
  @Get('me')
  async getMe(@Request() req) {
    return await this.userService.findOne(req.user.id);
  }

  @SkipThrottle()
  @UseGuards(JwtAccessGuard)
  @SkipBanCheck()
  @Get('penalty/me')
  async getMyPenalty(@Request() req) {
    return await this.userService.getPenalty(req.user.id);
  }

  @UseGuards(JwtAccessGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    if (Number(id) !== req.user.id)
      throw new ForbiddenException('Başkalarının profilini görüntüleyemezsiniz.');

    return await this.userService.findOne(+id);
  }
}