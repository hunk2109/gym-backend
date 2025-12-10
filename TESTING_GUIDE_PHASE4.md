# 🧪 GUÍA DE TESTING - PHASE 4

## Estado Actual
- ✅ Backend compilado (0 errores)
- ✅ Flutter compilado (0 errores)
- ✅ Suite E2E creada (45+ tests)
- ⏳ SQL Validation creada
- ⏳ Tests E2E por ejecutar

---

## Tests E2E Disponibles

### Archivo: `test/group-memberships.e2e-spec.ts`

Contiene **45+ test cases** organizados en 9 suites:

#### 1. **Crear Grupo** (4 tests)
```
✅ Debe crear grupo con responsable y payment
❌ Debe fallar si responsable no existe
❌ Debe fallar si membresía no existe
❌ Debe fallar si maxMembers <= 1
```

#### 2. **Obtener Grupo** (2 tests)
```
✅ Debe obtener grupo con detalles completos
❌ Debe fallar si grupo no existe
```

#### 3. **Agregar Acompañante** (5 tests)
```
✅ Debe agregar acompañante (SIN Payment)
❌ Debe fallar si grupo está lleno
❌ Debe fallar si usuario ya es acompañante
❌ Debe fallar si usuario es el responsable
✅ Acompañante NO debe tener MemberMembership
```

#### 4. **Remover Acompañante** (4 tests)
```
✅ Debe remover acompañante (marcar REMOVED)
✅ Grupo debe actualizar currentMembers
❌ Debe fallar si acompañante no existe
❌ No debe poder remover responsable
```

#### 5. **Cambiar Responsable** (4 tests)
```
✅ Debe cambiar responsable (transacción atómica)
✅ Viejo responsable debe quedar inactivo
❌ Debe fallar si nuevo responsable no existe
❌ No se puede cambiar a responsable actual
```

#### 6. **Obtener Grupos por Responsable** (2 tests)
```
✅ Debe obtener grupos donde usuario es responsable
✅ Usuario sin grupos debe retornar array vacío
```

#### 7. **Obtener Grupos por Acompañante** (2 tests)
```
✅ Debe obtener solo grupos donde usuario es acompañante activo
✅ No debe incluir grupos donde acompañante fue removido
```

#### 8. **Obtener Todos los Grupos** (1 test)
```
✅ Debe obtener todos los grupos
```

#### 9. **Validaciones de Pagos** (2 tests)
```
✅ Responsable debe tener Payment registro
✅ Acompañantes NO deben tener Payment
```

#### 10. **Integridad de Datos** (4 tests)
```
✅ Membership.type debe ser GROUP para grupos
✅ GroupCompanion debe tener status ACTIVE
✅ currentMembers debe contar activos correctamente
✅ Validaciones de estructura
```

---

## Cómo Ejecutar Tests

### Opción 1: Ejecutar Suite Completa
```bash
cd /Users/hectortaveras/develop/gym/gym-backend

# Instalar dependencias de testing (si no están)
npm install

# Ejecutar tests E2E
npm run test:e2e

# O específicamente la suite
npm run test:e2e -- test/group-memberships.e2e-spec.ts
```

### Opción 2: Ejecutar Tests Específicos
```bash
# Un solo describe
npm run test:e2e -- --testNamePattern="Crear Grupo"

# Un solo test
npm run test:e2e -- --testNamePattern="Debe crear grupo con responsable"

# Con verbosidad
npm run test:e2e -- --verbose --testNamePattern="Agregar"
```

### Opción 3: Watch Mode (Desarrollo)
```bash
npm run test:e2e -- --watch
```

---

## Validación de Base de Datos

### Archivo: `validate-v3-architecture.sql`

Contiene 15 secciones de validación SQL:

### Ejecutar Validaciones

#### Con MySQL CLI
```bash
# Conectarse a la BD
mysql -u root -p

# O con contraseña inline
mysql -u root -p'tu_password' gym_db

# Ejecutar script
source validate-v3-architecture.sql;

# O desde línea de comandos
mysql -u root -p'tu_password' gym_db < validate-v3-architecture.sql
```

#### Con Docker MySQL
```bash
# Si tienes Docker Compose
docker-compose exec mysql mysql -u root -p'password' gym_db < validate-v3-architecture.sql

# O desde dentro del contenedor
docker-compose exec mysql bash
mysql -u root -p gym_db
source /path/validate-v3-architecture.sql;
```

### Validaciones Críticas

El script verifica:

1. **Tablas Existen** ✅
   - `group_memberships`
   - `group_companions` (nueva)
   - `member_memberships`
   - `memberships`
   - `payments`

2. **Estructura de group_companions** ✅
   - id (VARCHAR, PK)
   - groupMembershipId (FK)
   - userId (FK)
   - status (enum: ACTIVE|REMOVED|INACTIVE)
   - addedAt (timestamp)
   - removedAt (nullable)

3. **Campos Nuevos en membership** ✅
   - `type` (enum: individual|group, default individual)
   - `parentMembershipId` (nullable, para herencia)

4. **Campos Nuevos en member_memberships** ✅
   - `isGroupResponsible` (boolean, default false)
   - `groupMembershipId` (nullable FK)

5. **CRÍTICO: Acompañantes NO generan Payments** ❌ ERROR si falla
   ```sql
   -- Acompañantes que tienen Payments (debería ser 0)
   SELECT COUNT(*) FROM payments p
   JOIN member_memberships mm ON p.memberMembershipId = mm.id
   WHERE mm.isGroupResponsible = false;
   -- Resultado DEBE ser 0
   ```

