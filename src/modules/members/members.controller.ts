import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from './dto/create-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.membersService.findAll(parseInt(page), parseInt(limit));
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.membersService.search(query, parseInt(page), parseInt(limit));
  }

  @Get('paid')
  @HttpCode(HttpStatus.OK)
  async getPaidMembers(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.membersService.getPaidMembers(parseInt(page), parseInt(limit));
  }

  @Get('unpaid')
  @HttpCode(HttpStatus.OK)
  async getUnpaidMembers(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.membersService.getUnpaidMembers(parseInt(page), parseInt(limit));
  }

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  async getRecentMembers(@Query('days') days: string = '30') {
    return this.membersService.getRecentMembers(parseInt(days));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.membersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.membersService.delete(id);
  }
}
