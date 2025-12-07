# Email Settings Module - Documentación de API

## Descripción General
El módulo de Email Settings proporciona un sistema completo para gestionar configuraciones de correo electrónico, plantillas de email, y envíos automáticos de correos electrónicos para eventos como cumpleaños y aniversarios de membresía.

### Características Principales
- **Múltiples Proveedores**: Google, Microsoft, SMTP personalizado
- **Gestión de Plantillas**: Crear, editar, y eliminar plantillas de email
- **Envío Automático**: Cumpleaños (8:00 AM) y Aniversarios (9:00 AM)
- **Variables Dinámicas**: {{firstName}}, {{lastName}}, {{email}}, {{discount}}, etc.
- **Códigos de Descuento**: Generación automática para campañas
- **Historial Completo**: Log de todos los correos enviados/fallidos

---

## Endpoints de Configuración de Email

### 1. Crear Configuración de Email
**POST** `/api/email-settings/config`

Crea una nueva configuración de correo electrónico.

#### Request Body
```json
{
  "provider": "GOOGLE",
  "email": "usuario@gmail.com",
  "password": "app-specific-password",
  "clientId": "opcional-para-oauth",
  "clientSecret": "opcional-para-oauth",
  "refreshToken": "opcional-para-oauth",
  "senderName": "Gym Manager"
}
```

#### Providers Soportados
- **GOOGLE**: Requiere `email` y `password` (app-specific password)
- **MICROSOFT**: Requiere `email` y `password`
- **SMTP**: Requiere `smtpHost`, `smtpPort`, `smtpUser`, `smtpPassword`

#### Response (201 Created)
```json
{
  "id": "uuid-config-id",
  "provider": "GOOGLE",
  "email": "usuario@gmail.com",
  "senderName": "Gym Manager",
  "isActive": true,
  "isVerified": false,
  "createdAt": "2025-12-07T10:00:00Z",
  "updatedAt": "2025-12-07T10:00:00Z"
}
```

---

### 2. Obtener Todas las Configuraciones
**GET** `/api/email-settings/config`

Retorna todas las configuraciones de correo creadas.

#### Response (200 OK)
```json
[
  {
    "id": "uuid-config-id",
    "provider": "GOOGLE",
    "email": "usuario@gmail.com",
    "senderName": "Gym Manager",
    "isActive": true,
    "isVerified": true,
    "createdAt": "2025-12-07T10:00:00Z"
  }
]
```

---

### 3. Obtener Configuración por ID
**GET** `/api/email-settings/config/:id`

Retorna una configuración específica.

#### Parameters
- `id` (path): UUID de la configuración

#### Response (200 OK)
```json
{
  "id": "uuid-config-id",
  "provider": "GOOGLE",
  "email": "usuario@gmail.com",
  "senderName": "Gym Manager",
  "isActive": true,
  "isVerified": true
}
```

---

### 4. Actualizar Configuración
**PUT** `/api/email-settings/config/:id`

Actualiza una configuración existente.

#### Parameters
- `id` (path): UUID de la configuración

#### Request Body (todos opcionales)
```json
{
  "email": "nuevo-email@gmail.com",
  "password": "nueva-contraseña",
  "senderName": "Nuevo Nombre",
  "isActive": true
}
```

#### Response (200 OK)
```json
{
  "id": "uuid-config-id",
  "email": "nuevo-email@gmail.com",
  "senderName": "Nuevo Nombre",
  "isActive": true
}
```

---

### 5. Eliminar Configuración
**DELETE** `/api/email-settings/config/:id`

Elimina una configuración de correo.

⚠️ **Nota**: No se puede eliminar una configuración activa.

#### Parameters
- `id` (path): UUID de la configuración

#### Response (204 No Content)

---

### 6. Verificar Configuración
**POST** `/api/email-settings/config/:id/verify`

Verifica que la configuración de correo sea válida.

#### Parameters
- `id` (path): UUID de la configuración

#### Request Body
```json
{
  "recipientEmail": "correo-prueba@example.com"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Email configuration verified successfully"
}
```

---

