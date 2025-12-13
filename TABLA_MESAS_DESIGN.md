# SISTEMA DE MESAS - DISEÑO ARQUITECTÓNICO

## 📋 RESUMEN EJECUTIVO
Sistema de gestión de cuentas abiertas por mesa para ventas de productos. Permite:
- Abrir cuentas por mesa
- Agregar/remover productos a cada mesa
- Mantener estado separado por mesa
- Finalizar y facturar cuando esté completa

---

## 📊 ENTIDADES NECESARIAS

### 1. **Table Entity** (Nueva)
```
Tabla: tables
- id (UUID, PK)
- tableNumber (INT, unique) - Número de mesa 1-50
- status (ENUM: 'available', 'open', 'occupied')
- notes (TEXT, nullable)
- capacity (INT) - Capacidad de personas
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

### 2. **TableAccount Entity** (Nueva)
```
Tabla: table_accounts
- id (UUID, PK)
- tableId (FK -> tables.id)
- status (ENUM: 'open', 'closed', 'paid', 'cancelled')
- openedAt (TIMESTAMP)
- closedAt (TIMESTAMP, nullable)
- totalAmount (DECIMAL)
- discount (DECIMAL, default 0)
- notes (TEXT, nullable)
- userId (FK -> users.id) - Cajero que abrió
- createdAt (TIMESTAMP)
```

### 3. **TableAccountItem Entity** (Nueva)
```
Tabla: table_account_items
- id (UUID, PK)
- accountId (FK -> table_accounts.id)
- productId (FK -> products.id)
- quantity (INT)
- unitPrice (DECIMAL)
- subtotal (DECIMAL)
- addedAt (TIMESTAMP)
- removedAt (TIMESTAMP, nullable) - Si se removió
```

---

## 🔄 FLUJO DE OPERACIÓN

```
1. ABRIR MESA
   Mesa vacía → Mesero abre cuenta en mesa → Estado: "open"

2. AGREGAR PRODUCTOS
   Mesero selecciona productos → Sistema agrega a tabla_account_items
   → Cantidad y precio se guardan
   → Subtotal se calcula automáticamente

3. VER CUENTA ACTUAL
   Mesero ve todos los items agregados
   → Total parcial de la mesa

4. REMOVER PRODUCTOS (Opcional)
   Mesero puede remover items antes de cerrar

5. CERRAR CUENTA
   Mesero cierra la mesa → Sistema crea venta completa
   → Estado: "closed"
   → Items de table_account_items → sale_items

6. PAGAR
   Sistema procesa pago → Estado: "paid"
   → Genera transacción
   → Libera mesa
```

---

## 🛠️ SERVICIOS Y ENDPOINTS

### **TablesService**
- `getAllTables()` - Listar todas las mesas
- `getTableById(id)` - Obtener mesa por ID
- `getTableByNumber(number)` - Obtener por número
- `createTable(dto)` - Crear nueva mesa
- `updateTable(id, dto)` - Actualizar mesa
- `getAvailableTables()` - Solo mesas disponibles

### **TableAccountsService**
- `openAccount(tableId, userId)` - Abrir cuenta
- `getOpenAccount(tableId)` - Obtener cuenta abierta
- `addItemToAccount(accountId, product, quantity)` - Agregar item
- `removeItemFromAccount(itemId)` - Remover item
- `getCurrentTotal(accountId)` - Total actual
- `closeAccount(accountId)` - Cerrar cuenta
- `completePayment(accountId)` - Marcar como pagado
- `cancelAccount(accountId)` - Cancelar y liberar items

### **Controladores**
```
GET    /tables              - Listar mesas
POST   /tables              - Crear mesa
GET    /tables/available    - Mesas disponibles
GET    /tables/:id          - Obtener mesa

POST   /accounts            - Abrir cuenta en mesa
GET    /accounts/:tableId   - Obtener cuenta actual de mesa
POST   /accounts/:id/items  - Agregar item a cuenta
DELETE /accounts/items/:id  - Remover item
GET    /accounts/:id/total  - Ver total actual
PUT    /accounts/:id/close  - Cerrar cuenta
PUT    /accounts/:id/pay    - Procesar pago
PUT    /accounts/:id/cancel - Cancelar cuenta
```

---

## 🔗 RELACIÓN CON SISTEMA DE VENTAS

### **Antes (Venta Directa)**
```
Sale → SaleItem → Producto
```

### **Nuevo (Con Mesas)**
```
Table → TableAccount → TableAccountItem → Producto
                    ↓
             (Al cerrar) →
                    ↓
              Sale → SaleItem → Producto
```

**Ventaja:** Mientras la cuenta está abierta, no es una venta formal. Solo cuando se cierra y paga, se genera la venta.

---

## 📈 CARACTERÍSTICAS ADICIONALES

### **Dashboard de Mesas**
- Vista en tiempo real de todas las mesas
- Color por estado: Verde (disponible), Naranja (abierta), Rojo (ocupada)
- Click para abrir/ver detalles

### **Historial de Movimientos**
- Quién abrió la mesa
- Cuándo se agregó cada producto
- Cambios de estado
- Hora de cierre y pago

### **Reportes**
- Ingresos por mesa
- Mesa más productiva
- Tiempo promedio de cuenta abierta
- Productos más vendidos por mesa

---

## 🔐 PERMISOS DE ACCESO

- **ADMIN**: Todo
- **ENCARGADO**: Crear/editar mesas, ver todas las cuentas
- **MESERO**: Abrir cuenta, agregar/remover items, cerrar cuenta
- **CAJERO**: Procesar pagos

---

## 💾 DATOS A GUARDAR EN LOGS

Para cada operación en mesas:
- Quién abrió la cuenta
- Hora de apertura
- Items agregados/removidos y cuándo
- Hora de cierre
- Total final
- Método de pago
- Hora de pago

