export class CreateMemberMembershipDto {
  memberId: string;

  membershipId: string;

  startDate: Date;

  endDate: Date;

  amountPaid?: number;

  paymentDate?: Date;
}