### 7. Establecer Configuración Activa
**POST** `/api/email-settings/config/:id/set-active`

Establece una configuración como activa (desactiva las demás).

#### Parameters
- `id` (path): UUID de la configuración

#### Response (200 OK)
```json
{
  "id": "uuid-config-id",
  "provider": "GOOGLE",
  "isActive": true,
  "isVerified": true
}
```

---

## Endpoints de Plantillas de Email

### 8. Crear Plantilla de Email
**POST** `/api/email-settings/templates`

Crea una nueva plantilla de email.

#### Request Body
```json
{
  "name": "Birthday Greeting",
  "triggerType": "BIRTHDAY",
  "subject": "¡Feliz Cumpleaños {{firstName}}!",
  "htmlContent": "<h1>Hola {{firstName}}</h1><p>Esperamos que tengas un excelente día.</p>",
  "plainTextContent": "Hola {{firstName}}, esperamos que tengas un excelente día.",
  "description": "Plantilla para enviar saludos de cumpleaños",
  "includeDiscountCode": true,
  "discountCodePercentage": 15,
  "discountCodeDaysValid": 30,
  "maxUsesPerCode": 1
}
```

#### Tipos de Trigger (triggerType)
- `BIRTHDAY`: Se envía automáticamente en el cumpleaños del miembro
- `ANNIVERSARY`: Se envía automáticamente en el aniversario de la membresía
- `PROMOTION`: Se envía manualmente para promociones
- `MANUAL`: Se envía bajo demanda

#### Variables Disponibles
- `{{firstName}}`: Nombre del miembro
- `{{lastName}}`: Apellido del miembro
- `{{email}}`: Email del miembro
- `{{membershipType}}`: Tipo de membresía
- `{{discount}}`: Porcentaje de descuento (si aplica)
- `{{code}}`: Código promocional (si aplica)
- `{{expiryDate}}`: Fecha de expiración (si aplica)

#### Response (201 Created)
```json
{
  "id": "uuid-template-id",
  "name": "Birthday Greeting",
  "triggerType": "BIRTHDAY",
  "subject": "¡Feliz Cumpleaños {{firstName}}!",
  "isActive": true,
  "includeDiscountCode": true,
  "discountCodePercentage": 15,
  "availableVariables": ["firstName", "lastName", "email", "membershipType", "discount", "expiryDate", "code"]
}
```

---

### 9. Obtener Todas las Plantillas
**GET** `/api/email-settings/templates`

Retorna todas las plantillas de email.

#### Response (200 OK)
```json
[
  {
    "id": "uuid-template-id",
    "name": "Birthday Greeting",
    "triggerType": "BIRTHDAY",
    "subject": "¡Feliz Cumpleaños {{firstName}}!",
    "isActive": true,
    "includeDiscountCode": true,
    "createdAt": "2025-12-07T10:00:00Z"
  }
]
```

---

### 10. Obtener Plantillas Activas
**GET** `/api/email-settings/templates/active`

Retorna solo las plantillas activas.

#### Response (200 OK)
```json
[
  {
    "id": "uuid-template-id",
    "name": "Birthday Greeting",
    "triggerType": "BIRTHDAY",
    "isActive": true
  }
]
```

---

### 11. Obtener Plantilla por ID
**GET** `/api/email-settings/templates/:id`

Retorna una plantilla específica.

#### Parameters
- `id` (path): UUID de la plantilla

#### Response (200 OK)
```json
{
  "id": "uuid-template-id",
  "name": "Birthday Greeting",
  "triggerType": "BIRTHDAY",
  "subject": "¡Feliz Cumpleaños {{firstName}}!",
  "htmlContent": "<h1>Hola {{firstName}}</h1>...",
  "isActive": true
}
```

---

### 12. Actualizar Plantilla
**PUT** `/api/email-settings/templates/:id`

Actualiza una plantilla existente.

#### Parameters
- `id` (path): UUID de la plantilla

#### Request Body (todos opcionales)
```json
{
  "subject": "Nuevo Asunto",
  "htmlContent": "<h1>Nuevo contenido</h1>",
  "includeDiscountCode": true,
  "discountCodePercentage": 20,
  "isActive": true
}
```

