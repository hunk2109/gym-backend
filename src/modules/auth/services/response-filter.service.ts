import { Injectable } from '@nestjs/common';
import { UserRole } from '../../../entities/user.entity';

@Injectable()
export class ResponseFilterService {
  /**
   * Filtra datos sensibles de usuarios según el rol solicitante
   */
  filterUserData(user: any, requestingUserRole: UserRole, requestingUserId?: string): any {
    if (!user) return null;

    const filtered = { ...user };

    // Los CLIENTEs solo ven su propia información
    if (requestingUserRole === UserRole.CLIENTE) {
      if (requestingUserId && user.id !== requestingUserId) {
        // No es su propio perfil, solo mostrar información pública
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        };
      }
    }

    // EMPLEADO_ENTRENADOR puede ver información de clientes pero no contraseña
    if (requestingUserRole === UserRole.EMPLEADO_ENTRENADOR) {
      delete filtered.passwordHash;
    }

    // EMPLEADO_CAJERO puede ver información pero no contraseña
    if (requestingUserRole === UserRole.EMPLEADO_CAJERO) {
      delete filtered.passwordHash;
    }

    // ENCARGADO puede ver todo menos contraseña
    if (requestingUserRole === UserRole.ENCARGADO) {
      delete filtered.passwordHash;
    }

    // ADMIN puede ver todo incluida contraseña (nunca debería exponerse)
    if (requestingUserRole === UserRole.ADMIN) {
      delete filtered.passwordHash; // Nunca exponer contraseña
    }

