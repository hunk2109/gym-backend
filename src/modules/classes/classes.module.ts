import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesService } from './classes.service';
import { ClassesController, EnrollmentsController } from './classes.controller';
import { GymClass } from '../../entities/gym-class.entity';
import { ClassEnrollment } from '../../entities/class-enrollment.entity';
import { Member } from '../../entities/member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GymClass, ClassEnrollment, Member])],
  controllers: [ClassesController, EnrollmentsController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
