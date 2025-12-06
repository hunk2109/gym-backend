# 📋 GUÍA DE INSTALACIÓN - MEJORAS DEL SISTEMA

## Paso 1: Dependencias NPM

```bash
cd /Users/hectortaveras/develop/gym/gym-backend

npm install xlsx pdfkit @types/pdfkit
```

**Verificar instalación:**
```bash
npm list xlsx pdfkit
```

---

## Paso 2: Ejecutar Migraciones SQL

### 2.1 Crear tabla audit_logs (si no existe)

```bash
# Conectar a MySQL
mysql -u root -p gym_db

# Ejecutar en MySQL CLI:
```

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  description TEXT,
  details LONGTEXT,
  userId VARCHAR(36),
  amount DECIMAL(10,2),
  entityId VARCHAR(36),
  entityType VARCHAR(50),
  severity ENUM('INFO', 'WARNING', 'ERROR') DEFAULT 'INFO',
  reviewed BOOLEAN DEFAULT FALSE,
  reviewedBy VARCHAR(36),
  reviewedAt TIMESTAMP NULL,
  reviewNotes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user_date (userId, createdAt),
  INDEX idx_audit_action (action),
  INDEX idx_audit_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 Agregar columna cashierId a sales

```sql
-- Ejecutar en MySQL CLI:
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashierId VARCHAR(36) NULL AFTER cashRegisterId;
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashierId);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_date ON sales(cashierId, createdAt);

-- Opcional: Llenar con userId existente (si no está vacío)
UPDATE sales SET cashierId = (SELECT id FROM users LIMIT 1) WHERE cashierId IS NULL AND id IS NOT NULL;
```

---

## Paso 3: Actualizar Archivos Backend

### 3.1 Importaciones en cash-register.controller.ts

Agregar al inicio del archivo:

```typescript
import { Response } from 'express';
import { CashRegisterExportService } from './services/cash-register-export.service';
```

### 3.2 Inyección en constructor

```typescript
constructor(
  private cashRegisterService: CashRegisterService,
  private exportService: CashRegisterExportService, // Agregar esta línea
) {}
```

### 3.3 Actualizar CashRegisterService

Verificar que tenga las siguientes funciones:
- `getRegisterDetail()`
- `getStatistics()`
- `getDiscrepancies()`
- `exportToExcel()`
- `exportToPdf()`
- `exportRegisterToCSV()`

### 3.4 Actualizar CashRegisterModule

Verificar imports:

```typescript
import { CashRegisterValidationService } from './services/cash-register-validation.service';
import { CashRegisterExportService } from './services/cash-register-export.service';
import { AuditLog } from '../../entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashRegister, Sale, AuditLog])],
  providers: [
    CashRegisterService,
    CashRegisterValidationService,
    CashRegisterExportService,
    AuditLogService,
  ],
  controllers: [CashRegisterController],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
```

---

## Paso 4: Verificar Compilación Backend

```bash
cd /Users/hectortaveras/develop/gym/gym-backend

# Limpiar build anterior
rm -rf dist/

# Compilar
npm run build

# Si hay errores, verificar en:
npm run lint
```

---

## Paso 5: Actualizar Archivos Flutter

### 5.1 Copiar pantallas nuevas

Archivos ya creados:
- `/lib/screens/cash_register/cash_history_screen.dart`
- `/lib/screens/cash_register/cash_statistics_screen.dart`

### 5.2 Verificar providers existentes

Estos deben existir en `lib/providers/`:
- `dioProvider` - Cliente HTTP
- `cashHistoryProvider` - Historial de cajas
- `statsDataProvider` - Datos de estadísticas

### 5.3 Agregar rutas de navegación

En `lib/main.dart` o router, agregar:

```dart
'/cash_history': (context) => const CashHistoryScreen(),
'/cash_statistics': (context) => const CashStatisticsScreen(),
```

### 5.4 Agregar imports a main

```dart
import 'package:sggi/screens/cash_register/cash_history_screen.dart';
import 'package:sggi/screens/cash_register/cash_statistics_screen.dart';
```

---

## Paso 6: Compilación y Testing Flutter

```bash
cd /Users/hectortaveras/develop/gym/sggi

# Limpiar
flutter clean

# Pub get
flutter pub get

# Compilar (iOS)
flutter build ios

# Compilar (Android)
flutter build apk

# Ejecutar en desarrollo
flutter run -v
```

---

## Paso 7: Testing de Endpoints

### 7.1 Iniciar servidor backend

```bash
cd /Users/hectortaveras/develop/gym/gym-backend
npm run start:dev
```

Debe mostrar:
```
[Nest] 1234 - 12/05/2025, 10:30:00 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +5ms
✓ Server running on port 3000
```

