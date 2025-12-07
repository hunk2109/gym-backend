export class CreateMemberMembershipDto {
  memberId: string;

  membershipId: string;

  startDate: Date;

  endDate: Date;

  amountPaid?: number;

  paymentDate?: Date;

  promotionCode?: string; // Código de promoción/cupón para aplicar descuento

  discountPercentage?: number; // Porcentaje de descuento a aplicar

  discountReason?: string; // Razón del descuento adicional
}
