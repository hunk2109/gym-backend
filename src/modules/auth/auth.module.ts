import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { User } from '../../entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsService } from './services/permissions.service';
import { ResponseFilterService } from './services/response-filter.service';
import { EmailSettingsModule } from '../email-settings/email-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'muerete66',
      signOptions: { expiresIn: '24h' },
    }),
    EmailSettingsModule,
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, PermissionsService, ResponseFilterService],
  controllers: [AuthController],
  exports: [RolesGuard, PermissionsService, ResponseFilterService],
})
export class AuthModule {}
