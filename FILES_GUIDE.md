═══════════════════════════════════════════════════════════════════

📁 GUÍA DE ARCHIVOS DEL SISTEMA RBAC

═══════════════════════════════════════════════════════════════════

BACKEND - SEGURIDAD Y PERMISOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 gym-backend/src/modules/auth/

Core Security:
  ├─ guards/
  │  ├─ jwt-auth.guard.ts           [Valida JWT token]
  │  └─ roles.guard.ts               [Valida @Roles() decorator]
  │
  ├─ decorators/
  │  ├─ roles.decorator.ts           [Define @Roles(...roles)]
  │  └─ require-role.decorator.ts    [Define @RequireRole(role)]
  │
  ├─ services/
  │  ├─ permissions.service.ts       [Doble validación + logging]
  │  └─ response-filter.service.ts   [Filtra datos sensibles]
  │
  ├─ interceptors/
  │  ├─ response-filter.interceptor.ts [Aplica filtrado global]
  │  └─ index.ts                     [Exporta interceptor]
  │
  ├─ auth.module.ts                 [Exporta servicios]
  ├─ auth.service.ts                [Autenticación]
  ├─ auth.controller.ts             [Endpoints de auth]
  └─ jwt.strategy.ts                [Estrategia JWT]

═══════════════════════════════════════════════════════════════════

BACKEND - CONTROLADORES PROTEGIDOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 gym-backend/src/modules/

1. dashboard/
   └─ dashboard.controller.ts        [@Roles(ADMIN, ENCARGADO)]

2. user-roles/
   └─ user-roles.controller.ts       [@Roles(ADMIN) para assign]
   └─ user-roles.service.ts          [Con PermissionsService]

3. memberships/
   └─ memberships.controller.ts      [@UseGuards + @Roles()]

4. sales/
   └─ sales.controller.ts            [@Roles(ADMIN, ENCARGADO, CAJERO)]
   └─ sales.service.ts               [Con logging de ventas]

5. payments/
   └─ payments.controller.ts         [@Roles(ADMIN, ENCARGADO, CAJERO)]
   └─ payments.service.ts            [Con PermissionsService]

6. products/
   └─ products.controller.ts         [@Roles para create/edit/delete]
   └─ products.service.ts            [Con validación]

7. classes/
   └─ classes.controller.ts          [@Roles(ADMIN, ENCARGADO, TRAINER)]

8. equipment/
   └─ equipment.controller.ts        [@Roles(ADMIN, ENCARGADO) para write]

9. gym-settings/
   └─ gym-settings.controller.ts     [@Roles para write]

═══════════════════════════════════════════════════════════════════

BACKEND - MAIN APP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 gym-backend/src/

├─ app.module.ts                    [Registra ResponseFilterInterceptor]
├─ main.ts                          [Entry point]
│
└─ entities/
   └─ user.entity.ts                [Define UserRole enum]

═══════════════════════════════════════════════════════════════════

BACKEND - TESTS E2E
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 gym-backend/test/

├─ rbac.e2e-spec.ts                 [35+ tests de permisos] ⭐ PRINCIPAL
├─ app.e2e-spec.ts                  [Test básico existente]
└─ jest-e2e.json                    [Configuración Jest para E2E]

═══════════════════════════════════════════════════════════════════

FRONTEND - PROVIDERS Y ESTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 sggi/lib/providers/

├─ auth_provider.dart               [⭐ NUEVO] 
│  ├─ AuthNotifier (StateNotifier)
│  ├─ authProvider (User? | null)
│  ├─ userRoleProvider
│  ├─ isAuthenticatedProvider
│  └─ Helpers: isAdmin, isManager, etc.
│
└─ services_provider.dart           [Actualizado para incluir auth]

═══════════════════════════════════════════════════════════════════

FRONTEND - WIDGETS Y COMPONENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 sggi/lib/widgets/

├─ role_protected_screen.dart       [⭐ NUEVO]
│  ├─ RoleProtectedScreen (Widget)
│  └─ UserRoleExtension
│
└─ app_drawer.dart                  [Actualizado]
   ├─ ConsumerWidget (ahora)
   ├─ Lee authProvider
   └─ Visibilidad condicional

═══════════════════════════════════════════════════════════════════

FRONTEND - SCREENS PROTEGIDAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 sggi/lib/screens/

1. auth/
   └─ login_screen.dart             [Actualizado]
      └─ Ahora: ref.read(authProvider.notifier).setUser(user)

2. employees/
   └─ user_roles_management_screen.dart [Protegida: Solo ADMIN]

3. sales/
   └─ sales_screen.dart             [Protegida: Staff only]

4. inventory/
   └─ inventory_dashboard_screen.dart [Protegida: ADMIN/ENCARGADO]

