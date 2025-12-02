import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
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

import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { SalesModule } from './modules/sales/sales.module';
import { GymSettingsModule } from './modules/gym-settings/gym-settings.module';
import { EmployeeModule } from './modules/employees/employee.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MembersModule } from './modules/members/members.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { ClassesModule } from './modules/classes/classes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';

import { ErrorHandlingInterceptor, ResponseInterceptor } from './common/interceptors';
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
      entities: [User, Product, Sale, SaleItem, GymSettings, Employee, Member, Membership, MemberMembership, GymClass, ClassEnrollment, Payment],
      synchronize: true,
      logging: false,
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    ProductsModule,
    SalesModule,
    GymSettingsModule,
    EmployeeModule,
    DashboardModule,
    MembersModule,
    MembershipsModule,
    ClassesModule,
    PaymentsModule,
    ReportsModule,
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}