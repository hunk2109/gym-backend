# GUÍA DE EJECUCIÓN - MÓDULO DE MESAS

## 📋 PASO A PASO PARA ACTIVAR EL MÓDULO

### **PASO 1: Ejecutar Migración SQL** 
⏱️ Tiempo: 2 minutos

```bash
# Opción A: Desde terminal (macOS/Linux)
cd /Users/hectortaveras/develop/gym/gym-backend
mysql -u root -p < migrations/1735084800-CreateTablesMigration.sql

# Opción B: Desde MySQL Workbench
# 1. Abrir MySQL Workbench
# 2. Conectar a la BD gym_manager
# 3. Ir a File → Open SQL Script
# 4. Seleccionar: migrations/1735084800-CreateTablesMigration.sql
# 5. Click Run
```

**Lo que hace:**
- ✅ Crea tabla `tables`
- ✅ Crea tabla `table_accounts`
- ✅ Crea tabla `table_account_items`
- ✅ Agrega parámetro `tables` en `module_settings` (desactivado)
- ✅ Crea índices de BD

---

### **PASO 2: Compilar Backend**
⏱️ Tiempo: 5-10 minutos

```bash
cd /Users/hectortaveras/develop/gym/gym-backend

# Instalar dependencias (si es primera vez)
npm install

# Compilar TypeScript
npm run build

# Si hay errores de compilación:
npm run build 2>&1 | tail -50  # Ver últimos 50 errores
```

**Verificar que compile sin errores:**
```bash
npm run start:dev  # Debe iniciar sin errores
# Ctrl+C para detener
```

---

### **PASO 3: Verificar BD**
⏱️ Tiempo: 2 minutos

```bash
# Conectar a MySQL
mysql -u root -p
# Ingresar contraseña

# Listar tablas nuevas
USE gym_manager;
SHOW TABLES LIKE 'table%';

# Debe mostrar:
# table_account_items
# table_accounts
# tables

# Ver parámetro de módulo
SELECT * FROM module_settings WHERE moduleName = 'tables';

# Debe mostrar:
# moduleName: 'tables'
# isEnabled: 0 (false - desactivado por defecto)
```

---

### **PASO 4: Verificar Código en app.module.ts**
⏱️ Tiempo: 1 minuto

```bash
cd /Users/hectortaveras/develop/gym/gym-backend
grep -n "TablesModule\|Table\|table" src/app.module.ts

# Debe mostrar:
# - Import de TablesModule
# - Import de Table, TableAccount, TableAccountItem
# - Entidades en TypeOrmModule.forRoot()
# - TablesModule en imports[]
```

---

### **PASO 5: Pruebas Básicas (Desarrollo)**
⏱️ Tiempo: 10 minutos

```bash
# 1. Iniciar servidor
npm run start:dev

# 2. En otra terminal, obtener token JWT
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gym.com",
    "password": "admin123"
  }' | jq '.access_token'

# Copiar el token (sin comillas)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5..."

# 3. Probar endpoint de mesas
curl -X GET http://localhost:3000/tables \
  -H "Authorization: Bearer $TOKEN"

# Debe retornar: { "tables": [], "total": 0, "page": 1, "lastPage": 0 }

# 4. Crear una mesa de prueba
curl -X POST http://localhost:3000/tables \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableNumber": 1,
    "capacity": 4,
    "notes": "Mesa de prueba"
  }'

# 5. Ver mesa creada
curl -X GET http://localhost:3000/tables \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Debe mostrar la mesa en el array
```

---

### **PASO 6: Activar en Configuración**
⏱️ Tiempo: 2 minutos

**Opción A: Desde Frontend (cuando esté disponible)**
1. Abrir app
2. Ir a Configuración → Módulos
3. Buscar "tables"
4. Cambiar switch a "Activado"
5. Guardar

**Opción B: Directamente en BD**
```bash
mysql -u root -p

USE gym_manager;
UPDATE module_settings SET isEnabled = 1 WHERE moduleName = 'tables';

# Verificar
SELECT * FROM module_settings WHERE moduleName = 'tables';
# isEnabled debe ser 1 (true)
```

---

### **PASO 7: Crear Mesas Iniciales (Opcional)**
⏱️ Tiempo: 5 minutos