### 7.2 Probar endpoints con curl

#### Obtener Historial:
```bash
curl -X GET "http://localhost:3000/api/cash-register/history?days=30&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### Obtener Estadísticas:
```bash
curl -X GET "http://localhost:3000/api/cash-register/statistics?startDate=2025-11-05&endDate=2025-12-05" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Exportar Excel:
```bash
curl -X GET "http://localhost:3000/api/cash-register/export/excel?startDate=2025-11-05&endDate=2025-12-05" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o cajas.xlsx
```

---

## Paso 8: Verificación de Funcionalidad

### 8.1 Backend - Auditoria

```bash
# En MySQL, verificar tabla de auditoría:
SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT 10;

# Debe mostrar entradas como:
# - CASH_REGISTER_OPEN
# - CASH_REGISTER_CLOSE
```

### 8.2 Backend - Sales con cashierId

```bash
# Verificar que ventas tienen cashierId:
SELECT id, totalAmount, cashierId, createdAt FROM sales LIMIT 10;
```

### 8.3 Frontend - Pantalla de Historial

- Navegar a `/cash_history`
- Debe mostrar lista de cajas con:
  - Fecha
  - Montos (Apertura, Cierre, Esperado)
  - Indicador de discrepancia
- Filtros deben funcionar (días, límite por página)
- Paginación debe navegar correctamente

### 8.4 Frontend - Estadísticas

- Navegar a `/cash_statistics`
- Debe mostrar:
  - Rango de fechas
  - 6 tarjetas con métricas
  - Lista de discrepancias (si existen)

---

## Paso 9: Troubleshooting

### Error: "xlsx module not found"

```bash
npm install xlsx
npm install --save-dev @types/xlsx
```

### Error: "pdfkit module not found"

```bash
npm install pdfkit
npm install --save-dev @types/pdfkit
```

### Error: "AuditLog entity not found"

- Verificar ruta: `src/entities/audit-log.entity.ts`
- Verificar importa en módulo

### Error en Flutter: "dioProvider not found"

- Crear en `lib/providers/dio_provider.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

final dioProvider = Provider((ref) {
  return Dio(BaseOptions(
    baseUrl: 'http://YOUR_API_URL',
  ));
});
```

### Error: "Tabla audit_logs no existe"

```sql
-- Verificar que la tabla existe:
SHOW TABLES LIKE 'audit_logs';

-- Si no existe, crear con paso 2.1
```

---

## Paso 10: Prueba End-to-End

### Escenario Completo:

1. **Abrir Caja**
   ```
   POST /api/cash-register/open
   { "openingAmount": 1000, "billBreakdown": {...} }
   ```
   ✓ Debe crear registro
   ✓ Debe guardar en audit_logs

2. **Hacer Ventas**
   ```
   Realizar 3-4 ventas desde la app
   ```
   ✓ Deben tener cashierId

3. **Cerrar Caja**
   ```
   POST /api/cash-register/close
   { "closingAmount": 1300, "billBreakdown": {...} }
   ```
   ✓ Debe calcular esperado = 1000 + ventas
   ✓ Debe registrar en audit_logs
   ✓ Debe vincular ventas a cashRegisterId

4. **Ver Historial**
   ```
   GET /api/cash-register/history
   ```
   ✓ Debe mostrar el cierre cerrado
   ✓ En Flutter debe mostrar en lista

5. **Ver Estadísticas**
   ```
   GET /api/cash-register/statistics?startDate=...&endDate=...
   ```
   ✓ Debe calcular totales correctamente

6. **Descargar Reporte**
   ```
   GET /api/cash-register/export/excel
   ```
   ✓ Debe retornar archivo Excel válido

---

## ✅ Checklist Final

- [ ] npm install (dependencias)
- [ ] Migraciones SQL ejecutadas
- [ ] Archivos backend actualizados
- [ ] Archivos Flutter copiados
- [ ] Backend compila sin errores
- [ ] Flutter compila sin errores
- [ ] Endpoints testean correctamente
- [ ] Auditoría registra eventos
- [ ] Pantalla de historial funciona
- [ ] Estadísticas cargan datos
- [ ] Exportación genera archivos

---

## 📞 Logs Útiles

### Ver logs en desarrollo

**Backend:**
```bash
# Terminal con el servidor
npm run start:dev

# Buscar errores específicos
grep "ERROR\|❌" logs/app.log
```

**Flutter:**
```bash
# En otra terminal
flutter logs

# Filtrar por tag
flutter logs -f | grep "cash\|history\|stats"
```

---

**Fecha:** 5 de diciembre de 2025
**Última actualización:** Cuando ejecutes los pasos
**Sistema operativo:** macOS (zsh)
