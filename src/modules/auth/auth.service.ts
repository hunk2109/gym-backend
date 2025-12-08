import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../../entities/user.entity';
import { EmailService } from '../email-settings/email.service';
import { GymSettingsService } from '../gym-settings/gym-settings.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private gymSettingsService: GymSettingsService,
  ) {}

  async register(email: string, password: string, firstName: string, lastName: string, phone: string) {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      id: uuidv4(),
      email,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      phone,
      role: UserRole.CLIENTE, // Por defecto, todo nuevo usuario es CLIENTE
      isActive: true,
    });

    await this.userRepository.save(user);
    return this.generateToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async logout(userId: string) {
    // Token invalidation can be handled by frontend (clearing SharedPreferences)
    // Or implement a token blacklist in Redis/DB if needed
    return {
      message: 'Logout successful',
      success: true,
    };
  }

  async updateProfile(userId: string, updateProfileDto: any) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Si intenta cambiar email, verificar que no esté en uso
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
      user.email = updateProfileDto.email;
    }

    if (updateProfileDto.firstName) {
      user.firstName = updateProfileDto.firstName;
    }
    if (updateProfileDto.lastName) {
      user.lastName = updateProfileDto.lastName;
    }
    if (updateProfileDto.phone) {
      user.phone = updateProfileDto.phone;
    }

    await this.userRepository.save(user);
    return this.generateToken(user);
  }

  async changePassword(userId: string, changePasswordDto: any) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verificar que las nuevas contraseñas coincidan
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash de la nueva contraseña
    user.passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userRepository.save(user);

    return {
      message: 'Password changed successfully',
      success: true,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
    };
  }

  async forgotPassword(forgotPasswordDto: any) {
    const user = await this.userRepository.findOne({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return {
        message: 'Si el email existe, recibirás una contraseña temporal',
        success: true,
      };
    }

    // Generar una contraseña temporal de 8 caracteres
    const tempPassword = this.generateTemporaryPassword();
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    // Actualizar el hash de contraseña con la temporal
    user.passwordHash = hashedTempPassword;
    await this.userRepository.save(user);

    // Enviar email con la contraseña temporal
    try {
      // Obtener nombre del gimnasio
      let gymName = 'GYM Manager';
      try {
        const gymSettings = await this.gymSettingsService.getSettings();
        if (gymSettings?.gymName) {
          gymName = gymSettings.gymName;
        }
      } catch (gymError) {
        this.logger.warn(`Failed to get gym settings: ${gymError.message}`);
      }

      await this.emailService.sendEmail({
        recipientEmail: user.email,
        recipientName: `${user.firstName} ${user.lastName}`,
        subject: `Recupera tu contraseña - ${gymName}`,
        htmlContent: this.generatePasswordResetEmailHTML(
          user.firstName,
          tempPassword,
          gymName,
        ),
        plainTextContent: `Hola ${user.firstName},\n\nTu contraseña temporal es: ${tempPassword}\n\nPor favor, cámbiala en la pantalla de recuperación de contraseña.`,
      });

      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${user.email}`, error);
      // No lanzamos error para mantener la seguridad (no revelar que falló el envío)
    }

    return {
      message: 'Se envió una contraseña temporal a tu email',
      success: true,
    };
  }

  private generatePasswordResetEmailHTML(firstName: string, tempPassword: string, gymName: string = 'GYM Manager'): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
            .password-box { background-color: #fff; border: 2px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 5px; font-size: 18px; font-weight: bold; text-align: center; letter-spacing: 2px; }
            .footer { color: #666; font-size: 12px; margin-top: 20px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 10px; border-radius: 3px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🏋️ ${gymName}</h2>
              <p>Recuperación de Contraseña</p>
            </div>
            <div class="content">
              <p>Hola <strong>${firstName}</strong>,</p>
              <p>Recibimos una solicitud para restablecer tu contraseña.</p>
              
              <p>Tu contraseña temporal es:</p>
              <div class="password-box">${tempPassword}</div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> Esta contraseña es temporal. Úsala para iniciar sesión y luego cámbiala por una contraseña segura en tu perfil.
              </div>
              
              <p><strong>Pasos a seguir:</strong></p>
              <ol>
                <li>Abre la aplicación GYM Manager</li>
                <li>Ve a "¿Olvidaste tu contraseña?"</li>
                <li>Ingresa tu email: <strong>${firstName}</strong></li>
                <li>Ingresa la contraseña temporal arriba</li>
                <li>Crea una nueva contraseña segura</li>
              </ol>
              
              <p>Si no solicitaste esta recuperación, ignora este correo.</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${gymName}. Todos los derechos reservados.</p>
                <p>Este es un correo automático, por favor no respondas.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async resetPassword(resetPasswordDto: any) {
    const user = await this.userRepository.findOne({
      where: { email: resetPasswordDto.email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verificar que las nuevas contraseñas coincidan
    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Verificar que la contraseña temporal sea correcta
    const isTempPasswordValid = await bcrypt.compare(
      resetPasswordDto.tempPassword,
      user.passwordHash,
    );

    if (!isTempPasswordValid) {
      throw new BadRequestException('Invalid temporary password');
    }

    // Verificar que la nueva contraseña sea diferente a la temporal
    if (resetPasswordDto.tempPassword === resetPasswordDto.newPassword) {
      throw new BadRequestException('New password must be different from temporary password');
    }

    // Hash de la nueva contraseña
    user.passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.userRepository.save(user);

    return {
      message: 'Password reset successfully',
      success: true,
    };
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private generateToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isActive: user.isActive,
      },
    };
  }
}