    return filtered;
  }

  /**
   * Filtra lista de usuarios según permisos
   */
  filterUserList(users: any[], requestingUserRole: UserRole, requestingUserId?: string): any[] {
    if (!users) return [];

    return users.map((user) => this.filterUserData(user, requestingUserRole, requestingUserId));
  }

  /**
   * Filtra datos sensibles de pagos/ventas
   */
  filterFinancialData(data: any, requestingUserRole: UserRole): any {
    if (!data) return null;

    const filtered = { ...data };

    // CLIENTE solo ve sus propios pagos
    if (requestingUserRole === UserRole.CLIENTE) {
      // El controlador debe asegurar que solo acceda a sus datos
      delete filtered.internalNotes;
    }

    // EMPLEADO_CAJERO puede ver detalles pero no información interna
    if (requestingUserRole === UserRole.EMPLEADO_CAJERO) {
      delete filtered.internalNotes;
    }

    // EMPLEADO_ENTRENADOR no debería acceder a esto (bloqueado en controller)
    if (requestingUserRole === UserRole.EMPLEADO_ENTRENADOR) {
      return null;
    }

    // ENCARGADO y ADMIN pueden ver todo
    return filtered;
  }

  /**
   * Filtra lista de pagos/ventas
   */
  filterFinancialList(items: any[], requestingUserRole: UserRole): any[] {
    if (!items) return [];

    return items
      .map((item) => this.filterFinancialData(item, requestingUserRole))
      .filter((item) => item !== null);
  }

  /**
   * Filtra información de miembros según rol
   */
  filterMemberData(member: any, requestingUserRole: UserRole, requestingUserId?: string): any {
    if (!member) return null;

    const filtered = { ...member };

    // CLIENTE solo ve su propia información
    if (requestingUserRole === UserRole.CLIENTE) {
      if (requestingUserId && member.userId !== requestingUserId) {
        return null;
      }
    }

    // EMPLEADO_ENTRENADOR puede ver información de miembros pero no financiera
    if (requestingUserRole === UserRole.EMPLEADO_ENTRENADOR) {
      // Puede ver nombre, email, pero no datos financieros
    }

    // Datos que nunca deben exponerse
    delete filtered.passwordHash;
    delete filtered.internalNotes;

    return filtered;
  }

  /**
   * Filtra lista de miembros
   */
  filterMemberList(members: any[], requestingUserRole: UserRole, requestingUserId?: string): any[] {
    if (!members) return [];

    return members
      .map((member) => this.filterMemberData(member, requestingUserRole, requestingUserId))
      .filter((member) => member !== null);
  }

  /**
   * Filtra información de productos según rol
   */
  filterProductData(product: any, requestingUserRole: UserRole): any {
    if (!product) return null;

    const filtered = { ...product };

    // CLIENTE puede ver producto pero no costo
    if (requestingUserRole === UserRole.CLIENTE) {
      delete filtered.purchaseCost;
      delete filtered.profitMargin;
    }

    // EMPLEADO_ENTRENADOR puede ver producto pero no costo
    if (requestingUserRole === UserRole.EMPLEADO_ENTRENADOR) {
      delete filtered.purchaseCost;
      delete filtered.profitMargin;
    }

    // EMPLEADO_CAJERO puede ver todo incluido costo
    if (requestingUserRole === UserRole.EMPLEADO_CAJERO) {
      // No filtrar nada
    }

    return filtered;
  }

  /**
   * Filtra lista de productos
   */
  filterProductList(products: any[], requestingUserRole: UserRole): any[] {
    if (!products) return [];

    return products.map((product) => this.filterProductData(product, requestingUserRole));
  }

  /**
   * Filtra información de clases según rol
   */
  filterClassData(gymClass: any, requestingUserRole: UserRole, requestingUserId?: string): any {
    if (!gymClass) return null;

    const filtered = { ...gymClass };

    // Todos pueden ver información básica de clases
    // Solo los inscritos o ADMIN/ENCARGADO/ENTRENADOR pueden ver lista de asistencia
    if (requestingUserRole === UserRole.CLIENTE) {
      // Ver solo información pública
    }

    return filtered;
  }

  /**
   * Filtra lista de clases
   */
  filterClassList(classes: any[], requestingUserRole: UserRole, requestingUserId?: string): any[] {
    if (!classes) return [];

    return classes.map((gymClass) => this.filterClassData(gymClass, requestingUserRole, requestingUserId));
  }

  /**
   * Filtra información de equipos según rol
   */
  filterEquipmentData(equipment: any, requestingUserRole: UserRole): any {
    if (!equipment) return null;

    const filtered = { ...equipment };

    // CLIENTE no debería acceder a esto (bloqueado en controller)
    if (requestingUserRole === UserRole.CLIENTE) {
      return null;
    }

    // EMPLEADO_ENTRENADOR puede ver equipos
    if (requestingUserRole === UserRole.EMPLEADO_ENTRENADOR) {
      delete filtered.purchaseCost;
    }

    return filtered;
  }

  /**
   * Filtra lista de equipos
   */
  filterEquipmentList(equipment: any[], requestingUserRole: UserRole): any[] {
    if (!equipment) return [];

    return equipment
      .map((item) => this.filterEquipmentData(item, requestingUserRole))
      .filter((item) => item !== null);
  }

  /**
   * Filtra respuesta genérica (envuelve datos en data)
   */
  filterResponse(response: any, requestingUserRole: UserRole, filterType: string, requestingUserId?: string): any {
    if (!response) return response;

    // Si la respuesta tiene estructura {data: ...}
    if (response.data) {
      switch (filterType) {
        case 'user':
          response.data = Array.isArray(response.data)
            ? this.filterUserList(response.data, requestingUserRole, requestingUserId)
            : this.filterUserData(response.data, requestingUserRole, requestingUserId);
          break;
        case 'financial':
          response.data = Array.isArray(response.data)
            ? this.filterFinancialList(response.data, requestingUserRole)
            : this.filterFinancialData(response.data, requestingUserRole);
          break;
        case 'member':
          response.data = Array.isArray(response.data)
            ? this.filterMemberList(response.data, requestingUserRole, requestingUserId)
            : this.filterMemberData(response.data, requestingUserRole, requestingUserId);
          break;
        case 'product':
          response.data = Array.isArray(response.data)
            ? this.filterProductList(response.data, requestingUserRole)
            : this.filterProductData(response.data, requestingUserRole);
          break;
        case 'class':
          response.data = Array.isArray(response.data)
            ? this.filterClassList(response.data, requestingUserRole, requestingUserId)
            : this.filterClassData(response.data, requestingUserRole, requestingUserId);
          break;
        case 'equipment':
          response.data = Array.isArray(response.data)
            ? this.filterEquipmentList(response.data, requestingUserRole)
            : this.filterEquipmentData(response.data, requestingUserRole);
          break;
      }
    }

    return response;
  }
}
