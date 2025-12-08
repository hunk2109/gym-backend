import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Patch, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdateProfileDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
    @Body('phone') phone: string,
  ) {
    return this.authService.register(email, password, firstName, lastName, phone);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(email, password);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any) {
    const userId = req.user.sub;
    return this.authService.logout(userId);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.authService.getProfile(userId);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const userId = req.user.sub;
    return this.authService.updateProfile(userId, updateProfileDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user.sub;
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
