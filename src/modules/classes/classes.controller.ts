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
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto, EnrollMemberDto, UpdateEnrollmentDto } from './dto/create-class.dto';
import { ClassLevel } from '../../entities/gym-class.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // Class endpoints
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllClasses(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.classesService.getAllClasses(parseInt(page), parseInt(limit));
  }

  @Get('upcoming')
  @HttpCode(HttpStatus.OK)
  async getUpcomingClasses(@Query('daysAhead') daysAhead: string = '7') {
    return this.classesService.getUpcomingClasses(parseInt(daysAhead));
  }

  @Get('level/:level')
  @HttpCode(HttpStatus.OK)
  async getClassesByLevel(
    @Param('level') level: ClassLevel,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.classesService.getClassesByLevel(level, parseInt(page), parseInt(limit));
  }

  @Get('trainer/:trainerId')
  @HttpCode(HttpStatus.OK)
  async getClassesByTrainer(
    @Param('trainerId') trainerId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.classesService.getClassesByTrainer(trainerId, parseInt(page), parseInt(limit));
  }

  @Get('stats/:classId')
  @HttpCode(HttpStatus.OK)
  async getClassStatistics(@Param('classId') classId: string) {
    return this.classesService.getClassStatistics(classId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getClassById(@Param('id') id: string) {
    return this.classesService.getClassById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createClass(@Body() createClassDto: CreateClassDto) {
    return this.classesService.createClass(createClassDto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateClass(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.updateClass(id, updateClassDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClass(@Param('id') id: string) {
    return this.classesService.deleteClass(id);
  }

  // Enrollment endpoints
  @Post(':classId/enroll')
  @HttpCode(HttpStatus.CREATED)
  async enrollMember(@Param('classId') classId: string, @Body() enrollMemberDto: EnrollMemberDto) {
    return this.classesService.enrollMember(classId, enrollMemberDto);
  }

  @Delete(':classId/unenroll/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unenrollMember(@Param('classId') classId: string, @Param('memberId') memberId: string) {
    return this.classesService.unenrollMember(classId, memberId);
  }

  @Get(':classId/enrollments')
  @HttpCode(HttpStatus.OK)
  async getClassEnrollments(
    @Param('classId') classId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.classesService.getClassEnrollments(classId, parseInt(page), parseInt(limit));
  }
}

@Controller('api/enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('member/:memberId')
  @HttpCode(HttpStatus.OK)
  async getMemberEnrollments(
    @Param('memberId') memberId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.classesService.getMemberEnrollments(memberId, parseInt(page), parseInt(limit));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getEnrollmentById(@Param('id') id: string) {
    return this.classesService.getEnrollmentById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateEnrollment(@Param('id') id: string, @Body() updateEnrollmentDto: UpdateEnrollmentDto) {
    return this.classesService.updateEnrollment(id, updateEnrollmentDto);
  }
}
