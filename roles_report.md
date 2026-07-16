# Distribución de Permisos por Roles en el Backend

## Módulo: `/attendances`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/attendances` | `registerByCode()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| POST | `/attendances/register-by-id` | `registerEmployeeAttendance()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| POST | `/attendances/register-by-name` | `findAll()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/attendances/member/:memberId` | `getAttendanceSummary()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/attendances/:id` | `update()` | ADMIN, ENCARGADO |
| DELETE | `/attendances/:id` | `getByEmployee()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/attendances/employee/:employeeId/summary` | `getEmployeeSummary()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |

## Módulo: `/auth`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/auth/register` | `createUserByAdmin()` | ADMIN |

## Módulo: `/cash-register`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/cash-register/open` | `closeCashRegister()` | ADMIN, EMPLEADO_CAJERO, ENCARGADO |
| GET | `/cash-register/today` | `getHistory()` | ADMIN, EMPLEADO_CAJERO, ENCARGADO |
| GET | `/cash-register/history/:id` | `getStatistics()` | ADMIN, ENCARGADO |
| GET | `/cash-register/discrepancies` | `exportHistoryCSV()` | ADMIN, ENCARGADO |
| GET | `/cash-register/export/history/html` | `exportStatisticsJSON()` | ADMIN, ENCARGADO |

## Módulo: `/classes`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| GET | `/classes/)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE` | `getUpcomingClasses()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO, EMPLEADO_ENTRENADOR, CLIENTE |
| GET | `/classes/level/:level` | `getClassesByTrainer()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO, EMPLEADO_ENTRENADOR, CLIENTE |
| GET | `/classes/stats/:classId` | `getClassById()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO, EMPLEADO_ENTRENADOR, CLIENTE |
| POST | `/classes/)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  @HttpCode(HttpStatus.CREATED)
  async createClass(@Body() createClassDto: CreateClassDto) {
    return this.classesService.createClass(createClassDto);
  }

  / Editar clase - ADMIN/ENCARGADO/EMPLEADO_ENTRENADOR (solo propias` | `updateClass()` | ADMIN, ENCARGADO, EMPLEADO_ENTRENADOR |
| DELETE | `/classes/:id` | `enrollMember()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO, EMPLEADO_ENTRENADOR, CLIENTE |
| DELETE | `/classes/:classId/unenroll/:memberId` | `getClassEnrollments()` | ADMIN, ENCARGADO, EMPLEADO_ENTRENADOR |
| GET | `/classes/member/:memberId` | `getEnrollmentById()` | ADMIN, ENCARGADO, EMPLEADO_ENTRENADOR, CLIENTE |
| PUT | `/classes/:id` | `updateEnrollment()` | ADMIN, ENCARGADO, EMPLEADO_ENTRENADOR |

## Módulo: `/dashboard`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| GET | `/dashboard/stats` | `getMembersCount()` | ADMIN, ENCARGADO |
| GET | `/dashboard/employees/count` | `getTotalRevenue()` | ADMIN, ENCARGADO |
| GET | `/dashboard/sales/monthly` | `getQuarterlySalesStats()` | ADMIN, ENCARGADO |
| GET | `/dashboard/sales/annual` | `getTopProducts()` | ADMIN, ENCARGADO |
| GET | `/dashboard/revenue/sales` | `getMembershipRevenue()` | ADMIN, ENCARGADO |
| GET | `/dashboard/revenue/memberships-by-type` | `getRevenueComparison()` | ADMIN, ENCARGADO |
| GET | `/dashboard/payments/pending` | `getPendingPayments()` | ADMIN, ENCARGADO |

## Módulo: `/equipment`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| GET | `/equipment` | `getEquipmentByCategory()` | ADMIN, ENCARGADO, EMPLEADO_ENTRENADOR |
| GET | `/equipment/location/:location` | `getEquipmentNeedingMaintenance()` | ADMIN, ENCARGADO |
| GET | `/equipment/search` | `getEquipmentStatus()` | ADMIN, ENCARGADO |
| GET | `/equipment/:id` | `createEquipment()` | ADMIN, ENCARGADO |
| PUT | `/equipment/:id` | `updateEquipmentStatus()` | ADMIN, ENCARGADO |
| PATCH | `/equipment/:id/maintenance` | `deleteEquipment()` | ADMIN |

## Módulo: `/groups`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/groups/)
  @UseGuards(JwtAuthGuard, RolesGuard` | `getMyGroups()` | ADMIN, ENCARGADO |
| PUT | `/groups/:groupId` | `updateGroup()` | ADMIN, ENCARGADO |
| DELETE | `/groups/:groupId` | `deleteGroup()` | ADMIN, ENCARGADO |
| POST | `/groups/:groupId/companions` | `addCompanion()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| DELETE | `/groups/:groupId/companions/:companionId` | `removeCompanion()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |

## Módulo: `/gym-settings`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/gym-settings/create` | `create()` | ADMIN |
| PUT | `/gym-settings/)
  @UseGuards(JwtAuthGuard, RolesGuard` | `update()` | ADMIN, ENCARGADO |

