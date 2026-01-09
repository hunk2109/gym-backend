import { AttendanceStatus } from '../../../entities/attendance.entity';

export class CreateAttendanceDto {
  memberId: string;
  visitDate: string | Date;
  status?: AttendanceStatus;
  rejectionReason?: string;
  notes?: string;
}

export class UpdateAttendanceDto {
  visitDate?: string | Date;
  status?: AttendanceStatus;
  rejectionReason?: string;
  notes?: string;
}