#### Response (200 OK)
```json
{
  "id": "uuid-template-id",
  "subject": "Nuevo Asunto",
  "includeDiscountCode": true,
  "discountCodePercentage": 20
}
```

---

### 13. Eliminar Plantilla
**DELETE** `/api/email-settings/templates/:id`

Elimina una plantilla de email.

#### Parameters
- `id` (path): UUID de la plantilla

#### Response (204 No Content)

---

## Endpoints de Envío de Email

### 14. Enviar Email
**POST** `/api/email-settings/send`

Envía un correo electrónico inmediatamente.

#### Request Body
```json
{
  "recipientEmail": "miembro@example.com",
  "recipientName": "Juan Pérez",
  "templateId": "uuid-template-id",
  "memberId": "uuid-member-id",
  "variables": {
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "discount": "15%",
    "code": "PROMO-ABC123"
  }
}
```

**Nota**: Si se proporciona `templateId`, se usa el contenido de la plantilla. Si se proporciona `subject` y `htmlContent` directamente, se usan esos valores.

#### Response (201 Created)
```json
{
  "id": "uuid-log-id",
  "recipientEmail": "miembro@example.com",
  "recipientName": "Juan Pérez",
  "subject": "¡Feliz Cumpleaños Juan!",
  "status": "SENT",
  "messageId": "message-id-from-provider",
  "sentAt": "2025-12-07T10:30:00Z",
  "createdAt": "2025-12-07T10:30:00Z"
}
```

---

### 15. Enviar Email de Prueba
**POST** `/api/email-settings/send-test`

Envía un correo de prueba para verificar la configuración.

#### Request Body
```json
{
  "recipientEmail": "prueba@example.com",
  "recipientName": "Test User"
}
```

#### Response (201 Created)
```json
{
  "id": "uuid-log-id",
  "recipientEmail": "prueba@example.com",
  "subject": "Test Email - Gym Manager",
  "status": "SENT",
  "sentAt": "2025-12-07T10:30:00Z"
}
```

---

## Endpoints de Historial

### 16. Obtener Historial de Correos
**GET** `/api/email-settings/logs`

Retorna el historial de correos enviados y fallidos.

#### Query Parameters
- `limit` (optional): Número de registros a retornar (default: 50)
- `offset` (optional): Número de registros a saltar para paginación (default: 0)

#### Response (200 OK)
```json
{
  "logs": [
    {
      "id": "uuid-log-id",
      "templateId": "uuid-template-id",
      "recipientEmail": "juan@example.com",
      "recipientName": "Juan Pérez",
      "subject": "¡Feliz Cumpleaños Juan!",
      "status": "SENT",
      "messageId": "message-id",
      "sentAt": "2025-12-07T10:30:00Z",
      "createdAt": "2025-12-07T10:30:00Z"
    }
  ],
  "total": 150
}
```

---

## Schedulers Automáticos

### Cumpleaños - 8:00 AM (Diariamente)
Se ejecuta automáticamente cada día a las 8:00 AM:
1. Busca miembros con cumpleaños hoy
2. Obtiene la plantilla de cumpleaños (si existe)
3. Reemplaza variables en la plantilla
4. Genera código promocional si está configurado
5. Envía correo a cada miembro

### Aniversarios - 9:00 AM (Diariamente)
Se ejecuta automáticamente cada día a las 9:00 AM:
1. Busca aniversarios de membresía para hoy
2. Obtiene la plantilla de aniversario (si existe)
3. Calcula años de membresía
4. Genera código promocional si está configurado
5. Envía correo a cada miembro

---

## Statuses de Email

| Status | Descripción |
|--------|-------------|
| `PENDING` | Correo pendiente de envío |
| `SENT` | Correo enviado exitosamente |
| `FAILED` | Error al enviar correo |
| `BOUNCED` | Dirección de email rebotada |

---

## Providers de Email

### Google Gmail
**Requisitos:**
1. Crear "App Password" en Google Account (no usar contraseña normal)
2. Activar "Less secure app access"

