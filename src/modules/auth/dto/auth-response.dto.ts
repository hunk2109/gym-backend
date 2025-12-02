export class UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export class AuthResponseDto {
  token: string;
  user: UserDto;
}
