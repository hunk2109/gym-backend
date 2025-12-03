## 🔧 GUÍA DE MIGRACIÓN DE BASE DE DATOS

### Paso 1: Conectar a la base de datos

```bash
# Si usas MySQL local
mysql -u root -p gym_db

# O si usas docker
docker exec -it mysql mysql -u root -p gym_db
```

### Paso 2: Aplicar migración

Ejecutar el siguiente SQL para agregar los nuevos campos a `member_memberships`:

```sql
-- 1. Agregar nuevas columnas
ALTER TABLE member_memberships 
ADD COLUMN paymentStatus VARCHAR(20) DEFAULT 'pending' AFTER paymentDate,
ADD COLUMN isRecurring BOOLEAN DEFAULT false AFTER paymentStatus,
ADD COLUMN suspensionDate DATE NULL AFTER isRecurring;

-- 2. Actualizar registros existentes
UPDATE member_memberships 
SET paymentStatus = 'pending', isRecurring = false, suspensionDate = NULL;

-- 3. Verificar que se aplicó correctamente
DESC member_memberships;

-- Resultado esperado:
-- +------------------+----------------------------------+------+-----+---------+-------+
-- | Field            | Type                             | Null | Key | Default | Extra |
-- +------------------+----------------------------------+------+-----+---------+-------+
-- | id               | char(36)                         | NO   | PRI | NULL    |       |
-- | memberId         | char(36)                         | NO   | MUL | NULL    |       |
-- | membershipId     | char(36)                         | NO   | MUL | NULL    |       |
-- | startDate        | date                             | NO   |     | NULL    |       |
-- | endDate          | date                             | NO   |     | NULL    |       |
-- | isActive         | tinyint(1)                       | NO   |     | 1       |       |
-- | amountPaid       | decimal(10,2)                    | YES  |     | NULL    |       |
-- | paymentDate      | date                             | YES  |     | NULL    |       |
-- | paymentStatus    | varchar(20)                      | NO   |     | pending |       | ← NUEVO
-- | isRecurring      | tinyint(1)                       | NO   |     | 0       |       | ← NUEVO
-- | suspensionDate   | date                             | YES  |     | NULL    |       | ← NUEVO
-- | createdAt        | datetime(6)                      | NO   |     | NULL    |       |
-- | updatedAt        | datetime(6)                      | NO   |     | NULL    |       |
-- +------------------+----------------------------------+------+-----+---------+-------+
```

### Paso 3: Verificar cambios

```sql
-- Ver estructura
DESC member_memberships;

-- Ver datos de ejemplo
SELECT 
  id,
  memberId,
  startDate,
  endDate,
  paymentStatus,
  isRecurring,
  suspensionDate
FROM member_memberships 
LIMIT 5;
```

### Paso 4: Reiniciar el backend

```bash
cd /Users/hectortaveras/develop/gym/gym-backend

# Compilar
npm run build

# Ejecutar en desarrollo
npm run start:dev

# O ejecutar en producción
npm run start
```

---

## 🧪 Validación Post-Migración

### Test 1: Asignar membresía
```bash
curl -X POST http://localhost:3000/api/member-memberships \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "memberId": "member-uuid",
    "membershipId": "membership-uuid",
    "startDate": "2025-12-03"
  }'

# Respuesta esperada:
{
  "statusCode": 201,
  "success": true,
  "message": "Membership assigned successfully",
  "data": {
    "id": "generated-uuid",
    "memberId": "member-uuid",
    "membershipId": "membership-uuid",
    "startDate": "2025-12-03",
    "endDate": "2026-01-02",
    "isActive": true,
    "amountPaid": null,
    "paymentDate": null,
    "paymentStatus": "pending",    ← NUEVO
    "isRecurring": true,           ← NUEVO
    "suspensionDate": null,        ← NUEVO
    "createdAt": "2025-12-03T...",
    "updatedAt": "2025-12-03T..."
  }
}
```

### Test 2: Listar pagos pendientes
```bash
curl -X GET http://localhost:3000/api/member-memberships/pending-payments \
  -H "Authorization: Bearer YOUR_TOKEN"

# Respuesta esperada:
{
  "statusCode": 200,
  "success": true,
  "data": [
    {
      "id": "...",
      "memberId": "...",
      "membershipId": "...",
      "startDate": "2025-12-03",
      "endDate": "2026-01-02",
      "paymentStatus": "pending",
      "isRecurring": true,
      ...
    }
  ]
}
```

