import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Member } from '../../entities/member.entity';
import { UserRolesService } from './user-roles.service';
import { UserRolesController } from './user-roles.controller';
import { AuthModule } from '../auth/auth.module';
import { EmployeeModule } from '../employees/employee.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Member]), AuthModule, forwardRef(() => EmployeeModule), SyncModule],
  providers: [UserRolesService],
  controllers: [UserRolesController],
  exports: [UserRolesService],
})
export class UserRolesModule {}
