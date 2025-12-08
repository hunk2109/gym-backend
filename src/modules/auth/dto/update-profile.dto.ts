export class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export class ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export class ForgotPasswordDto {
  email: string;
}

export class ResetPasswordDto {
  email: string;
  tempPassword: string;
  newPassword: string;
  confirmPassword: string;
}
