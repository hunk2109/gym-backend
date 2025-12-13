# MÓDULO DE MESAS - GUÍA DE IMPLEMENTACIÓN Y CONFIGURACIÓN

## 🔧 ACTIVACIÓN DEL MÓDULO

### 1. **Agregar Tablas Module a app.module.ts**

```typescript
// src/app.module.ts

import { TablesModule } from './modules/tables/tables.module';

@Module({
  imports: [
    // ... otros módulos
    TablesModule,
  ],
})
export class AppModule {}
```

### 2. **Crear Parámetro de Activación en ModuleSettings**

Agregar a la tabla `module_settings`:

```sql
INSERT INTO module_settings (moduleName, isEnabled, description, createdAt)
VALUES ('tables', false, 'Sistema de mesas para ventas', NOW());
```

### 3. **Crear Migración de Base de Datos**

Las 3 nuevas tablas que se crearán automáticamente:
- `tables`
- `table_accounts`
- `table_account_items`

---

## 📋 ESTRUCTURA DE CARPETAS

```
src/modules/tables/
├── dto/
│   ├── create-table.dto.ts
│   └── table-account.dto.ts
├── tables.service.ts
├── tables.controller.ts
├── table-accounts.service.ts
├── table-accounts.controller.ts
└── tables.module.ts

src/entities/
├── table.entity.ts
├── table-account.entity.ts
└── table-account-item.entity.ts
```

---

## 🔐 PERMISOS Y ROLES

### **EMPLEADO_MESERO** (Nuevo rol)
- Abrir cuentas en mesas
- Agregar/remover items
- Ver cuentas abiertas
- Cerrar cuentas

### **EMPLEADO_CAJERO**
- Ver detalles de cuentas
- Procesar pagos

### **ENCARGADO**
- Todo lo de mesero + cajero
- Crear/editar/eliminar mesas
- Ver todas las cuentas

### **ADMIN**
- Acceso total

---

## 🔌 ENDPOINTS DISPONIBLES

### **Mesas (Tables)**

```
GET    /tables                    - Listar todas (con paginación)
GET    /tables/available          - Solo disponibles
GET    /tables/open               - Solo abiertas
GET    /tables/number/:number     - Por número de mesa
GET    /tables/:id                - Por ID
POST   /tables                    - Crear nueva mesa
PUT    /tables/:id                - Actualizar mesa
DELETE /tables/:id                - Eliminar mesa
```

### **Cuentas (Accounts)**

```
POST   /accounts/:tableId/open    - Abrir cuenta en mesa
GET    /accounts/:accountId       - Ver detalles de cuenta
GET    /accounts/table/:tableId/open - Ver cuenta abierta de mesa
POST   /accounts/:accountId/items - Agregar item a cuenta
DELETE /accounts/items/:itemId    - Remover item
GET    /accounts/:accountId/total - Ver total actual
PUT    /accounts/:accountId       - Actualizar cuenta (descuento, notas)
PUT    /accounts/:accountId/close - Cerrar cuenta
PUT    /accounts/:accountId/pay   - Procesar pago
PUT    /accounts/:accountId/cancel - Cancelar cuenta
GET    /accounts                  - Listar todas las cuentas abiertas
```

---

## 📊 EJEMPLO DE FLUJO OPERATIVO

### **1. Mesero abre mesa**
```bash
POST /accounts/mesa-uuid-123/open
```
Response: Cuenta creada con estado "open"

### **2. Mesero agrega productos**
```bash
POST /accounts/account-uuid-456/items
{
  "productId": "product-uuid",
  "quantity": 2,
  "unitPrice": 15.50
}
```
Response: Cuenta actualizada con item agregado

### **3. Mesero ve total actual**
```bash
GET /accounts/account-uuid-456/total
```
Response: { subtotal: 31.00, discount: 0, total: 31.00 }

### **4. Mesero cierra cuenta**
```bash
PUT /accounts/account-uuid-456/close
```
Response: Cuenta con estado "closed"

### **5. Cajero procesa pago**
```bash
PUT /accounts/account-uuid-456/pay
```
Response: Cuenta con estado "paid", mesa liberada

---

## 🔄 ESTADOS DE MESA

```
AVAILABLE → Disponible, sin cuenta abierta
OPEN      → Cuenta abierta, mesero agregando items
OCCUPIED  → Cuenta cerrada, esperando pago
```

## 🔄 ESTADOS DE CUENTA

```
OPEN      → Recibiendo items
CLOSED    → Cerrada, esperando pago
PAID      → Pagada, completada
CANCELLED → Anulada (por admin)
```

---

## 💾 DATOS QUE SE GUARDAN

### **Table**
- Número de mesa (único)
- Estado actual
- Capacidad
- Notas

### **TableAccount**
- Mesa a la que pertenece
- Usuario (mesero) que abrió
- Total acumulado
- Descuento aplicado
- Timestamp de apertura/cierre
- Estado

### **TableAccountItem**
- Referencia a cuenta
- Producto
- Cantidad y precio unitario
- Subtotal
- Timestamp de agregado/removido

---

## 🔗 INTEGRACIÓN CON SISTEMA DE VENTAS

**Futuro:** Al cerrar y pagar una cuenta, se puede generar automáticamente una venta en el sistema actual:

```typescript
// Al completar pago:
const sale = await salesService.createSale({
  items: account.items,
  totalAmount: account.finalAmount,
  paymentMethod: 'cash', // o método seleccionado
  tableAccountId: account.id
});

account.saleId = sale.id;
await accountRepository.save(account);
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Entidades creadas (`table.entity.ts`, `table-account.entity.ts`, `table-account-item.entity.ts`)
- [ ] DTOs creados
- [ ] Servicios implementados
- [ ] Controladores implementados
- [ ] Módulo creado y registrado en `app.module.ts`
- [ ] Migración de BD ejecutada
- [ ] Parámetro `tables` agregado en `module_settings`
- [ ] Rol `EMPLEADO_MESERO` creado en BD
- [ ] Documentación en settings/configuración
- [ ] Tests de endpoints
- [ ] Frontend: Interfaz de mesas
- [ ] Frontend: Interfaz de cuentas abiertas
- [ ] Frontend: Botón de activación en configuración

---

## 🚀 PARA ACTIVAR EN PRODUCCIÓN

1. Cambiar en `module_settings`: `isEnabled = true`
2. Mostrar UI de mesas en interfaz
3. Crear mesas iniciales (1-20 o según necesidad)
4. Capacitar personal sobre nuevo flujo

