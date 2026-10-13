import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateMemberMembershipDto {
  @IsString()
  memberId: string;

  @IsString()
  membershipId: string;

  @IsDateString()
  startDate: string | Date;

  @IsDateString()
  @IsOptional()
  endDate?: string | Date;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  promotionCode?: string; // Código de promoción/cupón para aplicar descuento

  @IsNumber()
  @IsOptional()
  discountPercentage?: number; // Porcentaje de descuento a aplicar

  @IsString()
  @IsOptional()
  discountReason?: string; // Razón del descuento adicional
}