**Opción A: Script SQL**
```sql
INSERT INTO `tables` (`id`, `tableNumber`, `status`, `capacity`, `notes`, `createdAt`, `updatedAt`)
VALUES 
  (UUID(), 1, 'available', 4, 'Mesa 1', NOW(), NOW()),
  (UUID(), 2, 'available', 4, 'Mesa 2', NOW(), NOW()),
  (UUID(), 3, 'available', 4, 'Mesa 3', NOW(), NOW()),
  (UUID(), 4, 'available', 4, 'Mesa 4', NOW(), NOW()),
  (UUID(), 5, 'available', 4, 'Mesa 5', NOW(), NOW()),
  (UUID(), 6, 'available', 6, 'Mesa Grande 1', NOW(), NOW()),
  (UUID(), 7, 'available', 6, 'Mesa Grande 2', NOW(), NOW()),
  (UUID(), 8, 'available', 2, 'Barra 1', NOW(), NOW()),
  (UUID(), 9, 'available', 2, 'Barra 2', NOW(), NOW()),
  (UUID(), 10, 'available', 2, 'Barra 3', NOW(), NOW());

# Verificar
SELECT * FROM tables;
# Debe mostrar 10 mesas
```

**Opción B: API REST**
```bash
for i in {1..10}; do
  curl -X POST http://localhost:3000/tables \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"tableNumber\": $i,
      \"capacity\": $(if [ $i -le 5 ]; then echo 4; else echo 2; fi),
      \"notes\": \"Mesa $i\"
    }"
  echo "✓ Mesa $i creada"
done
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de completar los pasos, verificar:

- [ ] Migración SQL ejecutada sin errores
- [ ] Backend compila sin errores
- [ ] `npm run start:dev` inicia correctamente
- [ ] Tablas `tables`, `table_accounts`, `table_account_items` existen en BD
- [ ] Parámetro `tables` en `module_settings` existe
- [ ] Endpoint `GET /tables` retorna datos
- [ ] Se puede crear mesa con `POST /tables`
- [ ] Se puede abrir cuenta con `POST /accounts/:tableId/open`
- [ ] Se puede agregar items con `POST /accounts/:accountId/items`
- [ ] Se puede cerrar cuenta con `PUT /accounts/:accountId/close`
- [ ] Se puede procesar pago con `PUT /accounts/:accountId/pay`

---

## 🔍 TROUBLESHOOTING

### **Error: Tabla ya existe**
```sql
-- Si dice que la tabla ya existe:
DROP TABLE IF EXISTS table_account_items;
DROP TABLE IF EXISTS table_accounts;
DROP TABLE IF EXISTS tables;

-- Luego ejecutar migración nuevamente
```

### **Error: "Cannot add or update a child row"**
```
Significa que hay un problema con Foreign Keys.
Solución: Verificar que la tabla `users` existe y tiene datos.
```

### **Error: "Access denied"**
```bash
# Verificar credenciales de MySQL
mysql -u root -p
# Ingresar contraseña correcta
```

### **Backend no compila: "Table is not defined"**
```
Solución: Asegurarse que app.module.ts tiene:
- import { Table } from './entities/table.entity';
- import { TablesModule } from './modules/tables/tables.module';
- Table, TableAccount, TableAccountItem en entities array
- TablesModule en imports array
```

### **Endpoint retorna 404**
```
Solución 1: Backend está compilando - esperar 5 segundos
Solución 2: TablesModule no está en app.module.ts
Solución 3: JWT token es inválido - obtener nuevo
```

---

## 📞 SOPORTE

**Si algo falla:**

1. Ver logs del backend:
```bash
npm run start:dev 2>&1 | tail -100
```

2. Verificar BD:
```sql
SELECT * FROM module_settings WHERE moduleName = 'tables';
SELECT COUNT(*) FROM tables;
```

3. Revisar documentos:
- `TABLA_MESAS_DESIGN.md` - Diseño conceptual
- `TABLA_MESAS_IMPLEMENTATION.md` - Detalles técnicos
- `TABLA_MESAS_EXAMPLES.md` - Ejemplos de endpoints

---

## 🎯 RESUMEN FINAL

| Paso | Acción | Tiempo | Estado |
|------|--------|--------|--------|
| 1 | Ejecutar migración SQL | 2 min | ⏳ |
| 2 | Compilar backend | 10 min | ⏳ |
| 3 | Verificar BD | 2 min | ⏳ |
| 4 | Verificar código | 1 min | ⏳ |
| 5 | Pruebas básicas | 10 min | ⏳ |
| 6 | Activar en config | 2 min | ⏳ |
| 7 | Crear mesas iniciales | 5 min | ⏳ |
| **TOTAL** | | **32 minutos** | |

---

**Última actualización:** 12 de diciembre de 2025
**Versión:** 1.0
**Estado:** ✅ Listo para implementar