### Test 3: Registrar pago
```bash
curl -X POST http://localhost:3000/api/member-memberships/MEMBERSHIP_ID/record-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amountPaid": 25000,
    "paymentDate": "2025-12-03"
  }'

# Respuesta esperada:
{
  "statusCode": 200,
  "success": true,
  "data": {
    "id": "MEMBERSHIP_ID",
    "paymentStatus": "paid",       ← ACTUALIZADO
    "amountPaid": 25000,
    "paymentDate": "2025-12-03",
    ...
  }
}
```

### Test 4: Ejecutar renovación manual
```bash
curl -X POST http://localhost:3000/api/member-memberships/auto-renew \
  -H "Authorization: Bearer YOUR_TOKEN"

# Respuesta esperada:
{
  "statusCode": 200,
  "success": true,
  "data": {
    "renewed": 3,
    "suspended": 1
  }
}
```

---

## 📊 Ejemplos de Datos

### Ejemplo 1: Membresía recién asignada (sin pago)
```sql
INSERT INTO member_memberships 
(id, memberId, membershipId, startDate, endDate, isActive, 
 amountPaid, paymentDate, paymentStatus, isRecurring, suspensionDate, 
 createdAt, updatedAt)
VALUES 
(UUID(), 'member-123', 'membership-456', '2025-12-03', '2026-01-02', 1,
 NULL, NULL, 'pending', 1, NULL,
 NOW(), NOW());
```

### Ejemplo 2: Membresía con pago registrado
```sql
INSERT INTO member_memberships 
(id, memberId, membershipId, startDate, endDate, isActive,
 amountPaid, paymentDate, paymentStatus, isRecurring, suspensionDate,
 createdAt, updatedAt)
VALUES 
(UUID(), 'member-789', 'membership-456', '2025-12-03', '2026-01-02', 1,
 25000, '2025-12-03', 'paid', 1, NULL,
 NOW(), NOW());
```

### Ejemplo 3: Membresía suspendida (> 15 días sin pago)
```sql
INSERT INTO member_memberships 
(id, memberId, membershipId, startDate, endDate, isActive,
 amountPaid, paymentDate, paymentStatus, isRecurring, suspensionDate,
 createdAt, updatedAt)
VALUES 
(UUID(), 'member-999', 'membership-456', '2025-11-01', '2025-12-01', 0,
 NULL, NULL, 'suspended', 1, '2025-12-18',
 NOW(), NOW());
```

---

## ⚠️ Notas Importantes

1. **Backup**: Hacer backup de base de datos ANTES de migración
   ```bash
   mysqldump -u root -p gym_db > gym_db_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Rollback**: Si algo falla, puede revertir con:
   ```sql
   ALTER TABLE member_memberships 
   DROP COLUMN paymentStatus,
   DROP COLUMN isRecurring,
   DROP COLUMN suspensionDate;
   ```

3. **Verificación**: Confirmar que no hay errores en logs del backend:
   ```bash
   npm run start:dev 2>&1 | grep -i error
   ```

4. **Cron Job**: Se ejecutará automáticamente cada día a las 2 AM
   - Verificar timezone del servidor
   - Logs en console (stdout/stderr del proceso Node)

---

## 🔍 Troubleshooting

### Error: "Duplicate column name"
**Causa**: La columna ya existe
**Solución**: Verificar estructura actual
```sql
DESC member_memberships;
```

### Error: "Access denied for user"
**Causa**: Credenciales incorrectas
**Solución**: Verificar usuario/password de BD

### Cron no se ejecuta
**Causa**: @nestjs/schedule no instalado
**Solución**: Verificar instalación
```bash
npm list @nestjs/schedule
npm install @nestjs/schedule
```

---

## ✅ Checklist de Migración

- [ ] Hacer backup de BD
- [ ] Ejecutar script SQL
- [ ] Verificar estructura de tabla
- [ ] Compilar backend: `npm run build`
- [ ] Reiniciar backend: `npm run start:dev`
- [ ] Test asignación membresía
- [ ] Test registro de pago
- [ ] Verificar en base de datos
- [ ] Test manual de cron (o ejecutar endpoint /auto-renew)
- [ ] Documentar resultado