6. **CRÍTICO: Solo Responsables generan Payments** ❌ ERROR si falla
   ```sql
   -- Pagos sin responsable (debería ser 0)
   SELECT COUNT(*) FROM payments p
   JOIN member_memberships mm ON p.memberMembershipId = mm.id
   WHERE mm.isGroupResponsible = false;
   -- Resultado DEBE ser 0
   ```

7. **Integridad: 1 responsable por grupo** ✅
   ```sql
   -- Grupos sin responsable MemberMembership (debería ser 0)
   SELECT COUNT(*) FROM group_memberships gm
   LEFT JOIN member_memberships mm ON mm.userId = gm.responsibleUserId 
     AND mm.isGroupResponsible = true
   WHERE mm.id IS NULL;
   -- Resultado DEBE ser 0
   ```

8. **Integridad: Membership.type = GROUP** ✅
   ```sql
   -- Grupos con Membership.type != GROUP (debería ser 0)
   SELECT COUNT(*) FROM group_memberships gm
   LEFT JOIN memberships m ON m.id = gm.membershipId
   WHERE m.type != 'group';
   -- Resultado DEBE ser 0
   ```

9. **Reporte: Responsables y Acompañantes** 📊
   ```sql
   SELECT 
     gm.id as 'GroupId',
     gm.responsibleUserId as 'Responsable',
     COUNT(CASE WHEN gc.status = 'ACTIVE' THEN 1 END) as 'AcompañantesActivos',
     mm.paymentStatus as 'PaymentStatus'
   FROM group_memberships gm
   LEFT JOIN group_companions gc ON gc.groupMembershipId = gm.id
   LEFT JOIN member_memberships mm ON mm.userId = gm.responsibleUserId
   GROUP BY gm.id;
   ```

---

## Flujo de Testing Recomendado

### 1️⃣ Primero: Setup Base de Datos
```bash
# Verificar que la BD está limpia/sincronizada
npm run start:dev
# Esperar a que TypeORM sincronice automáticamente

# Ejecutar validación SQL
mysql -u root -p gym_db < validate-v3-architecture.sql
```

### 2️⃣ Segundo: Ejecutar Tests E2E
```bash
# En terminal nueva
npm run test:e2e -- test/group-memberships.e2e-spec.ts
```

### 3️⃣ Tercero: Revisar Resultados
- ✅ Todos deben pasar (45+ tests)
- ❌ Si fallan: Revisar error específico
- 📊 Ejecutar validación SQL otra vez

### 4️⃣ Cuarto: Validar Datos
```bash
# Ejecutar reporte final
mysql -u root -p gym_db -e "
  SELECT 
    gm.id, gm.responsibleUserId, COUNT(gc.id) as companions,
    p.status as paymentStatus
  FROM group_memberships gm
  LEFT JOIN group_companions gc ON gc.groupMembershipId = gm.id
  LEFT JOIN payments p ON p.id = (
    SELECT id FROM payments 
    WHERE memberMembershipId IN (
      SELECT id FROM member_memberships 
      WHERE userId = gm.responsibleUserId AND isGroupResponsible = true
    )
    LIMIT 1
  )
  GROUP BY gm.id;
"
```

---

## Checklist de Validación

### ✅ Antes de Deployment

- [ ] Tests E2E: 45+ tests pasando
- [ ] Base de datos: Validación SQL completa (15/15 checks)
- [ ] Responsables: Tienen Payment registro
- [ ] Acompañantes: SIN Payment registro
- [ ] Cambio responsable: Transacción atómica funciona
- [ ] Remover acompañante: Marca REMOVED, no borra
- [ ] Queries: responsableGroupsProvider funciona
- [ ] Queries: companionGroupsProvider funciona

### 🔍 Problemas Comunes

#### Problema: Test falla en "crear grupo"
```
Error: Usuario no existe
Solución: Crear usuario de prueba antes de tests
```

#### Problema: "Acompañantes tienen Payments"
```
Error: CRÍTICO - Validación SQL falla
Solución: Revisar PaymentsService, verificar que solo genera para responsables
```

#### Problema: "Payments sin isGroupResponsible"
```
Error: CRÍTICO - Validación SQL falla
Solución: Buscar Payments antigua data, limpiar o migrar
```

#### Problema: "currentMembers incorrecto"
```
Error: currentMembers devuelve valor erróneo
Solución: Revisar getter en GroupMembership, count de ACTIVE companions
```

---

## Próximos Pasos

### ✅ Si todos los tests pasan:
1. Hacer backup de producción
2. Ejecutar validación SQL en producción
3. Revisar dashboard (solo pagos responsables)
4. Deploy a staging
5. Humo tests en staging
6. Deploy a producción

### ❌ Si fallan tests:
1. Leer error específico
2. Revisar código del test
3. Revisar implementación del servicio
4. Debuggar con logs
5. Ejecutar test individual
6. Corregir código
7. Reintentar

---

## Documentación de Referencia

- `QUICK_REFERENCE_V3.md` - API reference
- `ARQUITECTURA_V3_RESUMEN_EJECUTIVO.md` - Arquitectura completa
- `PHASE_2_COMPLETION_SUMMARY.md` - Backend changes
- `PHASE_3_COMPLETION.md` - Flutter changes

---

**Última Actualización**: 9 de diciembre de 2025
**Status**: 🧪 LISTO PARA TESTING
