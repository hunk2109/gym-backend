export class CreateAttendanceDto {
  memberId: string;
  visitDate: string | Date;
  notes?: string;
}

export class UpdateAttendanceDto {
  visitDate?: string | Date;
  notes?: string;
}
