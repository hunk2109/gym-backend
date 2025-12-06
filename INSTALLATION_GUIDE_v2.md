# 🚀 GUÍA DE INSTALACIÓN - SISTEMA DE CAJA v2.0

## 📋 TABLA DE CONTENIDOS

1. [Requisitos Previos](#requisitos-previos)
2. [Pasos de Instalación Backend](#pasos-de-instalación-backend)
3. [Pasos de Instalación Frontend](#pasos-de-instalación-frontend)
4. [Verificación](#verificación)
5. [Solución de Problemas](#solución-de-problemas)

---

## 🔧 REQUISITOS PREVIOS

### Backend
- Node.js 18+ instalado
- MySQL 8.0+ corriendo
- npm o yarn como package manager

### Frontend
- Flutter 3.13+ instalado
- Android Studio o Xcode configurado
- Dispositivo/Emulador Android o iOS

### Sistema Operativo
- macOS (usado en desarrollo) O
- Linux (Ubuntu 20.04+) O  
- Windows con WSL2

---

## 🎯 PASOS DE INSTALACIÓN BACKEND

### Paso 1: Actualizar Dependencias NestJS

```bash
cd /Users/hectortaveras/develop/gym/gym-backend

# Instalar nuevas dependencias si es necesario
npm install

# Compilar
npm run build
```

### Paso 2: Ejecutar Migraciones

```bash
# Crear migration para agregr userId a sales
npm run typeorm migration:generate -- -n AddUserIdToSales

# Ejecutar migrations
npm run typeorm migration:run
```

**Salida esperada:**
```
migration: AddUserIdToSales1733427600000
✓ Migración ejecutada exitosamente
✓ Columna 'userId' agregada a tabla 'sales'
✓ Índice 'idx_sales_userId' creado
```

### Paso 3: Verificar Módulo de Caja

```bash
# Asegurarse que el módulo está en app.module.ts
cat src/app.module.ts | grep CashRegisterModule

# Debe mostrar:
# import { CashRegisterModule } from './modules/cash-register/cash-register.module';
```

### Paso 4: Iniciar Backend

```bash
npm run start:dev

# Salida esperada:
# [Nest] 12345 - 05/12/2025, 2:30:45 PM     LOG [NestFactory] Starting Nest application...
# [Nest] 12345 - 05/12/2025, 2:30:47 PM     LOG [InstanceLoader] CashRegisterModule dependencies initialized
# [Nest] 12345 - 05/12/2025, 2:30:48 PM     LOG [RoutesResolver] CashRegisterController {/api/cash-register}:
# ...
# [Nest] 12345 - 05/12/2025, 2:30:50 PM     LOG [NestApplication] Nest application successfully started
```

### Paso 5: Verificar Endpoints

```bash
# Probar endpoint de historial (necesita token JWT válido)
curl -X GET "http://localhost:3000/api/cash-register/history?days=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Salida esperada:
# {
#   "statusCode": 200,
#   "success": true,
#   "message": "Historial de cajas obtenido",
#   "data": {
#     "data": [],
#     "total": 0,
#     "page": 1,
#     "lastPage": 1
#   }
# }
```

---

## 📱 PASOS DE INSTALACIÓN FRONTEND

### Paso 1: Actualizar Dependencias Flutter

```bash
cd /Users/hectortaveras/develop/gym/sggi

# Obtener dependencias
flutter pub get

# Verificar que no hay errores críticos
flutter analyze
```

**Salida esperada:**
```
✓ Analizando...
Archivos analizados: 425
Problemas encontrados: 15 (warnings, no críticos)
```

### Paso 2: Crear Modelos Necesarios

Asegurarse que existe `lib/models/cash_register.dart`:

```dart
class CashRegister {
  final String id;
  final String userId;
  final DateTime registerDate;
  final double openingAmount;
  final double closingAmount;
  final double expectedClosure;
  final double difference;
  final bool isOpen;
  final DateTime? closedAt;
  final String? closingBillBreakdown;

  CashRegister({
    required this.id,
    required this.userId,
    required this.registerDate,
    required this.openingAmount,
    required this.closingAmount,
    required this.expectedClosure,
    required this.difference,
    required this.isOpen,
    this.closedAt,
    this.closingBillBreakdown,
  });

  factory CashRegister.fromJson(Map<String, dynamic> json) {
    return CashRegister(
      id: json['id'] as String,
      userId: json['userId'] as String,
      registerDate: DateTime.parse(json['registerDate'] as String),
      openingAmount: (json['openingAmount'] as num).toDouble(),
      closingAmount: (json['closingAmount'] as num).toDouble(),
      expectedClosure: (json['expectedClosure'] as num).toDouble(),
      difference: (json['difference'] as num).toDouble(),
      isOpen: json['isOpen'] as bool,
      closedAt: json['closedAt'] != null 
        ? DateTime.parse(json['closedAt'] as String) 
        : null,
      closingBillBreakdown: json['closingBillBreakdown'] as String?,
    );
  }
}
```

### Paso 3: Integrar Nuevas Pantallas

**En `lib/main.dart`** o en tu archivo de rutas, agregar:

```dart
import 'package:sggi/screens/cash_register/cash_register_history_screen.dart';
import 'package:sggi/screens/cash_register/cash_register_dashboard_screen.dart';

// En tu MaterialApp routes:
routes: {
  '/cash-history': (context) => const CashRegisterHistoryScreen(),
  '/cash-dashboard': (context) => const CashRegisterDashboardScreen(),
  // ... otras rutas
}
```

### Paso 4: Actualizar API Config

Asegurarse que la URL del API es correcta en `lib/config/api_config.dart`:

```dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:3000'; // O tu URL de producción
  static const String apiPath = '/api';
  
  // ...
}
```

### Paso 5: Iniciar Emulador y App

```bash
# Opción 1: Emulador Android
flutter emulators --launch Pixel_5_API_31

# Opción 2: Dispositivo iOS (si tienes Mac)
open -a Simulator

# Ejecutar app
flutter run
```

**Salida esperada:**
```
✓ Built build/app/outputs/flutter-apk/app-debug.apk.
✓ Installed build/app/outputs/flutter-apk/app-debug.apk.
✓ Device emulator-5554 is running API 31.
Launching lib/main.dart on Android SDK built for x86 in debug mode...
✓ App started successfully!
```

---

## ✅ VERIFICACIÓN

### Backend - Verificar Todos Los Endpoints

```bash
# 1. Historial de cajas
curl -X GET "http://localhost:3000/api/cash-register/history?days=30&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 200 OK con { data: [], total: 0, page: 1, lastPage: 1 }

# 2. Estadísticas
curl -X GET "http://localhost:3000/api/cash-register/statistics?startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 200 OK con { summary: {...}, quality: {...}, registers: [] }

# 3. Discrepancias
curl -X GET "http://localhost:3000/api/cash-register/discrepancies?severity=high" \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 200 OK con { data: [], total: 0, page: 1, lastPage: 1 }

# 4. Exportación CSV
curl -X GET "http://localhost:3000/api/cash-register/export/history/csv?days=30" \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 200 OK con CSV como attachment

# 5. Exportación HTML
curl -X GET "http://localhost:3000/api/cash-register/export/history/html?days=30" \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 200 OK con HTML válido

# 6. Exportación JSON
curl -X GET "http://localhost:3000/api/cash-register/export/statistics?startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 200 OK con JSON válido
```

### Frontend - Verificar Pantallas

1. **Pantalla de Historial**
   - ✓ Navegar a `/cash-history`
   - ✓ Ver lista de cajas cerradas
   - ✓ Filtrar por período (7, 14, 30, 60, 90 días)
   - ✓ Hacer clic en caja para ver detalles
   - ✓ Paginación funciona correctamente

2. **Dashboard**
   - ✓ Navegar a `/cash-dashboard`
   - ✓ Ver 4 KPIs principales
   - ✓ Seleccionar rango de fechas
   - ✓ Filtrar discrepancias por severidad
   - ✓ Ver lista paginada de discrepancias

3. **Integración con Pantalla Anterior**
   - ✓ Botón "Cerrar Caja" cierra correctamente
   - ✓ Se actualiza historial automáticamente
   - ✓ Ventas se filtran correctamente por `cashRegisterId IS NULL`

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "No existe una caja abierta para este usuario"

**Causa:** Usuario intenta cerrar caja sin abrirla primero.

**Solución:**
```bash
# 1. Abrir caja primero:
curl -X POST "http://localhost:3000/api/cash-register/open" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "openingAmount": 1000,
    "billBreakdown": { "1": 1000 },
    "receipts": []
  }'

# 2. Luego cerrar:
curl -X POST "http://localhost:3000/api/cash-register/close" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "closingAmount": 1015,
    "billBreakdown": { "1": 1015 },
    "receipts": []
  }'
```

### Error: "Discrepancia significativa: RD$ X.XX"

**Causa:** Diferencia entre dinero contado y esperado > RD$100

**Solución:**
```
1. Recontar manualmente todo el dinero
2. Verificar cada denominación (1, 5, 10, 25, 50, 100, 200, 500, 1000, 2000)
3. Ajustar el monto si es necesario
4. Reintentar cierre
5. Si persiste, contactar con encargado
```

### Error: "Patrones sospechosos detectados"

**Causa:** Usuario tiene muchas discrepancias consecutivas.

**Solución:**
```
1. Contactar con administrador
2. Admin ejecuta:
   
   UPDATE cash_registers 
   SET difference = 0 
   WHERE userId = 'USER_ID' AND DATE(registerDate) = CURDATE()
   
3. Reabrir caja
4. Investigar posible causa
```

### Error: "Target of URI doesn't exist: '../../models/cash_register.dart'"

**Causa:** Falta crear el modelo CashRegister.

**Solución:**
```bash
# Crear el archivo
touch lib/models/cash_register.dart

# Copiar contenido del modelo (ver Paso 2 más arriba)
```

### Error: "Undefined name 'dioProvider'"

**Causa:** Provider Dio no existe.

**Solución:**
```dart
// En lib/providers/dio_provider.dart (crear si no existe):
final dioProvider = Provider<Dio>((ref) {
  return Dio(BaseOptions(
    baseUrl: 'http://localhost:3000',
    connectTimeout: const Duration(seconds: 30),
  ));
});
```

### Error: "Connection refused" al conectar con API

**Causa:** Backend no está corriendo.

**Solución:**
```bash
# 1. Verificar si está corriendo:
lsof -i :3000

# 2. Si no está, iniciar:
cd gym-backend
npm run start:dev

# 3. Verificar conectividad:
curl http://localhost:3000/api/health
```

---

## 🔍 VERIFICACIÓN FINAL

### Checklist de Implementación

- [ ] Backend compiló sin errores
- [ ] Migraciones ejecutadas correctamente
- [ ] Todos los endpoints retornan 200 OK
- [ ] Flutter app inicia sin crashes
- [ ] Pantalla de historial se carga
- [ ] Pantalla de dashboard se carga
- [ ] Filtros funcionan correctamente
- [ ] Paginación funciona
- [ ] Exportación CSV descarga archivo
- [ ] Exportación HTML válido
- [ ] Exportación JSON parseable

### Performance Testing

```bash
# 1. Generar 100 registros de prueba
node scripts/seed-cash-registers.js

# 2. Probar endpoint de historial con 100 registros
time curl "http://localhost:3000/api/cash-register/history?page=1&limit=20"

# 3. Probar exportación CSV con 100 registros
time curl "http://localhost:3000/api/cash-register/export/history/csv"

# Esperado: < 500ms para todos los endpoints
```

---

## 📊 ESTADÍSTICAS POST-INSTALACIÓN

Después de una semana de uso, esperas ver:

```
Dashboard Metrics:
├── Total de Cajas: 50
├── Cajas Cerradas: 50
├── Con Discrepancia: 2
├── Tasa de Precisión: 96%
├── Diferencia Promedio: RD$1.50
├── Apertura Total: RD$50,000
├── Cierre Total: RD$49,925
└── Diferencia Total: -RD$75 ✓
```

---

## 🎓 PRÓXIMOS PASOS

1. **Entrenar a Usuarios:**
   - Mostrar cómo abrir/cerrar caja
   - Explicar el dashboard
   - Enseñar a generar reportes

2. **Monitoreo:**
   - Verificar diariamente el dashboard
   - Investigar discrepancias > RD$50
   - Revisar patrones sospechosos

3. **Optimización:**
   - Ajustar threshold de severidad si es necesario
   - Agregar más denominaciones si aplica
   - Personalizar horarios de cierre

---

## 📞 SOPORTE

- **Errores Backend:** Revisar `/logs/error.log`
- **Errores Frontend:** Revisar `flutter logs`
- **Base de Datos:** Conectar con `mysql -u root -p gym_db`

---

**Versión:** 2.0  
**Última Actualización:** 5 de Diciembre de 2025  
**Estado:** ✅ INSTALACIÓN LISTA
