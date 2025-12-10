# 🚀 CHECKLIST DE DEPLOYMENT - ARQUITECTURA V3

## Pre-Deployment (Dev/Staging)

### ✅ Validaciones de Código
- [x] Backend compilado sin errores (npm run build)
- [x] Flutter compilado sin errores (flutter analyze)
- [x] Tests unitarios pasan
- [x] Tests E2E creados (45+ test cases)
- [x] No hay TODOs críticos en código

### ✅ Validaciones de Arquitectura
- [x] GroupMembershipsService reescrito (8 métodos)
- [x] GroupMembershipsController actualizado (7 endpoints)
- [x] MemberMembershipsService validación agregada
- [x] PaymentsService compatible (solo responsables)
- [x] DashboardService compatible
- [x] Modelos Dart sincronizados

### ✅ Validaciones de Base de Datos
- [x] Entidades TypeORM actualizadas (4 cambios)
- [x] Tabla `group_companions` creada
- [x] Campos `type` y `parentMembershipId` en `memberships`
- [x] Campos `isGroupResponsible` y `groupMembershipId` en `member_memberships`
- [x] Foreign keys configuradas
- [x] SQL de validación creado

---

## Deployment Step-by-Step

### 1️⃣ Preparar Ambiente
```bash
# Actualizar código
cd /Users/hectortaveras/develop/gym/gym-backend
git pull origin main

# Instalar dependencias si cambió
npm install

# Build producción
npm run build
# ✅ Verificar: "BUILD SUCCESS"

# Verificar compilación de Flutter
cd /Users/hectortaveras/develop/gym/sggi
flutter pub get
flutter build apk --split-per-abi
# ✅ Verificar: Sin errores
```

### 2️⃣ Backup de Base de Datos
```bash
# Backup completo ANTES de cambios
mysqldump -u root -p gym_db > gym_db_backup_$(date +%Y%m%d_%H%M%S).sql

# Guardar en lugar seguro
# Backup deberá tener:
# - group_memberships (tabla completa)
# - member_memberships (con datos existentes)
# - payments (todos los records)
# - memberships (con todos los tipos)

# Verificar backup
ls -lh gym_db_backup*.sql
```

### 3️⃣ Validar Base de Datos Actual
```bash
# Conectarse a BD
mysql -u root -p gym_db

# Ejecutar script de validación PRE-MIGRATION
source validate-v3-architecture.sql;

# Anotar resultados:
# - Cantidad de grupos actuales: ___
# - Cantidad de pagos pendientes: ___
# - Cantidad de membresías: ___

# Salir
exit
```

### 4️⃣ Aplicar Migraciones
```bash
# TypeORM aplicará cambios automáticamente si synchronize: true

# Opción A: Iniciar servidor (sincronización automática)
cd /Users/hectortaveras/develop/gym/gym-backend
npm run start:dev
# Esperar: "TypeORM synchronize: true"
# Verificar que creó tabla group_companions

# Opción B: Si quieres migración manual (más seguro)
# Ejecutar script SQL manualmente en BD

# Verificar con
show tables;
describe group_companions;
```

### 5️⃣ Post-Migration Validation
```bash
# Conectarse a BD después de migración
mysql -u root -p gym_db

# Ejecutar validación POST-MIGRATION
source validate-v3-architecture.sql;

# Verificar TODOS estos deben ser ✅:
# ✅ Tabla group_companions existe
# ✅ Memberships tienen type field
# ✅ MemberMemberships tienen isGroupResponsible field
# ✅ Acompañantes NO generan Payments (Cantidad = 0)
# ✅ Solo responsables generan Payments (Cantidad = 0 errores)
# ✅ Cada grupo tiene MemberMembership responsable
# ✅ Memberships de grupos tienen type = GROUP

# Si alguno es ❌ DETENER Y REVISAR
```

### 6️⃣ Ejecutar Tests E2E
```bash
# Terminal 1: Backend corriendo
cd /Users/hectortaveras/develop/gym/gym-backend
npm run start:dev
# Esperar: "Server running on port 3000"

# Terminal 2: Ejecutar tests
npm run test:e2e -- test/group-memberships.e2e-spec.ts

# Resultado esperado:
# ✅ 45+ tests PASSED
# ❌ 0 tests FAILED

# Si fallan, DETENER Y DEBUGEAR
```

### 7️⃣ Validar Casos de Uso Críticos
```bash
# Conectarse a BD
mysql -u root -p gym_db

# 1. Verificar que responsable tiene Payment
SELECT COUNT(*) as 'ResponsablesConPayment'
FROM payments p
JOIN member_memberships mm ON p.memberMembershipId = mm.id
WHERE mm.isGroupResponsible = true;
# Debe ser > 0 (si hay grupos)

# 2. Verificar que acompañantes NO tienen Payment
SELECT COUNT(*) as 'AcompañantesConPayment'
FROM payments p
JOIN member_memberships mm ON p.memberMembershipId = mm.id
JOIN group_companions gc ON gc.userId = mm.userId
WHERE gc.status = 'ACTIVE';
# Debe ser 0 ← CRÍTICO

# 3. Verificar que no hay duplicados de responsables
SELECT groupMembershipId, COUNT(*) as 'Cantidad'
FROM member_memberships
WHERE isGroupResponsible = true
GROUP BY groupMembershipId
HAVING COUNT(*) > 1;
# Debe retornar 0 rows

# 4. Verificar integridad de datos
SELECT 
  'Grupos' as Tipo, COUNT(*) FROM group_memberships
UNION
SELECT 'Acompañantes', COUNT(*) FROM group_companions
UNION
SELECT 'MemberMemberships (responsables)', COUNT(*) FROM member_memberships WHERE isGroupResponsible = true
UNION
SELECT 'Pagos (responsables)', COUNT(*) FROM payments p
  JOIN member_memberships mm ON p.memberMembershipId = mm.id
  WHERE mm.isGroupResponsible = true;
```

