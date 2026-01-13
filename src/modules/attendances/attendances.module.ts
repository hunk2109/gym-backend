import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { Attendance } from '../../entities/attendance.entity';
import { Member } from '../../entities/member.entity';
import { Employee } from '../../entities/employee.entity';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Member, Employee]), MembershipsModule],
  controllers: [AttendancesController],
  providers: [AttendancesService],
  exports: [AttendancesService],
})
export class AttendancesModule {}