## Módulo: `/memberships/access-schedules`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/memberships/access-schedules` | `getSchedulesByMembership()` | ADMIN, ENCARGADO |
| PUT | `/memberships/access-schedules/:scheduleId` | `deleteSchedule()` | ADMIN, ENCARGADO |

## Módulo: `/memberships`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/memberships/seed` | `syncWithPayments()` | ADMIN, ENCARGADO |
| GET | `/memberships/)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE` | `getActiveMemberships()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO, CLIENTE |
| GET | `/memberships/:id` | `createMembership()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| PUT | `/memberships/:id` | `deleteMembership()` | ADMIN |
| POST | `/memberships` | `getPendingPayments()` | ADMIN, ENCARGADO, CLIENTE |
| GET | `/memberships/expiry/check` | `removeMembershipByMemberId()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/memberships/history/:memberId` | `getMemberActiveMembership()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO, CLIENTE, EMPLEADO_ENTRENADOR |
| POST | `/memberships/:id/renew` | `recordPayment()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| DELETE | `/memberships/:id` | `removeMembership()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |

## Módulo: `/payments`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/payments/)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any): Promise<PaymentResponseDto> {
    const userId = req.user?.userId;
    console.log(`[PAYMENTS_CONTROLLER] req.user:`, JSON.stringify(req.user, null, 2));
    console.log(`[PAYMENTS_CONTROLLER] userId extraído:`, userId);
    const result = await this.paymentsService.createPayment(createPaymentDto, userId);
    console.log(`[PAYMENTS_CONTROLLER] Payment guardado con createdBy:`, result.createdBy);
    return result;
  }

  @Get(` | `getAllPaymentsWithoutPagination()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/payments/statistics/overview` | `diagnosisCompletedRegistrations()` | ADMIN |
| GET | `/payments/pending-all` | `payPayment()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| PATCH | `/payments/:id/status` | `remove()` | ADMIN |

## Módulo: `/products`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| GET | `/products` | `getProductsByCategory()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO, EMPLEADO_ENTRENADOR, CLIENTE |
| GET | `/products/low-stock` | `getExpiredProducts()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/products/search` | `getProductById()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO, EMPLEADO_ENTRENADOR, CLIENTE |
| POST | `/products/)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO` | `updateProduct()` | ADMIN, ENCARGADO |
| DELETE | `/products/:id` | `addStock()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| POST | `/products/:id/stock/remove` | `getInventoryValue()` | ADMIN, ENCARGADO |

## Módulo: `/promotions`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/promotions/)
  @Roles(UserRole.ADMIN)
  async create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  @Get(` | `findActive()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| POST | `/promotions/validate` | `validatePromoCode()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/promotions/:id` | `update()` | ADMIN |
| DELETE | `/promotions/:id` | `toggleActive()` | ADMIN |
| POST | `/promotions/:code/apply` | `applyPromotion()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |

## Módulo: `/reports`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| GET | `/reports/promotions` | `getPromotionsSummary()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/reports/promotions/popularity` | `getExpiringPromotions()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/reports/promotions/expired` | `getTodaysBirthdays()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/reports/birthdays/upcoming` | `getBirthdaysThisMonth()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |

## Módulo: `/sales`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| GET | `/sales` | `getSalesStatistics()` | ADMIN, ENCARGADO |
| GET | `/sales/member/:memberId` | `getTopSellingProducts()` | ADMIN, ENCARGADO |
| GET | `/sales/daily-revenue` | `getSaleById()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| POST | `/sales/)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO` | `updateSale()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| DELETE | `/sales/:id` | `deleteSale()` | ADMIN |

## Módulo: `/tables/accounts`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/tables/accounts/:tableId/open` | `getAccount()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/tables/accounts/table/:tableId/open` | `addItemToAccount()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| DELETE | `/tables/accounts/items/:itemId` | `getCurrentTotal()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| PUT | `/tables/accounts/:accountId` | `closeAccount()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| PUT | `/tables/accounts/:accountId/pay` | `cancelAccount()` | ADMIN, ENCARGADO |
| GET | `/tables/accounts` | `getAllOpenAccounts()` | ADMIN, ENCARGADO |

## Módulo: `/tables`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| GET | `/tables` | `getAvailableTables()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/tables/open` | `getTableByNumber()` | ADMIN, ENCARGADO, EMPLEADO_CAJERO |
| GET | `/tables/:id` | `createTable()` | ADMIN, ENCARGADO |
| PUT | `/tables/:id` | `deleteTable()` | ADMIN, ENCARGADO |

## Módulo: `/user-roles`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| POST | `/user-roles/assign/:userId` | `getActiveClients()` | ADMIN |
| GET | `/user-roles/by-role/:role` | `toggleUserActive()` | ADMIN, ENCARGADO |

## Módulo: `/whatsapp-settings`

| Método | Ruta | Función | Roles Permitidos |
|--------|------|---------|------------------|
| GET | `/whatsapp-settings/status` | `logout()` | ADMIN |
| POST | `/whatsapp-settings/restart` | `sendTestMessage()` | ADMIN |

