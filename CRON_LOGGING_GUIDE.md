# Sistema de Logging de Cronjobs

## Descripción General

Se ha implementado un sistema completo de logging y auditoría para todas las tareas programadas (cronjobs) del sistema. Esto permite monitorear la ejecución de cada cron job, registrar errores y obtener estadísticas de desempeño.

## Componentes Creados

### 1. Entidad CronExecutionLog
**Ubicación:** `src/modules/email-settings/entities/cron-execution-log.entity.ts`

Almacena información sobre cada ejecución de un cronjob:
- `id`: UUID único
- `cronName`: Nombre del cronjob (ej: "AutoEmailJob", "BirthdayEmailScheduler")
- `description`: Descripción de qué hace el cron job
- `status`: Estado de ejecución ('success', 'error', 'running')
- `errorMessage`: Mensaje de error si falló
- `executionTimeMs`: Tiempo de ejecución en milisegundos
- `itemsProcessed`: Cantidad de items procesados (emails enviados, etc.)
- `executedAt`: Timestamp de cuándo se ejecutó

### 2. Servicio CronLoggingService
**Ubicación:** `src/modules/email-settings/cron-logging.service.ts`

Proporciona métodos para registrar la ejecución de cronjobs:

#### Métodos Principales

```typescript
// Iniciar logging de un cron job
const logId = await cronLoggingService.logCronStart(
  'AutoEmailJob',
  'Sending automatic emails every 30 minutes'
);

// Registrar ejecución exitosa
await cronLoggingService.logCronSuccess(logId, emailsSent, executionTimeMs);

// Registrar error
await cronLoggingService.logCronError(logId, error.message, executionTimeMs);

// Obtener logs recientes
const logs = await cronLoggingService.getRecentLogs(50);

// Obtener logs de un cron específico
const autoEmailLogs = await cronLoggingService.getLogsByCronName('AutoEmailJob', 20);

// Obtener estadísticas
const stats = await cronLoggingService.getCronStats();
```

### 3. Controlador CronLoggingController
**Ubicación:** `src/modules/email-settings/cron-logging.controller.ts`

Proporciona endpoints REST para consultar logs:

#### Endpoints

```
GET /cron-logs/recent?limit=50
- Retorna los últimos 50 logs de cronjobs
- Parámetros: limit (opcional, default 50)

GET /cron-logs/by-name/:cronName?limit=20
- Retorna los últimos 20 logs de un cron específico
- Parámetros: cronName (ej: "AutoEmailJob"), limit (opcional)

GET /cron-logs/stats
- Retorna estadísticas agregadas de todos los cronjobs
- Muestra: total execuciones, sucesos, errores, tiempo promedio
```

### 4. Módulo CronLoggingModule
**Ubicación:** `src/modules/email-settings/cron-logging.module.ts`

Encapsula toda la funcionalidad de logging de cronjobs y está importado en `EmailSettingsModule`.

## Cronjobs Integrados

Se han integrado tres cronjobs principales:

### 1. AutoEmailService - AutoEmailJob
**Cron:** Cada 30 minutos (`*/30 * * * *`)
**Función:** Ejecuta todos los chequeos automáticos:
- Envía emails de cumpleaños
- Envía emails de membresía venciendo hoy
- Envía emails de membresía venciendo pronto
- Envía emails de membresía vencida

**Logging:** 
- Registra el total de emails enviados
- Registra tiempo de ejecución
- Captura errores con detalle

### 2. EmailSchedulerService
**Cronjobs:**
- **BirthdayEmailScheduler** - Cada día a las 8:00 AM
- **AnniversaryEmailScheduler** - Cada día a las 9:00 AM

**Función:**
- Envía emails de cumpleaños configurados
- Envía emails de aniversario de membresía

**Logging:**
- Registra cantidad de emails enviados
- Registra tiempo de ejecución
- Captura errores

### 3. PaymentReminderService - PaymentReminderJob
**Cron:** Cada 30 minutos (`*/30 * * * *`)
**Función:** Envía recordatorios de pago según configuración

**Logging:**
- Registra cantidad de recordatorios enviados
- Registra tiempo de ejecución
- Captura errores

## Estructura de Logs

Cada ejecución de cronjob genera un registro con:

```json
{
  "id": "uuid-aleatorio",
  "cronName": "AutoEmailJob",
  "description": "Sending automatic emails every 30 minutes",
  "status": "success",
  "errorMessage": null,
  "executionTimeMs": 2345,
  "itemsProcessed": 15,
  "executedAt": "2024-01-15T14:30:00.000Z"
}
```

## Cómo Usar

### 1. Monitorear Ejecuciones de Cronjobs

Acceder a la API:
```bash
# Obtener últimos 50 logs
curl http://localhost:3000/cron-logs/recent?limit=50

# Obtener últimos logs del AutoEmailJob
curl http://localhost:3000/cron-logs/by-name/AutoEmailJob?limit=20

# Ver estadísticas
curl http://localhost:3000/cron-logs/stats
```

### 2. Integrar Nuevo Cronjob

Si creas un nuevo cronjob, integra el logging:

```typescript
@Cron('0 */6 * * *') // Cada 6 horas
async miNuevoJob() {
  const startTime = Date.now();
  const logId = await this.cronLoggingService.logCronStart(
    'MiNuevoJob',
    'Descripción de qué hace'
  );

  try {
    // ... tu lógica aquí ...
    const itemsProcessed = 10;
    
    await this.cronLoggingService.logCronSuccess(
      logId,
      itemsProcessed,
      Date.now() - startTime
    );
  } catch (error) {
    await this.cronLoggingService.logCronError(
      logId,
      error.message,
      Date.now() - startTime
    );
  }
}
```

## Estadísticas Disponibles

El endpoint `/cron-logs/stats` retorna:

```json
{
  "AutoEmailJob": {
    "totalExecutions": 48,
    "successfulExecutions": 47,
    "failedExecutions": 1,
    "successRate": 97.92,
    "averageExecutionTimeMs": 1234,
    "totalItemsProcessed": 156,
    "lastExecution": "2024-01-15T14:30:00.000Z"
  },
  "BirthdayEmailScheduler": {
    "totalExecutions": 5,
    "successfulExecutions": 5,
    "failedExecutions": 0,
    "successRate": 100,
    "averageExecutionTimeMs": 456,
    "totalItemsProcessed": 8,
    "lastExecution": "2024-01-15T08:00:00.000Z"
  }
}
```

## Características

✅ **Registro Automático:** Cada cronjob registra automáticamente su ejecución
✅ **Tracking de Errores:** Captura y registra todos los errores
✅ **Métricas de Rendimiento:** Mide tiempo de ejecución y items procesados
✅ **Consultas Flexibles:** API para consultar logs por nombre o límite
✅ **Estadísticas Agregadas:** Tasas de éxito y promedios de desempeño
✅ **Timestamps:** Registro preciso de cuándo se ejecutó cada tarea

## Base de Datos

Tabla: `cron_execution_log`

```sql
CREATE TABLE cron_execution_log (
  id VARCHAR(36) PRIMARY KEY,
  cronName VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  status VARCHAR(20) DEFAULT 'success',
  errorMessage TEXT,
  executionTimeMs INT,
  itemsProcessed INT,
  executedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cronName (cronName),
  INDEX idx_status (status),
  INDEX idx_executedAt (executedAt)
);
```

## Próximos Pasos

- Implementar dashboard visual para ver logs en tiempo real
- Agregar alertas cuando cronjobs fallan
- Implementar renovación automática de logs antiguos
- Agregar filtros avanzados de búsqueda
