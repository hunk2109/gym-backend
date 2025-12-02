# API Documentation - Gym Management System

## Base URL
`http://10.10.4.207:3000/api`

## Authentication
All endpoints (except `/auth/register` and `/auth/login`) require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Auth Module (`/auth`)

### 1. Register User
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin"
  }
  ```
- **Response:** `{ user, token }`

### 2. Login
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:** `{ user, token }`

### 3. Logout
- **POST** `/auth/logout`
- **Response:** `{ success: true }`

---

## Members Module (`/members`)

### 1. Get All Members (Paginated)
- **GET** `/members?page=1&limit=10`

### 2. Search Members
- **GET** `/members/search?q=john&page=1&limit=10`

### 3. Get Paid Members
- **GET** `/members/paid?page=1&limit=10`

### 4. Get Unpaid Members
- **GET** `/members/unpaid?page=1&limit=10`

### 5. Get Recent Members
- **GET** `/members/recent?days=30`

### 6. Get Member by ID
- **GET** `/members/:id`

### 7. Create Member
- **POST** `/members`
- **Body:** `{ email, firstName, lastName, documentId, phone, address, city, state }`

### 8. Update Member
- **PUT** `/members/:id`
- **Body:** `{ email, firstName, lastName, phone, address }`

### 9. Delete Member
- **DELETE** `/members/:id`

### 10. Get Member Payment History
- **GET** `/members/:id/payments`

### 11. Get Member Classes
- **GET** `/members/:id/classes`

---

## Memberships Module (`/memberships`)

### 1. Get All Memberships (Paginated)
- **GET** `/memberships?page=1&limit=10`

### 2. Get Active Memberships
- **GET** `/memberships/active?page=1&limit=10`

### 3. Get Membership by ID
- **GET** `/memberships/:id`

### 4. Create Membership
- **POST** `/memberships`
- **Body:** `{ name, description, price, durationMonths, features }`

### 5. Update Membership
- **PUT** `/memberships/:id`
- **Body:** `{ name, price, description, durationMonths }`

### 6. Delete Membership
- **DELETE** `/memberships/:id`

### 7. Assign Membership to Member
- **POST** `/members/:memberId/memberships`
- **Body:** `{ membershipId, startDate, endDate }`

### 8. Get Member's Active Membership
- **GET** `/members/:memberId/memberships/active`

### 9. Get Membership History
- **GET** `/members/:memberId/memberships/history?page=1&limit=10`

### 10. Renew Member Membership
- **POST** `/members/:memberId/memberships/renew`
- **Body:** `{ durationMonths }`

---

## Classes Module (`/classes`)

### 1. Get All Classes (Paginated)
- **GET** `/classes?page=1&limit=10`

### 2. Get Upcoming Classes
- **GET** `/classes/upcoming?days=7`

### 3. Get Classes by Level
- **GET** `/classes/by-level/beginner?page=1&limit=10`

### 4. Get Classes by Trainer
- **GET** `/classes/by-trainer/:trainerId?page=1&limit=10`

### 5. Get Class Statistics
- **GET** `/classes/:id/statistics`

### 6. Get Class by ID
- **GET** `/classes/:id`

### 7. Create Class
- **POST** `/classes`
- **Body:** `{ name, description, trainer, schedule, capacity, level, room }`

### 8. Update Class
- **PUT** `/classes/:id`
- **Body:** `{ name, description, schedule, capacity }`

### 9. Delete Class
- **DELETE** `/classes/:id`

### 10. Enroll Member in Class
- **POST** `/classes/:classId/enrollments`
- **Body:** `{ memberId }`

### 11. Get Member Class Enrollments
- **GET** `/members/:memberId/classes`

### 12. Get Class Enrollment by ID
- **GET** `/classes/:classId/enrollments/:enrollmentId`

### 13. Update Class Enrollment
- **PUT** `/classes/:classId/enrollments/:enrollmentId`
- **Body:** `{ status, sessionsAttended }`

### 14. Unenroll Member from Class
- **DELETE** `/classes/:classId/enrollments/:enrollmentId`

---

## Payments Module (`/payments`)

### 1. Create Payment
- **POST** `/payments`
- **Body:** `{ memberId, amount, paymentMethod, status, paymentType }`

### 2. Get All Payments (Paginated)
- **GET** `/payments?page=1&limit=10`

### 3. Get Payment by ID
- **GET** `/payments/:id`

### 4. Update Payment
- **PUT** `/payments/:id`
- **Body:** `{ status, amount, discount }`

### 5. Delete Payment
- **DELETE** `/payments/:id`

### 6. Get Payments by Status
- **GET** `/payments/by-status/completed?page=1&limit=10`

### 7. Get Pending Overdue Payments
- **GET** `/payments/pending-overdue?daysOverdue=0`

### 8. Get Payments by Date Range
- **GET** `/payments/date-range?startDate=2024-01-01&endDate=2024-12-31&page=1&limit=10`

### 9. Get Member Payments
- **GET** `/payments/member/:memberId?page=1&limit=10`

### 10. Get Member Payment History
- **GET** `/payments/member/:memberId/history`

### 11. Record Refund
- **POST** `/payments/:id/refund`
- **Body:** `{ refundAmount? }`

### 12. Get Payment Statistics
- **GET** `/payments/statistics/overview`

---

## Reports Module (`/reports`)

### 1. Get Sales Report
- **GET** `/reports/sales?dateRange=monthly&startDate=2024-01-01&endDate=2024-12-31`
- **Response:** `{ totalSales, totalRevenue, averageSaleValue, salesTrend, topProducts }`

### 2. Get Membership Report
- **GET** `/reports/memberships?dateRange=monthly`
- **Response:** `{ totalMembers, activeMembers, renewalRate, membershipMix, expiryForecast }`

### 3. Get Payment Report
- **GET** `/reports/payments?dateRange=monthly`
- **Response:** `{ totalCollected, totalPending, collectionRate, paymentMethodBreakdown }`

### 4. Get Revenue Report
- **GET** `/reports/revenue?dateRange=monthly`
- **Response:** `{ totalRevenue, revenueSources, monthlyTrend, projectedRevenue }`

### 5. Get Member Activity Report
- **GET** `/reports/activity?dateRange=monthly`
- **Response:** `{ totalMembers, activeMembers, newMembersThisMonth, classAttendanceRate }`

### 6. Get Refund Analysis
- **GET** `/reports/refunds?dateRange=monthly`
- **Response:** `{ totalRefunds, totalRefundAmount, refundRate, refundTrend }`

### 7. Get Forecast Report
- **GET** `/reports/forecast`
- **Response:** `{ nextMonthRevenueForecast, membershipGrowthForecast, recommendations }`

### 8. Get Comprehensive Report
- **GET** `/reports/comprehensive?dateRange=monthly`
- **Response:** `{ salesReport, membershipReport, paymentReport, revenueReport, keyMetrics, alerts }`

---

## Dashboard Module (`/dashboard`)

### 1. Get Overall Statistics
- **GET** `/dashboard/stats`

### 2. Get Members Count
- **GET** `/dashboard/members/count`

### 3. Get Employees Count
- **GET** `/dashboard/employees/count`

### 4. Get Total Revenue
- **GET** `/dashboard/revenue/total`

### 5. Get Monthly Sales
- **GET** `/dashboard/sales/monthly`

### 6. Get Quarterly Sales
- **GET** `/dashboard/sales/quarterly`

### 7. Get Annual Sales
- **GET** `/dashboard/sales/annual`

### 8. Get Top Products
- **GET** `/dashboard/products/top`

---

## Products Module (`/products`)

### 1. Get All Products (Paginated)
- **GET** `/products?page=1&limit=10`

### 2. Get Product by ID
- **GET** `/products/:id`

### 3. Create Product
- **POST** `/products`
- **Body:** `{ name, description, price, category, stock }`

### 4. Update Product
- **PUT** `/products/:id`
- **Body:** `{ name, price, stock, category }`

### 5. Delete Product
- **DELETE** `/products/:id`

### 6. Get Products by Category
- **GET** `/products/by-category/supplements?page=1`

### 7. Get Low Stock Products
- **GET** `/products/stock/low?threshold=10`

### 8. Get Expired Products
- **GET** `/products/expired`

### 9. Update Product Stock
- **PATCH** `/products/:id/stock`
- **Body:** `{ quantity }`

### 10. Get Product Statistics
- **GET** `/products/statistics`

### 11. Search Products
- **GET** `/products/search?q=protein`

### 12. Get Products by Price Range
- **GET** `/products/price-range?min=100&max=500`

---

## Sales Module (`/sales`)

### 1. Get All Sales (Paginated)
- **GET** `/sales?page=1&limit=10`

### 2. Get Sale by ID
- **GET** `/sales/:id`

### 3. Create Sale
- **POST** `/sales`
- **Body:** `{ memberId, items: [{ productId, quantity, price }], paymentMethod }`

### 4. Update Sale
- **PUT** `/sales/:id`
- **Body:** `{ status, discount }`

### 5. Delete Sale
- **DELETE** `/sales/:id`

### 6. Get Sales by Date Range
- **GET** `/sales/date-range?startDate=2024-01-01&endDate=2024-12-31`

### 7. Get Sales by Employee
- **GET** `/sales/by-employee/:employeeId`

### 8. Get Sales Statistics
- **GET** `/sales/statistics`

### 9. Get Sales by Member
- **GET** `/sales/by-member/:memberId`

### 10. Get Top Selling Products
- **GET** `/sales/top-products?limit=5`

---

## Employees Module (`/employees`)

### 1. Get All Employees (Paginated)
- **GET** `/employees?page=1&limit=10`

### 2. Get Employee by ID
- **GET** `/employees/:id`

### 3. Create Employee
- **POST** `/employees`
- **Body:** `{ firstName, lastName, email, phone, role, salary }`

### 4. Update Employee
- **PUT** `/employees/:id`
- **Body:** `{ firstName, lastName, phone, salary }`

### 5. Delete Employee
- **DELETE** `/employees/:id`

### 6. Get Active Employees
- **GET** `/employees/active`

### 7. Get Employee Statistics
- **GET** `/employees/statistics`

### 8. Toggle Employee Active Status
- **PATCH** `/employees/:id/toggle-active`

---

## Gym Settings Module (`/settings`)

### 1. Get Gym Settings
- **GET** `/settings`

### 2. Update Gym Settings
- **PUT** `/settings`
- **Body:** `{ gymName, address, phone, email, operatingHours }`

---

## Response Format

### Success Response
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Operación exitosa",
  "data": { /* response data */ },
  "timestamp": "2024-12-01T10:30:00.000Z",
  "path": "/api/members"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error de validación",
  "error": "BadRequestException",
  "path": "/api/members",
  "timestamp": "2024-12-01T10:30:00.000Z",
  "details": "email: Email must be valid"
}
```

