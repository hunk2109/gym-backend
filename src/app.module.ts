import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { Equipment } from './entities/equipment.entity';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { GymSettings } from './entities/gym-settings.entity';
import { Employee } from './entities/employee.entity';
import { Member } from './entities/member.entity';
import { Membership } from './entities/membership.entity';
import { MemberMembership } from './entities/member-membership.entity';
import { GymClass } from './entities/gym-class.entity';
import { ClassEnrollment } from './entities/class-enrollment.entity';
import { Payment } from './entities/payment.entity';
import { GroupMembership } from './entities/group-membership.entity';
import { GroupMembershipUser } from './entities/group-membership-user.entity';
import { Payroll } from './entities/payroll.entity';

import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { SalesModule } from './modules/sales/sales.module';
import { GymSettingsModule } from './modules/gym-settings/gym-settings.module';
import { EmployeeModule } from './modules/employees/employee.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MembersModule } from './modules/members/members.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { ClassesModule } from './modules/classes/classes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UserRolesModule } from './modules/user-roles/user-roles.module';
import { GroupMembershipsModule } from './modules/group-memberships/group-memberships.module';
import { PayrollModule } from './modules/payroll/payroll.module';

import { ErrorHandlingInterceptor, ResponseInterceptor } from './common/interceptors';
import { ResponseFilterInterceptor } from './modules/auth/interceptors/response-filter.interceptor';
import { LoggerMiddleware } from './common/middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'gym_manager',
      entities: [User, Product, Equipment, Sale, SaleItem, GymSettings, Employee, Member, Membership, MemberMembership, GymClass, ClassEnrollment, Payment, GroupMembership, GroupMembershipUser, Payroll],
      synchronize: true,
      logging: false,
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'muerete66',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    ProductsModule,
    EquipmentModule,
    SalesModule,
    GymSettingsModule,
    EmployeeModule,
    DashboardModule,
    MembersModule,
    MembershipsModule,
    ClassesModule,
    PaymentsModule,
    ReportsModule,
    UserRolesModule,
    GroupMembershipsModule,
    PayrollModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorHandlingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseFilterInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}