═══════════════════════════════════════════════════════════════════

DOCUMENTACIÓN TÉCNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 gym-backend/

├─ RBAC_SYSTEM_COMPLETE.txt         [Resumen ejecutivo completo]
├─ QUICK_VALIDATION.md              [Guía de validación rápida]
├─ PROJECT_COMPLETION_SUMMARY.txt   [Resumen de proyecto]
├─ FASE_10_COMPLETE.txt             [Detalles filtrado de respuestas]
├─ FASE_11_COMPLETE.txt             [Detalles frontend]
├─ FASE_12_COMPLETE.txt             [Detalles testing]
└─ (Archivos históricos de fases anteriores)

═══════════════════════════════════════════════════════════════════

CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 gym-backend/

├─ package.json                     [Contiene script test:e2e]
├─ tsconfig.json                    [Configuración TypeScript]
├─ eslint.config.mjs                [Configuración ESLint]
└─ docker-compose.yml               [BD para testing]

═══════════════════════════════════════════════════════════════════

ESTRUCTURA VISUAL:

Backend:
  gym-backend/
  ├─ src/
  │  ├─ modules/
  │  │  ├─ auth/             [🔐 CORE - Guards, Decorators, Services]
  │  │  ├─ dashboard/        [🔒 Protected]
  │  │  ├─ user-roles/       [🔒 Protected]
  │  │  ├─ sales/            [🔒 Protected]
  │  │  ├─ payments/         [🔒 Protected]
  │  │  ├─ products/         [🔒 Protected]
  │  │  ├─ classes/          [🔒 Protected]
  │  │  ├─ equipment/        [🔒 Protected]
  │  │  ├─ memberships/      [🔒 Protected]
  │  │  └─ gym-settings/     [🔒 Protected]
  │  ├─ entities/            [User con UserRole enum]
  │  ├─ app.module.ts        [Registra Interceptor global]
  │  └─ main.ts
  │
  ├─ test/
  │  └─ rbac.e2e-spec.ts     [✅ 35+ Tests E2E] ⭐ PRINCIPAL
  │
  ├─ package.json            [npm run test:e2e]
  └─ Documentación completa

Frontend:
  sggi/
  ├─ lib/
  │  ├─ providers/
  │  │  ├─ auth_provider.dart       [⭐ NUEVO - Estado global]
  │  │  └─ services_provider.dart   [Actualizado]
  │  │
  │  ├─ widgets/
  │  │  ├─ role_protected_screen.dart [⭐ NUEVO]
  │  │  └─ app_drawer.dart           [Actualizado]
  │  │
  │  └─ screens/
  │     ├─ auth/login_screen.dart    [Actualizado]
  │     ├─ employees/user_roles_...  [🔒 Protegida]
  │     ├─ sales/sales_screen.dart   [🔒 Protegida]
  │     └─ inventory/inventory_...   [🔒 Protegida]
  │
  └─ Modelos actualizados

═══════════════════════════════════════════════════════════════════

CÓMO NAVEGAR:

Para entender RBAC:
  1. Lee: RBAC_SYSTEM_COMPLETE.txt
  2. Revisa: gym-backend/src/modules/auth/
  3. Mira tests: gym-backend/test/rbac.e2e-spec.ts

Para validar:
  1. Lee: QUICK_VALIDATION.md
  2. Ejecuta: npm run test:e2e
  3. Revisa logs de PermissionsService

Para agregar nuevo rol:
  1. Actualiza UserRole enum en user.entity.ts
  2. Actualiza PermissionsService
  3. Actualiza ResponseFilterService
  4. Agrega tests en rbac.e2e-spec.ts
  5. Actualiza AppDrawer

═══════════════════════════════════════════════════════════════════

BÚSQUEDA RÁPIDA:

Guards:           gym-backend/src/modules/auth/guards/
Decorators:       gym-backend/src/modules/auth/decorators/
Services:         gym-backend/src/modules/auth/services/
Interceptors:     gym-backend/src/modules/auth/interceptors/
Tests:            gym-backend/test/rbac.e2e-spec.ts
Frontend Auth:    sggi/lib/providers/auth_provider.dart
Frontend UI:      sggi/lib/widgets/role_protected_screen.dart
Documentación:    gym-backend/RBAC_SYSTEM_COMPLETE.txt

═══════════════════════════════════════════════════════════════════

REFERENCIAS RÁPIDAS:

Ejecutar tests:
  npm run test:e2e

Ejecutar solo RBAC:
  npm run test:e2e -- rbac.e2e-spec

Backend:
  npm run start:dev

Frontend:
  flutter run

═══════════════════════════════════════════════════════════════════

Estado: ✅ TODOS LOS ARCHIVOS LISTOS

═══════════════════════════════════════════════════════════════════
