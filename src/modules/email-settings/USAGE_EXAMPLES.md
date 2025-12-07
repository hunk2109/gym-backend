/**
 * EJEMPLO: Cómo usar el módulo de Email Settings
 * 
 * Este archivo contiene ejemplos prácticos de cómo utilizar
 * el módulo de Email Settings en tu aplicación.
 */

// ============================================
// EJEMPLO 1: Configurar Gmail en el backend
// ============================================

// POST /api/email-settings/config
// Content-Type: application/json

{
  "provider": "GOOGLE",
  "email": "tu-gimnasio@gmail.com",
  "password": "app-specific-password-de-google",
  "senderName": "Gym Manager"
}

// Response:
// {
//   "id": "550e8400-e29b-41d4-a716-446655440000",
//   "provider": "GOOGLE",
//   "email": "tu-gimnasio@gmail.com",
//   "senderName": "Gym Manager",
//   "isActive": true,
//   "isVerified": false,
//   "createdAt": "2025-12-07T10:00:00Z"
// }


// ============================================
// EJEMPLO 2: Verificar la configuración
// ============================================

// POST /api/email-settings/config/550e8400-e29b-41d4-a716-446655440000/verify
// Content-Type: application/json

{
  "recipientEmail": "admin@example.com"
}

// Response:
// {
//   "success": true,
//   "message": "Email configuration verified successfully"
// }


// ============================================
// EJEMPLO 3: Crear plantilla de cumpleaños
// ============================================

// POST /api/email-settings/templates
// Content-Type: application/json

{
  "name": "Saludos de Cumpleaños",
  "triggerType": "BIRTHDAY",
  "subject": "🎂 ¡Feliz Cumpleaños {{firstName}}!",
  "htmlContent": `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h1>¡Hola {{firstName}}!</h1>
        <p>En tu día especial, queremos ofrecerte un regalo especial:</p>
        <h2>15% de descuento en tu próxima renovación</h2>
        <p>Código: <strong>{{code}}</strong></p>
        <p>Válido hasta: {{expiryDate}}</p>
        <p>Te esperamos en el gimnasio 💪</p>
      </body>
    </html>
  `,
  "plainTextContent": "Feliz cumpleaños {{firstName}}! Usa el código {{code}} para 15% de descuento.",
  "description": "Se envía automáticamente en el cumpleaños del miembro",
  "includeDiscountCode": true,
  "discountCodePercentage": 15,
  "discountCodeDaysValid": 30,
  "maxUsesPerCode": 1
}

// Response:
// {
//   "id": "660e8400-e29b-41d4-a716-446655440000",
//   "name": "Saludos de Cumpleaños",
//   "triggerType": "BIRTHDAY",
//   "isActive": true,
//   "includeDiscountCode": true,
//   "discountCodePercentage": 15,
//   "availableVariables": ["firstName", "lastName", "email", "membershipType", "discount", "code", "expiryDate"]
// }


// ============================================
// EJEMPLO 4: Crear plantilla de aniversario
// ============================================

// POST /api/email-settings/templates
// Content-Type: application/json

{
  "name": "Aniversario de Membresía",
  "triggerType": "ANNIVERSARY",
  "subject": "🎉 ¡{{years}} años con nosotros!",
  "htmlContent": `
    <html>
      <body>
        <h1>{{firstName}}, felicidades!</h1>
        <p>Hoy se cumplen {{years}} años desde que nos acompañas.</p>
        <p>Como agradecimiento, te ofrecemos 20% en cualquier servicio.</p>
        <p>Código especial: {{code}}</p>
      </body>
    </html>
  `,
  "includeDiscountCode": true,
  "discountCodePercentage": 20,
  "discountCodeDaysValid": 60
}


// ============================================
// EJEMPLO 5: Enviar email de prueba
// ============================================

// POST /api/email-settings/send-test
// Content-Type: application/json

{
  "recipientEmail": "tu-email@example.com",
  "recipientName": "Test User"
}

// Response:
// {
//   "id": "770e8400-e29b-41d4-a716-446655440000",
//   "recipientEmail": "tu-email@example.com",
//   "subject": "Test Email - Gym Manager",
//   "status": "SENT",
//   "sentAt": "2025-12-07T10:30:00Z"
// }


