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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // Ver todas las clases
  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getAllClasses(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.classesService.getAllClasses(parseInt(page), parseInt(limit));
  }

  // Ver clases próximas
  @Get('upcoming')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getUpcomingClasses(@Query('daysAhead') daysAhead: string = '7') {
    return this.classesService.getUpcomingClasses(parseInt(daysAhead));
  }

  // Ver clases por nivel
  @Get('level/:level')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getClassesByLevel(
    @Param('level') level: ClassLevel,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.classesService.getClassesByLevel(level, parseInt(page), parseInt(limit));
  }

  // Ver clases por entrenador
  @Get('trainer/:trainerId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getClassesByTrainer(
    @Param('trainerId') trainerId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.classesService.getClassesByTrainer(trainerId, parseInt(page), parseInt(limit));
  }

  // Ver estadísticas de clase - Solo ADMIN/ENCARGADO/EMPLEADO_ENTRENADOR
  @Get('stats/:classId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  @HttpCode(HttpStatus.OK)
  async getClassStatistics(@Param('classId') classId: string) {
    return this.classesService.getClassStatistics(classId);
  }

  // Ver clase por ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getClassById(@Param('id') id: string) {
    return this.classesService.getClassById(id);
  }

  // Crear clase - ADMIN/ENCARGADO/EMPLEADO_ENTRENADOR
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  @HttpCode(HttpStatus.CREATED)
  async createClass(@Body() createClassDto: CreateClassDto) {
    return this.classesService.createClass(createClassDto);
  }

  // Editar clase - ADMIN/ENCARGADO/EMPLEADO_ENTRENADOR (solo propias)
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  @HttpCode(HttpStatus.OK)
  async updateClass(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.updateClass(id, updateClassDto);
  }

  // Eliminar clase - Solo ADMIN/ENCARGADO
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClass(@Param('id') id: string) {
    return this.classesService.deleteClass(id);
  }

  // Inscribirse a clase
  @Post(':classId/enroll')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  @HttpCode(HttpStatus.CREATED)
  async enrollMember(@Param('classId') classId: string, @Body() enrollMemberDto: EnrollMemberDto) {
    return this.classesService.enrollMember(classId, enrollMemberDto);
  }

  // Desinscribirse de clase
  @Delete(':classId/unenroll/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unenrollMember(@Param('classId') classId: string, @Param('memberId') memberId: string) {
    return this.classesService.unenrollMember(classId, memberId);
  }

  // Ver inscritos en clase - ADMIN/ENCARGADO/EMPLEADO_ENTRENADOR
  @Get(':classId/enrollments')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  @HttpCode(HttpStatus.OK)
  async getClassEnrollments(
    @Param('classId') classId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.classesService.getClassEnrollments(classId, parseInt(page), parseInt(limit));
  }
}

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly classesService: ClassesService) {}

  // Ver inscripciones del miembro
  @Get('member/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getMemberEnrollments(
    @Param('memberId') memberId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.classesService.getMemberEnrollments(memberId, parseInt(page), parseInt(limit));
  }

  // Ver inscripción por ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getEnrollmentById(@Param('id') id: string) {
    return this.classesService.getEnrollmentById(id);
  }

  // Actualizar inscripción - Solo ADMIN/ENCARGADO/EMPLEADO_ENTRENADOR
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  @HttpCode(HttpStatus.OK)
  async updateEnrollment(@Param('id') id: string, @Body() updateEnrollmentDto: UpdateEnrollmentDto) {
    return this.classesService.updateEnrollment(id, updateEnrollmentDto);
  }
}
