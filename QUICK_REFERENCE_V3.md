# 🚀 GUÍA RÁPIDA - ARQUITECTURA V3 DE MEMBRESÍAS GRUPALES

## Cambios de API

### Crear Grupo (NUEVO)
```http
POST /group-memberships
Content-Type: application/json

{
  "membershipId": "uuid",
  "responsibleUserId": "uuid",
  "maxMembers": 5,
  "startDate": "2025-12-09T00:00:00Z",
  "endDate": "2026-01-09T00:00:00Z"
}
```
**Resultado**: Grupo + MemberMembership (responsable) + Payment

### Agregar Acompañante (NUEVO - reemplaza addMember)
```http
POST /group-memberships/{groupId}/companions
Content-Type: application/json

{
  "userId": "uuid"
}
```
**Resultado**: GroupCompanion creado (SIN MemberMembership, SIN Payment)

### Remover Acompañante (NUEVO - reemplaza removeMember)
```http
DELETE /group-memberships/{groupId}/companions/{userId}
```
**Resultado**: GroupCompanion marcado como REMOVED (no borrado)

### Cambiar Responsable (NUEVO)
```http
PUT /group-memberships/{groupId}/responsible
Content-Type: application/json

{
  "newResponsibleUserId": "uuid"
}
```
**Resultado**: Transacción atómica (desactiva antiguo, crea nuevo Payment)

### Obtener Grupos como Responsable (NUEVO)
```http
GET /group-memberships/responsible/{userId}
```

### Obtener Grupos como Acompañante (NUEVO)
```http
GET /group-memberships/companion/{userId}
```

---

## Cambios de Modelos

### Membership
```typescript
// ANTES:
type: undefined
parentMembershipId: undefined

// AHORA:
type: 'individual' | 'group'  // enum MembershipType
parentMembershipId: string?    // para herencia de beneficios
```

### MemberMembership
```typescript
// ANTES:
groupMembershipId: undefined

// AHORA:
isGroupResponsible: boolean     // true = responsable del grupo
groupMembershipId: string?      // ID del grupo si es responsable
```

### GroupMembership (SIMPLIFICADA)
```typescript
// ANTES:
{
  id, name, description, membershipId, createdByUserId, maxMembers,
  currentMembers, availableSlots, status, startDate, endDate,
  totalPrice, paidAmount, isPaid, isActive, notes, members, membership
}

// AHORA:
{
  id, membershipId, responsibleUserId, maxMembers, currentMembers,
  availableSlots, companions[], responsible, createdAt, updatedAt
}
```

### Nuevas Clases
```dart
// GroupCompanion
{
  id, groupMembershipId, userId, status ('ACTIVE'|'REMOVED'|'INACTIVE'),
  addedAt, removedAt
}

// ResponsibleInfo
{
  memberId, userId, memberMembershipId, startDate, endDate,
  paymentStatus ('pending'|'paid'|'suspended')
}
```

---

## Cambios de Flutter UI

### En Provider
```dart
// ANTIGUO (NO USAR):
await provider.addMember(groupId, userId);
await provider.removeMember(groupId, userId);

// NUEVO (USAR):
await provider.addCompanion(groupId, userId);
await provider.removeCompanion(groupId, userId);
await provider.changeResponsible(groupId, newUserId);

// NUEVO - Cargar grupos específicos:
await provider.loadGroupsByResponsible(userId);
await provider.loadGroupsByCompanion(userId);
```

### En Widget
```dart
// Mostrar responsable
if (group.responsible != null) {
  Text('Responsable: ${group.responsible.userId}');
  Text('Estado Pago: ${group.responsible.paymentStatus}');
}

// Mostrar acompañantes
for (var companion in group.companions) {
  if (companion.isActive) {
    ListTile(title: Text(companion.userId));
  }
}

// Remover acompañante
onPressed: () {
  provider.removeCompanion(group.id, companion.userId);
}
```

---

## Validaciones Importantes