// ============================================
// EJEMPLO 6: Enviar email personalizado
// ============================================

// POST /api/email-settings/send
// Content-Type: application/json

{
  "templateId": "660e8400-e29b-41d4-a716-446655440000",
  "recipientEmail": "juan@example.com",
  "recipientName": "Juan Pérez",
  "memberId": "880e8400-e29b-41d4-a716-446655440000",
  "variables": {
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "membershipType": "Membership Plus",
    "discount": "15%",
    "code": "BDAY-ABC123-162840",
    "expiryDate": "2026-01-07"
  }
}

// Response:
// {
//   "id": "990e8400-e29b-41d4-a716-446655440000",
//   "templateId": "660e8400-e29b-41d4-a716-446655440000",
//   "recipientEmail": "juan@example.com",
//   "recipientName": "Juan Pérez",
//   "subject": "🎂 ¡Feliz Cumpleaños Juan!",
//   "status": "SENT",
//   "sentAt": "2025-12-07T10:35:00Z"
// }


// ============================================
// EJEMPLO 7: Obtener historial de correos
// ============================================

// GET /api/email-settings/logs?limit=10&offset=0

// Response:
// {
//   "logs": [
//     {
//       "id": "990e8400-e29b-41d4-a716-446655440000",
//       "recipientEmail": "juan@example.com",
//       "subject": "🎂 ¡Feliz Cumpleaños Juan!",
//       "status": "SENT",
//       "sentAt": "2025-12-07T10:35:00Z",
//       "createdAt": "2025-12-07T10:35:00Z"
//     }
//   ],
//   "total": 150
// }


// ============================================
// EJEMPLO 8: Schedulers automáticos
// ============================================

// Los siguientes procesos se ejecutan automáticamente:

// 1. CADA DÍA A LAS 8:00 AM - Cumpleaños
//    - Busca miembros con cumpleaños hoy
//    - Envía correo con descuento automático
//    - Registra en email_logs

// 2. CADA DÍA A LAS 9:00 AM - Aniversarios
//    - Busca aniversarios de membresía
//    - Envía correo de celebración
//    - Genera código promocional


// ============================================
// EJEMPLO 9: Flujo completo en TypeScript
// ============================================

// En un servicio de tu aplicación:

import { Injectable } from '@nestjs/common';
import { EmailService } from './modules/email-settings/email.service';
import { SendEmailDto } from './modules/email-settings/dto';

@Injectable()
export class MemberNotificationService {
  constructor(private emailService: EmailService) {}

  async notifyMemberBirthday(memberId: string, memberData: any) {
    const emailDto: SendEmailDto = {
      templateId: 'your-birthday-template-id',
      recipientEmail: memberData.email,
      recipientName: `${memberData.firstName} ${memberData.lastName}`,
      memberId,
      variables: {
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        email: memberData.email,
        membershipType: memberData.membershipType,
        discount: '15%',
        code: this.generateCode(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      },
    };

    return this.emailService.sendEmail(emailDto);
  }

  private generateCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BDAY-${random}-${timestamp}`;
  }
}


// ============================================
// NOTAS IMPORTANTES
// ============================================

// 1. Gmail:
//    - Usar "App Password" (no contraseña de cuenta)
//    - Activar 2FA primero
//    - No usar contraseña de cuenta directamente

// 2. Seguridad:
//    - Guardar credenciales en variables de entorno
//    - No commitear contraseñas en código
//    - Usar HTTPS para todos los endpoints

// 3. Testing:
//    - Enviar test email antes de producción
//    - Verificar que la configuración sea correcta
//    - Revisar email_logs para diagnosticar problemas

// 4. Variables en plantillas:
//    - {{firstName}} - Nombre del miembro
//    - {{lastName}} - Apellido del miembro
//    - {{email}} - Email del miembro
//    - {{membershipType}} - Tipo de membresía
//    - {{discount}} - Porcentaje de descuento
//    - {{code}} - Código promocional
//    - {{expiryDate}} - Fecha de expiración
//    - {{years}} - Años de membresía

// 5. Statuses:
//    - PENDING: Pendiente de envío
//    - SENT: Enviado exitosamente
//    - FAILED: Error al enviar
//    - BOUNCED: Email rebotado

