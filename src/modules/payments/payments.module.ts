import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../../entities/payment.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuthModule } from '../auth/auth.module';
import { EmailSettingsModule } from '../email-settings/email-settings.module';
import { PaymentSubscriber } from '../../entities/payment.subscriber';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Member, MemberMembership]),
    AuthModule,
    EmailSettingsModule,
    PromotionsModule,
  ],
  providers: [PaymentsService, PaymentSubscriber],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