### En Backend
```typescript
// ✅ Solo responsables generan MemberMembership
if (membership.type === MembershipType.GROUP) {
  throw 'Use GroupMembershipsService';
}

// ✅ Solo responsables generan Payment
const memberMembership = await memberMembershipRepo.findOne({
  where: { isGroupResponsible: true }  // Solo esta query
});
```

### En Flutter
```dart
// ✅ Validar que solo mostrar acompañantes activos
final activeCompanions = group.companions
  .where((c) => c.isActive)
  .toList();

// ✅ No mostrar acompañantes removidos
// (Status es REMOVED, no borrados de DB)
```

---

## Flujo Completo de Creación

```
1. CREAR GRUPO
   POST /group-memberships
   → GroupMembership creado
   → MemberMembership creado (responsable)
   → Payment creado (solo responsable)

2. AGREGAR ACOMPAÑANTE
   POST /group-memberships/{id}/companions
   → GroupCompanion creado
   → SIN MemberMembership
   → SIN Payment

3. REMOVER ACOMPAÑANTE
   DELETE /group-memberships/{id}/companions/{userId}
   → GroupCompanion marcado REMOVED
   → SIN borrado de DB
   → SIN cambios en pagos

4. CAMBIAR RESPONSABLE
   PUT /group-memberships/{id}/responsible
   → MemberMembership antiguo: desactivado
   → MemberMembership nuevo: creado
   → Payment nuevo: generado (transacción atómica)
```

---

## Queries de Base de Datos

### Todos los pagos pendientes
```sql
SELECT p.* FROM payments p
JOIN member_memberships mm ON p.memberMembershipId = mm.id
WHERE mm.paymentStatus = 'pending'
  AND mm.isGroupResponsible = true;  -- ¡Solo responsables!
```

### Grupos activos de un usuario
```sql
-- Como responsable
SELECT gm.* FROM group_memberships gm
WHERE gm.responsibleUserId = ?;

-- Como acompañante
SELECT DISTINCT gm.* FROM group_memberships gm
JOIN group_companions gc ON gm.id = gc.groupMembershipId
WHERE gc.userId = ?
  AND gc.status = 'ACTIVE';
```

### Miembros de un grupo
```sql
-- Responsable
SELECT mm.* FROM member_memberships mm
WHERE mm.groupMembershipId = ?
  AND mm.isGroupResponsible = true;

-- Acompañantes
SELECT gc.* FROM group_companions gc
WHERE gc.groupMembershipId = ?
  AND gc.status = 'ACTIVE';
```

---

## Troubleshooting

### Problema: "addMember not found"
```
Causa: Usando API antigua
Solución: Usar addCompanion() en su lugar
```

### Problema: "Companion no genera Payment"
```
Causa: Diseño correcto (solo responsable paga)
Verificar: Que el usuario es compañero, no responsable
```

### Problema: "Responsable no aparece"
```
Causa: MemberMembership no tiene isGroupResponsible=true
Solución: Verificar changeResponsible() transacción completa
```

### Problema: "Companion no se puede remover"
```
Causa: Puede estar marcado REMOVED, no visible
Solución: Verificar status en DB (REMOVED != borrado)
```

---

## Referencia Rápida de Estados

| Campo | Valores | Significado |
|-------|---------|------------|
| Membership.type | individual, group | Tipo de membresía |
| GroupCompanion.status | ACTIVE, REMOVED, INACTIVE | Estado del acompañante |
| MemberMembership.paymentStatus | pending, paid, suspended | Estado de pago del responsable |
| MemberMembership.isGroupResponsible | true, false | ¿Es responsable del grupo? |

---

## Documentos de Referencia

- **ARQUITECTURA_V3_RESUMEN_EJECUTIVO.md** - Resumen completo
- **PHASE_2_COMPLETION_SUMMARY.md** - Detalles de PHASE 2
- **PHASE_3_COMPLETION.md** - Detalles de PHASE 3
- **ITERACION_3_COMPLETION_REPORT.md** - Reporte técnico

---

**Última Actualización**: 9 de diciembre de 2025
**Status**: ✅ LISTO PARA PRODUCTION
