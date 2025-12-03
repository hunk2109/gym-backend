# Plan de Separación de Funciones por Rol

## Roles del Sistema
1. **ADMIN** - Administrador del sistema
2. **ENCARGADO** - Encargado de la sucursal
3. **EMPLEADO_CAJERO** - Empleado de caja
4. **EMPLEADO_ENTRENADOR** - Empleado entrenador
5. **CLIENTE** - Cliente del gimnasio

---

## Matriz de Acceso por Módulo

### 📊 DASHBOARD
| Función | ADMIN | ENCARGADO | EMPLEADO_CAJERO | EMPLEADO_ENTRENADOR | CLIENTE |
|---------|-------|-----------|-----------------|---------------------|---------|
| Ver dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver todas las métricas | ✅ | ✅ | ❌ | ❌ | ❌ |
| Exportar reportes | ✅ | ✅ | ❌ | ❌ | ❌ |

### 👥 USUARIOS & ROLES
| Función | ADMIN | ENCARGADO | EMPLEADO_CAJERO | EMPLEADO_ENTRENADOR | CLIENTE |
|---------|-------|-----------|-----------------|---------------------|---------|
| Ver lista de usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Asignar roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modificar rol ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cambiar estado usuario | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear empleado | ✅ | ✅ | ❌ | ❌ | ❌ |

### 💳 MEMBRESÍAS
| Función | ADMIN | ENCARGADO | EMPLEADO_CAJERO | EMPLEADO_ENTRENADOR | CLIENTE |
|---------|-------|-----------|-----------------|---------------------|---------|
| Ver todas las membresías | ✅ | ✅ | ✅ | ❌ | ✅* |
| Crear membresía | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editar membresía | ✅ | ✅ | ✅ | ❌ | ❌ |
| Eliminar membresía | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver mi membresía | ✅ | ✅ | ✅ | ✅ | ✅ |
*Solo propia membresía

### 💰 VENTAS & PAGOS
| Función | ADMIN | ENCARGADO | EMPLEADO_CAJERO | EMPLEADO_ENTRENADOR | CLIENTE |
|---------|-------|-----------|-----------------|---------------------|---------|
| Registrar venta | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver todas las ventas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Registrar pago | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver historial de pagos | ✅ | ✅ | ✅ | ❌ | ✅* |
| Procesar devolución | ✅ | ✅ | ❌ | ❌ | ❌ |
*Solo propios pagos

### 📦 PRODUCTOS & INVENTARIO
| Función | ADMIN | ENCARGADO | EMPLEADO_CAJERO | EMPLEADO_ENTRENADOR | CLIENTE |
|---------|-------|-----------|-----------------|---------------------|---------|
| Ver catálogo | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear producto | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar producto | ✅ | ✅ | ❌ | ❌ | ❌ |
| Eliminar producto | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver inventario | ✅ | ✅ | ✅ | ❌ | ❌ |
| Actualizar stock | ✅ | ✅ | ✅ | ❌ | ❌ |

### 🏋️ CLASES & ENTRENAMIENTO
| Función | ADMIN | ENCARGADO | EMPLEADO_CAJERO | EMPLEADO_ENTRENADOR | CLIENTE |
|---------|-------|-----------|-----------------|---------------------|---------|
| Ver clases | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear clase | ✅ | ✅ | ❌ | ✅ | ❌ |
| Editar clase | ✅ | ✅ | ❌ | ✅* | ❌ |
| Eliminar clase | ✅ | ✅ | ❌ | ❌ | ❌ |
| Registrar asistencia | ✅ | ✅ | ❌ | ✅ | ❌ |
| Inscribirse a clase | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver mis clases | ✅ | ✅ | ✅ | ✅ | ✅ |
*Solo propias clases

### ⚙️ CONFIGURACIÓN & EQUIPOS
| Función | ADMIN | ENCARGADO | EMPLEADO_CAJERO | EMPLEADO_ENTRENADOR | CLIENTE |
|---------|-------|-----------|-----------------|---------------------|---------|
| Ver equipos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Crear equipo | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar equipo | ✅ | ✅ | ❌ | ❌ | ❌ |
| Eliminar equipo | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configuración del gimnasio | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Plan de Implementación

### FASE 1: Guards de Autorización
- [ ] Crear `RoleGuard` genérico
- [ ] Crear `@Roles()` decorator
- [ ] Crear `@RequireRole()` decorator para permisos específicos

### FASE 2: Implementar Guards en Controllers
- [ ] Dashboard controller
- [ ] User-roles controller
- [ ] Memberships controller
- [ ] Sales controller
- [ ] Products controller
- [ ] Gym-classes controller
- [ ] Equipment controller
- [ ] Gym-settings controller

### FASE 3: Validar en Services (Doble verificación)
- [ ] Agregar validaciones de rol en cada servicio
- [ ] Logear intentos de acceso no autorizado
- [ ] Retornar errores consistentes

### FASE 4: Filtrar Respuestas
- [ ] Datos sensibles por rol
- [ ] Historial filtrado por permisos
- [ ] Resultados paginados según roles

---

## Cambios Requeridos por Módulo

### Decoradores Requeridos
```typescript
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.ADMIN, UserRole.ENCARGADO)
```

### Endpoints a Proteger
1. **Dashboard**: Solo ADMIN/ENCARGADO
2. **User Management**: Solo ADMIN para roles críticos
3. **Memberships**: ADMIN/ENCARGADO/EMPLEADO_CAJERO
4. **Sales**: ADMIN/ENCARGADO/EMPLEADO_CAJERO
5. **Products**: Lectura para EMPLEADO_ENTRENADOR
6. **Classes**: ADMIN/ENCARGADO/EMPLEADO_ENTRENADOR
7. **Equipment**: Solo ADMIN/ENCARGADO

---

## Estados de Implementación

- [ ] **Fase 1: Guards** - Crear infraestructura
- [ ] **Fase 2: Controllers** - Aplicar decoradores
- [ ] **Fase 3: Services** - Agregar validaciones
- [ ] **Fase 4: Frontend** - Ocultar/habilitar UI por rol
- [ ] **Fase 5: Testing** - Validar acceso y permisos

---

## Notas Importantes

1. **Principio de Mínimos Privilegios**: Cada rol solo tiene acceso a lo que necesita
2. **CLIENTE**: Acceso limitado a su propia información
3. **EMPLEADO_CAJERO**: Acceso a ventas y pagos, sin eliminaciones críticas
4. **EMPLEADO_ENTRENADOR**: Acceso a gestión de clases y equipos
5. **ENCARGADO**: Acceso amplio pero sin modificar roles críticos
6. **ADMIN**: Acceso total al sistema