**Configuración:**
```json
{
  "provider": "GOOGLE",
  "email": "tu-email@gmail.com",
  "password": "app-specific-password"
}
```

### Microsoft Outlook
**Requisitos:**
1. Email y contraseña de Outlook

**Configuración:**
```json
{
  "provider": "MICROSOFT",
  "email": "tu-email@outlook.com",
  "password": "tu-contraseña"
}
```

### SMTP Personalizado
**Configuración:**
```json
{
  "provider": "SMTP",
  "email": "noreply@example.com",
  "smtpHost": "smtp.example.com",
  "smtpPort": 587,
  "smtpUser": "usuario@example.com",
  "smtpPassword": "contraseña",
  "useSSL": false,
  "useTLS": true
}
```

---

## Flujo Típico de Uso

### 1. Configurar Proveedor
```bash
POST /api/email-settings/config
Content-Type: application/json

{
  "provider": "GOOGLE",
  "email": "gimnasio@gmail.com",
  "password": "app-password",
  "senderName": "Gym Manager"
}
```

### 2. Verificar Configuración
```bash
POST /api/email-settings/config/{configId}/verify
Content-Type: application/json

{
  "recipientEmail": "admin@example.com"
}
```

### 3. Crear Plantillas
```bash
POST /api/email-settings/templates
Content-Type: application/json

{
  "name": "Birthday",
  "triggerType": "BIRTHDAY",
  "subject": "¡Feliz Cumpleaños {{firstName}}!",
  "htmlContent": "...",
  "includeDiscountCode": true,
  "discountCodePercentage": 15
}
```

### 4. Sistema Funciona Automáticamente
- 8:00 AM: Se envían correos de cumpleaños
- 9:00 AM: Se envían correos de aniversarios

### 5. Monitorear Historial
```bash
GET /api/email-settings/logs?limit=50&offset=0
```

---

## Códigos de Error

| Código | Mensaje | Solución |
|--------|---------|----------|
| 400 | Email service not configured | Crear una configuración de email |
| 400 | No active email configuration found | Establecer una configuración como activa |
| 400 | Email template not found | Verificar que la plantilla existe |
| 500 | Failed to send email | Verificar logs, revisar configuración |

---

## Base de Datos

### Tablas Principales
- `email_configs`: Configuraciones de proveedores
- `email_templates`: Plantillas de email
- `email_logs`: Historial de envíos

### Migrations
El módulo crea automáticamente las tablas mediante `TypeORM` en modo `synchronize: true`.

---

## Ejemplo Completo - Flujo de Cumpleaños

1. **Admin configura Gmail:**
   ```json
   POST /api/email-settings/config
   {
     "provider": "GOOGLE",
     "email": "gym@gmail.com",
     "password": "app-pass-123",
     "senderName": "Gym Manager"
   }
   ```

2. **Admin verifica la configuración:**
   ```json
   POST /api/email-settings/config/{id}/verify
   {
     "recipientEmail": "admin@gym.com"
   }
   ```

3. **Admin crea plantilla de cumpleaños:**
   ```json
   POST /api/email-settings/templates
   {
     "name": "Birthday Special",
     "triggerType": "BIRTHDAY",
     "subject": "🎂 ¡Feliz Cumpleaños {{firstName}}!",
     "htmlContent": "<h1>Hola {{firstName}}</h1><p>En tu día especial, te ofrecemos 15% en renovación.</p><p>Código: {{code}}</p>",
     "includeDiscountCode": true,
     "discountCodePercentage": 15,
     "discountCodeDaysValid": 30
   }
   ```

4. **Automáticamente cada día a las 8:00 AM:**
   - Sistema busca miembros con cumpleaños hoy
   - Crea código promocional único: `BDAY-A1B2C3-162840`
   - Reemplaza variables en la plantilla
   - Envía correo personalizado
   - Registra en `email_logs`

---

## Próximas Mejoras
- [ ] Soporte para SendGrid
- [ ] Plantillas con drag-and-drop visual
- [ ] Estadísticas de tasa de apertura
- [ ] Integración con webhooks
- [ ] Pruebas A/B de sujetos