### Paginated Response
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Datos obtenidos",
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2024-12-01T10:30:00.000Z"
}
```

---

## Status Codes

- **200**: OK - Operación exitosa
- **201**: Created - Recurso creado
- **204**: No Content - Operación exitosa sin contenido
- **400**: Bad Request - Solicitud inválida
- **401**: Unauthorized - No autenticado
- **403**: Forbidden - No autorizado
- **404**: Not Found - Recurso no encontrado
- **409**: Conflict - Recurso duplicado
- **500**: Internal Server Error - Error del servidor

---

## Date Ranges for Reports

- `daily` - Últimas 24 horas
- `weekly` - Últimos 7 días
- `monthly` - Último mes
- `quarterly` - Últimos 3 meses
- `yearly` - Último año
- `custom` - Rango personalizado (requiere startDate y endDate)

---

## Query Parameters

- `page` - Número de página (default: 1)
- `limit` - Registros por página (default: 10, máximo: 100)
- `search` / `q` - Búsqueda por texto
- `dateRange` - Rango de fechas
- `startDate` - Fecha de inicio (ISO 8601)
- `endDate` - Fecha de fin (ISO 8601)

---

## Enums

### User Roles
- `admin` - Administrador
- `manager` - Gerente
- `trainer` - Entrenador
- `member` - Miembro

### Payment Methods
- `cash` - Efectivo
- `card` - Tarjeta
- `transfer` - Transferencia
- `check` - Cheque

### Payment Status
- `pending` - Pendiente
- `completed` - Completado
- `failed` - Fallido
- `refunded` - Reembolsado

### Class Levels
- `beginner` - Principiante
- `intermediate` - Intermedio
- `advanced` - Avanzado

---

## Total Endpoints: 84

- Auth: 3
- Members: 11
- Memberships: 10
- Classes: 14
- Payments: 12
- Reports: 8
- Dashboard: 8
- Products: 12
- Sales: 10
- Employees: 8
- Gym Settings: 2
- Additional: 6 (search, statistics, etc.)