### 8️⃣ Smoke Tests en Frontend
```bash
# Compilar frontend (si no está)
cd /Users/hectortaveras/develop/gym/sggi
flutter build apk --split-per-abi

# Instalar en dispositivo/emulador
flutter install

# Tests manuales en la app:
# 1. Navegar a "Membresías Grupales"
# 2. Crear grupo nuevo
# 3. Agregar acompañante
# 4. Verificar que aparece en lista
# 5. Remover acompañante
# 6. Cambiar responsable
# 7. Verificar pagos (solo responsable)
# 8. Revisar dashboard (pagos correctos)
```

### 9️⃣ Verificar Dashboard
```bash
# En la app, ir a Dashboard

# Validar:
# 1. Pagos Pendientes: Solo cuenta responsables (no acompañantes)
# 2. Miembros Activos: Incluye responsables + acompañantes
# 3. Ingresos Esperados: Solo de responsables
# 4. Grupos Activos: Cuenta correctamente

# Comparar con datos de DB:
mysql -u root -p gym_db -e "
  SELECT 
    'Total Pagos Pendientes (solo responsables)' as Metrica,
    COUNT(*) as Valor
  FROM payments WHERE status = 'pending'
    AND memberMembershipId IN (
      SELECT id FROM member_memberships WHERE isGroupResponsible = true
    );
"
# Debe coincidir con Dashboard
```

### 🔟 Monitoreo Post-Deploy
```bash
# Configurar logs
tail -f /var/log/gym-backend.log | grep -i "group-memberships"

# Monitorear por 24 horas:
# ✅ Crear grupo: Sin errores
# ✅ Agregar acompañante: Sin errores
# ✅ Cambiar responsable: Sin errores
# ✅ Pagos generados: Solo para responsables
# ✅ Dashboard actualiza: Correctamente
# ❌ Errores de validación: Documentar
```

---

## Rollback Plan

### Si algo falla y necesitas revertir:

```bash
# 1. Detener servicios
systemctl stop gym-backend
systemctl stop flutter-app

# 2. Restaurar backup BD
mysql -u root -p < gym_db_backup_TIMESTAMP.sql

# 3. Revertir código
cd /Users/hectortaveras/develop/gym/gym-backend
git revert HEAD
npm run build

# 4. Redeploy versión anterior
npm run start:prod

# 5. Verificar que todo funciona
curl http://localhost:3000/health

# 6. Documentar el incidente
echo "Rollback ejecutado: $(date)" >> INCIDENT_LOG.md
```

---

## Checklist Final

### Antes de Ir a Producción

**Pre-Deploy Checklist:**
- [ ] Backup de BD realizado
- [ ] Código compilado (0 errores)
- [ ] Tests E2E pasan (45+)
- [ ] SQL validación pasa (15/15)
- [ ] Dashboard funciona correctamente
- [ ] Logs sin errores críticos
- [ ] Team aprobó cambios

**Deploy Checklist:**
- [ ] Backend actualizado
- [ ] BD migrada (synchronize: true ejecutado)
- [ ] Flutter app compilada
- [ ] Frontend actualizado
- [ ] API keys válidas
- [ ] Tokens JWT funcionan

**Post-Deploy Checklist:**
- [ ] App funciona (sin crashes)
- [ ] Dashboard muestra datos correctos
- [ ] Pagos se generan solo para responsables
- [ ] Acompañantes no aparecen en pagos
- [ ] Crear grupo funciona
- [ ] Agregar acompañante funciona
- [ ] Cambiar responsable funciona
- [ ] Logs limpios (sin warnings no esperados)

---

## Métricas a Monitorear

Después del deployment, revisar:

```sql
-- Diariamente por 7 días:

-- Grupos creados
SELECT DATE(createdAt), COUNT(*) FROM group_memberships GROUP BY DATE(createdAt);

-- Acompañantes agregados
SELECT DATE(addedAt), COUNT(*) FROM group_companions WHERE status = 'ACTIVE' GROUP BY DATE(addedAt);

-- Pagos responsables (vs antes - debería igualar o bajar)
SELECT DATE(createdAt), COUNT(*) FROM payments 
WHERE memberMembershipId IN (SELECT id FROM member_memberships WHERE isGroupResponsible = true)
GROUP BY DATE(createdAt);

-- Errores en logs
SELECT COUNT(*) FROM error_logs WHERE timestamp > NOW() - INTERVAL 24 HOUR;
```

---

## Contactos de Escalation

- **Backend Lead**: Revisar si hay errores en GroupMembershipsService
- **DB Admin**: Si hay errores de migración
- **QA**: Validar casos de uso en staging
- **DevOps**: Para deployment a producción

---

## Documentación Generada

Ubicaciones de referencias:
- `QUICK_REFERENCE_V3.md` - API documentation
- `TESTING_GUIDE_PHASE4.md` - Guía de testing
- `validate-v3-architecture.sql` - Validaciones BD
- `test/group-memberships.e2e-spec.ts` - Tests E2E
- `ARQUITECTURA_V3_RESUMEN_EJECUTIVO.md` - Arquitectura

---

**Última Actualización**: 9 de diciembre de 2025  
**Status**: 🟢 LISTO PARA DEPLOYMENT  
**Responsable**: DevOps Team  
**Aprobación**: Pendiente de Team Lead
