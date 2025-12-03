import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { UserRolesService } from './user-roles.service';
import { UserRolesController } from './user-roles.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  providers: [UserRolesService],
  controllers: [UserRolesController],
  exports: [UserRolesService],
})
export class UserRolesModule {}
