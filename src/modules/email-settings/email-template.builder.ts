/**
 * Generador de plantillas HTML profesionales para emails
 * Colores principales: #1976D2 (azul principal), #43A047 (verde), #F57C00 (naranja)
 */

export interface GymConfig {
  gymName: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
}

export class EmailTemplateBuilder {
  static readonly PRIMARY_COLOR = '#1976D2';
  static readonly SUCCESS_COLOR = '#43A047';
  static readonly WARNING_COLOR = '#F57C00';
  static readonly ERROR_COLOR = '#E53935';
  static readonly LIGHT_GRAY = '#F5F5F5';
  static readonly DARK_TEXT = '#333333';
  static readonly LIGHT_TEXT = '#666666';

  /**
   * Envolvente base para todos los emails
   */
  static baseTemplate(content: string, gymConfig?: GymConfig): string {
    const gymName = gymConfig?.gymName || 'Gym Manager';
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${gymName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8f9fa;
            color: ${this.DARK_TEXT};
            line-height: 1.6;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, ${this.PRIMARY_COLOR} 0%, #1565C0 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          .header p {
            font-size: 14px;
            opacity: 0.95;
            font-weight: 300;
          }
          .content {
            padding: 40px 30px;
            background-color: #ffffff;
          }
          .content p {
            margin-bottom: 16px;
            font-size: 15px;
            color: ${this.DARK_TEXT};
            line-height: 1.8;
          }
          .content h2 {
            font-size: 20px;
            color: ${this.PRIMARY_COLOR};
            margin-bottom: 16px;
            margin-top: 24px;
            font-weight: 600;
          }
          .content h3 {
            font-size: 16px;
            color: ${this.DARK_TEXT};
            margin-bottom: 12px;
            margin-top: 16px;
            font-weight: 600;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, ${this.PRIMARY_COLOR} 0%, #1565C0 100%);
            color: white;
            padding: 14px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            margin: 24px 0;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
          }
          .cta-button.success {
            background: linear-gradient(135deg, ${this.SUCCESS_COLOR} 0%, #388E3C 100%);
            box-shadow: 0 2px 8px rgba(67, 160, 71, 0.3);
          }
          .cta-button.success:hover {
            box-shadow: 0 4px 12px rgba(67, 160, 71, 0.4);
          }
          .cta-button.warning {
            background: linear-gradient(135deg, ${this.WARNING_COLOR} 0%, #E65100 100%);
            box-shadow: 0 2px 8px rgba(245, 124, 0, 0.3);
          }
          .cta-button.warning:hover {
            box-shadow: 0 4px 12px rgba(245, 124, 0, 0.4);
          }
          .info-box {
            background-color: ${this.LIGHT_GRAY};
            border-left: 4px solid ${this.PRIMARY_COLOR};
            padding: 16px 20px;
            border-radius: 4px;
            margin: 20px 0;
            font-size: 14px;
            color: ${this.LIGHT_TEXT};
          }
          .info-box.success {
            border-left-color: ${this.SUCCESS_COLOR};
            background-color: #f1f8f6;
            color: #2e7d32;
          }
          .info-box.warning {
            border-left-color: ${this.WARNING_COLOR};
            background-color: #fff8f1;
            color: #e65100;
          }
          .info-box.error {
            border-left-color: ${this.ERROR_COLOR};
            background-color: #ffebee;
            color: #c62828;
          }
          .footer {
            background-color: ${this.LIGHT_GRAY};
            padding: 30px 20px;
            text-align: center;
            font-size: 12px;
            color: ${this.LIGHT_TEXT};
            border-radius: 0 0 8px 8px;
          }
          .footer p {
            margin-bottom: 8px;
          }
          .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 30px 0;
          }
          .feature-grid {
            display: table;
            width: 100%;
            margin: 20px 0;
          }
          .feature-item {
            display: table-cell;
            text-align: center;
            padding: 20px;
            vertical-align: top;
          }
          .feature-icon {
            font-size: 32px;
            margin-bottom: 10px;
          }
          .feature-item h4 {
            font-size: 14px;
            font-weight: 600;
            color: ${this.PRIMARY_COLOR};
            margin-bottom: 8px;
          }
          .feature-item p {
            font-size: 12px;
            color: ${this.LIGHT_TEXT};
            margin: 0;
          }
          .badge {
            display: inline-block;
            background-color: ${this.PRIMARY_COLOR};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
            margin-bottom: 8px;
          }
          .badge.success {
            background-color: ${this.SUCCESS_COLOR};
          }
          .badge.warning {
            background-color: ${this.WARNING_COLOR};
          }
          .highlight {
            color: ${this.PRIMARY_COLOR};
            font-weight: 600;
          }
          @media (max-width: 600px) {
            .email-container { width: 100% !important; }
            .content { padding: 24px 16px; }
            .header { padding: 30px 16px; }
            .footer { padding: 20px 16px; }
            .header h1 { font-size: 24px; }
            .feature-item { display: block; padding: 16px 0; border-bottom: 1px solid ${this.LIGHT_GRAY}; }
          }
        </style>
      </head>
      <body>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table width="100%" style="max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
                ${content}
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Plantilla para emails de bienvenida
   */
  static welcomeEmail(memberName: string, message: string, gymConfig?: GymConfig): string {
    const gymName = gymConfig?.gymName || 'Gym Manager';
    return this.baseTemplate(`
      <tr>
        <td class="header">
          <h1>¡Bienvenido a ${gymName}!</h1>
          <p>Nos alegra tenerte con nosotros</p>
        </td>
      </tr>
      <tr>
        <td class="content">
          <p>Hola <span class="highlight">${memberName}</span>,</p>
          <p>${message}</p>
          <div class="feature-grid">
            <div class="feature-item">
              <div class="feature-icon">💪</div>
              <h4>Entrenamientos</h4>
              <p>Acceso a todas las clases</p>
            </div>
            <div class="feature-item">
              <div class="feature-icon">📱</div>
              <h4>App Móvil</h4>
              <p>Gestiona tu membresía</p>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🎯</div>
              <h4>Objetivos</h4>
              <p>Alcanza tus metas</p>
            </div>
          </div>
          <a href="#" class="cta-button success">Explorar Mi Perfil</a>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p>© 2025 ${gymConfig?.gymName || 'Gym Manager'}. Todos los derechos reservados.</p>
          ${gymConfig?.phone ? `<p style="font-size: 11px; margin: 8px 0;">📞 ${gymConfig.phone}</p>` : ''}
          ${gymConfig?.email ? `<p style="font-size: 11px; margin: 8px 0;">📧 ${gymConfig.email}</p>` : ''}
          <p style="font-size: 11px; margin-top: 12px;">Este es un email automático. Por favor no respondas.</p>
        </td>
      </tr>
    `, gymConfig);
  }

  /**
   * Plantilla para recordatorios de pago
   */
  static paymentReminderEmail(memberName: string, type: string, message: string, gymConfig?: GymConfig): string {
    const headerText = {
      'DUE_DATE': '⏰ Tu membresía vence hoy',
      'BEFORE_DUE': '📅 Tu membresía vence pronto',
      'OVERDUE': '⚠️ Tu membresía ha vencido',
    }[type] || 'Recordatorio de Pago';

    const buttonClass = type === 'OVERDUE' ? 'warning' : 'success';
    const infoClass = type === 'OVERDUE' ? 'error' : 'warning';
    const gymName = gymConfig?.gymName || 'Gym Manager';

    return this.baseTemplate(`
      <tr>
        <td class="header">
          <h1>${headerText}</h1>
          <p>De parte de ${gymName}</p>
        </td>
      </tr>
      <tr>
        <td class="content">
          <p>Hola <span class="highlight">${memberName}</span>,</p>
          <p>${message}</p>
          <div class="info-box ${infoClass}">
            <strong>Acción requerida:</strong> Actualiza tu membresía para continuar disfrutando de nuestros servicios sin interrupciones.
          </div>
          <a href="#" class="cta-button ${buttonClass}">Renovar Membresía Ahora</a>
          <div class="divider"></div>
          <h3>¿Necesitas ayuda?</h3>
          <p>Si tienes alguna pregunta sobre tu membresía, por favor contacta con nuestro equipo de soporte.</p>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p>© 2025 ${gymConfig?.gymName || 'Gym Manager'}. Todos los derechos reservados.</p>
          ${gymConfig?.phone ? `<p style="font-size: 11px; margin: 8px 0;">📞 ${gymConfig.phone}</p>` : ''}
          ${gymConfig?.email ? `<p style="font-size: 11px; margin: 8px 0;">📧 ${gymConfig.email}</p>` : ''}
          <p style="font-size: 11px; margin-top: 12px;">Recibiste este email porque eres miembro de nuestro gimnasio.</p>
        </td>
      </tr>
    `, gymConfig);
  }

  /**
   * Plantilla para ofertas y promociones
   */
  static promotionEmail(title: string, message: string, discount: number, gymConfig?: GymConfig): string {
    const gymName = gymConfig?.gymName || 'Gym Manager';
    return this.baseTemplate(`
      <tr>
        <td class="header">
          <h1>🎉 Oferta Especial</h1>
          <p>De ${gymName} para ti</p>
        </td>
      </tr>
      <tr>
        <td class="content">
          <p>${message}</p>
          <div style="background: linear-gradient(135deg, ${this.PRIMARY_COLOR}15 0%, ${this.SUCCESS_COLOR}15 100%); padding: 24px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <div style="font-size: 48px; font-weight: 700; color: ${this.SUCCESS_COLOR}; margin-bottom: 8px;">
              ${discount}%
            </div>
            <div style="font-size: 16px; font-weight: 600; color: ${this.DARK_TEXT};">
              ${title}
            </div>
            <div style="font-size: 12px; color: ${this.LIGHT_TEXT}; margin-top: 8px;">
              Válido por tiempo limitado
            </div>
          </div>
          <a href="#" class="cta-button success">Aprovechar Oferta</a>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p>© 2025 ${gymConfig?.gymName || 'Gym Manager'}. Todos los derechos reservados.</p>
          ${gymConfig?.phone ? `<p style="font-size: 11px; margin: 8px 0;">📞 ${gymConfig.phone}</p>` : ''}
          ${gymConfig?.email ? `<p style="font-size: 11px; margin: 8px 0;">📧 ${gymConfig.email}</p>` : ''}
        </td>
      </tr>
    `, gymConfig);
  }

  /**
   * Plantilla genérica personalizable
   */
  static customTemplate(title: string, message: string, buttonText: string = 'Ir Ahora', gymConfig?: GymConfig): string {
    const gymName = gymConfig?.gymName || 'Gym Manager';
    return this.baseTemplate(`
      <tr>
        <td class="header">
          <h1>${title}</h1>
          <p>${gymName}</p>
        </td>
      </tr>
      <tr>
        <td class="content">
          <p>${message}</p>
          <a href="#" class="cta-button">${buttonText}</a>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p>© 2025 ${gymConfig?.gymName || 'Gym Manager'}. Todos los derechos reservados.</p>
          ${gymConfig?.phone ? `<p style="font-size: 11px; margin: 8px 0;">📞 ${gymConfig.phone}</p>` : ''}
          ${gymConfig?.email ? `<p style="font-size: 11px; margin: 8px 0;">📧 ${gymConfig.email}</p>` : ''}
        </td>
      </tr>
    `, gymConfig);
  }
}
