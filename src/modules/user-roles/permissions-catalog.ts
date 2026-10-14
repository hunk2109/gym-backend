export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  module: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Punto de Venta
  {
    id: 'pos:access',
    name: 'Acceso a Punto de Venta',
    description: 'Permite abrir y ver la pantalla del Punto de Venta',
    module: 'Punto de Venta',
  },
  {
    id: 'pos:sell',
    name: 'Cobrar y Realizar Ventas',
    description: 'Permite agregar productos al carrito y procesar cobros',
    module: 'Punto de Venta',
  },
  {
    id: 'pos:void_sale',
    name: 'Anular / Cancelar Ventas',
    description: 'Permite anular ventas del turno activo y reponer stock',
    module: 'Punto de Venta',
  },
  {
    id: 'pos:apply_discount',
    name: 'Aplicar Descuentos',
    description: 'Permite aplicar descuentos manuales en mostrador',
    module: 'Punto de Venta',
  },

  // Caja & Arqueo
  {
    id: 'cash:access',
    name: 'Acceso a Caja y Arqueo',
    description: 'Permite ver el control de caja y ventas del turno',
    module: 'Caja & Arqueo',
  },
  {
    id: 'cash:open',
    name: 'Abrir Caja / Turno',
    description: 'Permite registrar el fondo inicial para abrir la caja',
    module: 'Caja & Arqueo',
  },
  {
    id: 'cash:close',
    name: 'Cerrar Caja y Arqueo',
    description: 'Permite realizar el arqueo, desglose de billetes y cierre',
    module: 'Caja & Arqueo',
  },
  {
    id: 'cash:withdraw',
    name: 'Registrar Salidas de Efectivo',
    description: 'Permite registrar gastos y retiros de efectivo de la gaveta',
    module: 'Caja & Arqueo',
  },
  {
    id: 'cash:view_history',
    name: 'Ver Historial de Cierres',
    description: 'Permite ver turnos anteriores y el detalle de ventas pasadas',
    module: 'Caja & Arqueo',
  },

  // Socios & Membresías
  {
    id: 'members:access',
    name: 'Acceso a Socios y Membresías',
    description: 'Permite consultar el listado y detalle de socios',
    module: 'Socios & Membresías',
  },
  {
    id: 'members:create',
    name: 'Registrar Nuevos Socios',
    description: 'Permite crear nuevos clientes y perfiles de socios',
    module: 'Socios & Membresías',
  },
  {
    id: 'members:edit',
    name: 'Editar Datos de Socios',
    description: 'Permite actualizar datos personales, teléfono y dirección',
    module: 'Socios & Membresías',
  },
  {
    id: 'members:delete',
    name: 'Eliminar / Desactivar Socios',
    description: 'Permite dar de baja o desactivar cuentas de socios',
    module: 'Socios & Membresías',
  },
  {
    id: 'members:assign_membership',
    name: 'Asignar / Renovar Membresías',
    description: 'Permite cobrar planes, planes grupales y suscripciones',
    module: 'Socios & Membresías',
  },
  {
    id: 'members:cancel_membership',
    name: 'Cancelar Membresía',
    description: 'Permite anular o cancelar planes de socios',
    module: 'Socios & Membresías',
  },

  // Inventario & Productos
  {
    id: 'inventory:access',
    name: 'Acceso a Inventario',
    description: 'Permite ver el catálogo de productos y existencias',
    module: 'Inventario & Productos',
  },
  {
    id: 'inventory:create',
    name: 'Crear Nuevos Productos',
    description: 'Permite dar de alta productos en el inventario',
    module: 'Inventario & Productos',
  },
  {
    id: 'inventory:edit',
    name: 'Editar Productos y Precios',
    description: 'Permite modificar nombres, costos, precios y alertas',
    module: 'Inventario & Productos',
  },
  {
    id: 'inventory:adjust_stock',
    name: 'Ajustar Stock / Entradas',
    description: 'Permite modificar unidades físicas y registrar compras',
    module: 'Inventario & Productos',
  },
  {
    id: 'inventory:delete',
    name: 'Eliminar Productos',
    description: 'Permite remover productos del inventario',
    module: 'Inventario & Productos',
  },

  // Nómina & Empleados
  {
    id: 'employees:access',
    name: 'Acceso a Nómina y Empleados',
    description: 'Permite consultar la plantilla de empleados',
    module: 'Nómina & Empleados',
  },
  {
    id: 'employees:manage',
    name: 'Crear y Editar Empleados',
    description: 'Permite registrar empleados y modificar sus datos laborales',
    module: 'Nómina & Empleados',
  },
  {
    id: 'employees:payroll',
    name: 'Procesar Pagos de Nómina',
    description: 'Permite liquidar y pagar salarios a empleados',
    module: 'Nómina & Empleados',
  },
  {
    id: 'employees:assign_role',
    name: 'Asignar Roles a Usuarios',
    description: 'Permite convertir usuarios o cambiar roles en el sistema',
    module: 'Nómina & Empleados',
  },

  // Control de Acceso
  {
    id: 'access:access',
    name: 'Acceso a Control de Acceso',
    description: 'Permite ver el registro de entradas y torniquete',
    module: 'Control de Acceso',
  },
  {
    id: 'access:manual_entry',
    name: 'Marcar Entrada Manual',
    description: 'Permite validar y dar paso manual a socios en torniquete',
    module: 'Control de Acceso',
  },

  // Envíos Masivos (WhatsApp)
  {
    id: 'campaigns:access',
    name: 'Acceso a Envíos Masivos',
    description: 'Permite ver campañas de WhatsApp y plantillas',
    module: 'Envíos Masivos',
  },
  {
    id: 'campaigns:send',
    name: 'Enviar Campañas Masivas',
    description: 'Permite lanzar mensajes masivos de WhatsApp a socios',
    module: 'Envíos Masivos',
  },

  // Reportes & Métricas
  {
    id: 'reports:access',
    name: 'Acceso a Reportes y Métricas',
    description: 'Permite ver ingresos, estadísticas y métricas del negocio',
    module: 'Reportes & Métricas',
  },
  {
    id: 'reports:export',
    name: 'Exportar Reportes (Excel / PDF)',
    description: 'Permite descargar información financiera o de auditoría',
    module: 'Reportes & Métricas',
  },

  // Configuración
  {
    id: 'settings:access',
    name: 'Acceso a Configuración',
    description: 'Permite ingresar a la pantalla de configuración',
    module: 'Configuración',
  },
  {
    id: 'settings:edit_gym',
    name: 'Editar Datos de Empresa y Gimnasio',
    description: 'Permite modificar RNC, nombre, teléfonos y formato de ticket',
    module: 'Configuración',
  },
  {
    id: 'settings:manage_roles',
    name: 'Gestionar Roles y Permisos',
    description: 'Permite modificar las acciones habilitadas para cada rol',
    module: 'Configuración',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: SYSTEM_PERMISSIONS.map((p) => p.id),
  encargado: [
    'pos:access',
    'pos:sell',
    'pos:void_sale',
    'pos:apply_discount',
    'cash:access',
    'cash:open',
    'cash:close',
    'cash:withdraw',
    'cash:view_history',
    'members:access',
    'members:create',
    'members:edit',
    'members:assign_membership',
    'members:cancel_membership',
    'inventory:access',
    'inventory:create',
    'inventory:edit',
    'inventory:adjust_stock',
    'employees:access',
    'access:access',
    'access:manual_entry',
    'campaigns:access',
    'campaigns:send',
    'reports:access',
    'reports:export',
    'settings:access',
    'settings:edit_gym',
  ],
  empleado_cajero: [
    'pos:access',
    'pos:sell',
    'pos:void_sale',
    'pos:apply_discount',
    'cash:access',
    'cash:open',
    'cash:close',
    'cash:withdraw',
    'members:access',
    'members:create',
    'members:edit',
    'members:assign_membership',
    'inventory:access',
    'access:access',
    'access:manual_entry',
  ],
  empleado_entrenador: [
    'members:access',
    'access:access',
  ],
  cliente: [],
};
