# 🇩🇴 Payroll Module - Implementación Dominicana

## 📋 Descripción

Módulo completo de gestión de nómina con soporte nativo para deducciones dominicanas (AFP, ISR, TSS). El sistema calcula automáticamente el neto a pagar según la legislación dominicana actual.

## 🏗️ Arquitectura

### Entity: Payroll
```typescript
@Entity('payrolls')
export class Payroll {
  id: string (UUID)
  employeeId: string (FK to Employee)
  month: number (1-12)
  year: number (2020-2099)
  baseSalary: decimal(10,2)
  bonuses: decimal(10,2)           // Bonificaciones extras
  holidayBonus: decimal(10,2)      // Bono Navidad/Especial
  afpDeduction: decimal(10,2)      // AFP ~2.87%
  isrDeduction: decimal(10,2)      // ISR (variable)
  tssDeduction: decimal(10,2)      // TSS ~2.87%
  otherDeductions: decimal(10,2)   // Otras deducciones
  totalAmount: decimal(10,2)       // NETO A PAGAR (calculado)
  status: enum (DRAFT|PENDING|APPROVED|PAID|CANCELLED)
  notes: text
  paidAt: datetime
  paidBy: string
  createdAt: datetime
  updatedAt: datetime
}
```

### DTOs

**CreatePayrollDto**
```typescript
{
  employeeId: string (required)
  month: number (1-12, required)
  year: number (2020-2099, required)
  baseSalary: number (required)
  bonuses?: number
  holidayBonus?: number
  afpDeduction?: number
  isrDeduction?: number
  tssDeduction?: number
  otherDeductions?: number
  notes?: string
}
```

**UpdatePayrollDto** (todos los campos opcionales)
```typescript
{
  bonuses?: number
  holidayBonus?: number
  afpDeduction?: number
  isrDeduction?: number
  tssDeduction?: number
  otherDeductions?: number
  status?: PayrollStatus
  notes?: string
}
```

**GeneratePayrollDto**
```typescript
{
  month: number (required)
  year: number (required)
  employeeIds?: string[] (opcional - si no se proporciona, genera para todos activos)
}
```

## 🔧 Endpoints

### REST API

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/payroll` | Crear nómina | JWT |
| GET | `/payroll` | Listar nóminas (filtros: month, year, status) | JWT |
| GET | `/payroll/:id` | Obtener nómina por ID | JWT |
| GET | `/payroll/stats` | Estadísticas de nóminas | JWT |
| PUT | `/payroll/:id` | Actualizar nómina | JWT |
| DELETE | `/payroll/:id` | Eliminar nómina (DRAFT only) | JWT |
| POST | `/payroll/generate` | Generar nóminas en lote | JWT |
| PUT | `/payroll/:id/approve` | Aprobar nómina (DRAFT→APPROVED) | JWT |
| PUT | `/payroll/:id/mark-paid` | Marcar como pagada (APPROVED→PAID) | JWT |

### Ejemplo de Request

```bash
# Crear nómina
POST /payroll
{
  "employeeId": "emp-123",
  "month": 12,
  "year": 2024,
  "baseSalary": 200000,
  "bonuses": 15000,
  "afpDeduction": 5740,
  "isrDeduction": 2178,
  "tssDeduction": 5740,
  "notes": "Diciembre 2024 - Con bono de rendimiento"
}

# Actualizar deducciones
PUT /payroll/pay-456
{
  "afpDeduction": 6000,
  "isrDeduction": 2500,
  "tssDeduction": 6000
}

# Generar en lote
POST /payroll/generate
{
  "month": 12,
  "year": 2024,
  "employeeIds": ["emp-001", "emp-002", "emp-003"]
}
```

### Ejemplo de Response

```json
{
  "statusCode": 201,
  "success": true,
  "message": "Nómina creada exitosamente",
  "data": {
    "id": "pay-uuid-123",
    "employeeId": "emp-123",
    "month": 12,
    "year": 2024,
    "baseSalary": "200000.00",
    "bonuses": "15000.00",
    "holidayBonus": "5000.00",
    "afpDeduction": "5740.00",
    "isrDeduction": "2178.00",
    "tssDeduction": "5740.00",
    "otherDeductions": "0.00",
    "totalAmount": "206342.00",
    "status": "draft",
    "notes": "Diciembre 2024 - Con bono de rendimiento",
    "createdAt": "2024-12-15T10:30:00Z",
    "updatedAt": "2024-12-15T10:30:00Z"
  },
  "timestamp": "2024-12-15T10:30:00Z",
  "path": "/payroll"
}
```

## 📊 Cálculos Dominicanos

### AFP (Administradora de Fondos de Pensiones)
```
AFP = Salario Base × 2.87%
```

### TSS (Tesorería de la Seguridad Social)
```
TSS = Salario Base × 2.87%
```

### ISR (Impuesto sobre la Renta)
```
1. Determinar salario imponible: Salario Base
2. Restar exención: RD$173,835.27 (aprox 2024)
3. Aplicar tramos:
   - 0 a RD$60,000: 8%
   - RD$60,001 a RD$108,000: 14%
   - Más de RD$108,000: 22%
```

**Ejemplo:**
```
Salario: RD$200,000
Exención: -RD$173,835.27
Imponible: RD$26,164.73
ISR: RD$26,164.73 × 8% = RD$2,093.18
```

### Total Neto
```
NETO = Salario Base + Bonificaciones + Bono Especial
       - AFP - ISR - TSS - Otras Deducciones
```

## 🔄 Estados de Nómina

```
DRAFT ──→ [Editar] ──→ DRAFT
  ↓ [Aprobar]
APPROVED ──→ [Pagar] ──→ PAID
  ↑ [Editar]
  
DRAFT ──→ [Eliminar] ──→ ✗ Eliminada
```

### Transiciones Válidas
- `DRAFT` → `APPROVED`: Cambio a estado aprobado
- `APPROVED` → `PAID`: Cambio a pagado (genera auditoría)
- `DRAFT` → `DELETE`: Solo en estado borrador
- Edición: Permitida en `DRAFT` y `APPROVED`

## 🔒 Validaciones

### Backend
- ✅ Empleado debe existir
- ✅ No permitir duplicados (empleado + mes + año)
- ✅ Mes válido (1-12)
- ✅ Año válido (2020-2099)
- ✅ Salario base > 0
- ✅ Solo eliminar en estado DRAFT
- ✅ Transiciones de estado validadas
- ✅ Cálculo total automático y protegido

### Deducciones
- ✅ Todas las deducciones son opcionales (pueden ser 0)
- ✅ Se pueden actualizar independientemente
- ✅ El total se recalcula automáticamente

## 📝 Casos de Uso

### Caso 1: Empleado Salario Exento
```
Empleado: María García
Salario Base: RD$150,000
Bonificaciones: RD$5,000
Bono Especial: RD$0
AFP: RD$4,305 (calculado: 150,000 × 2.87%)
TSS: RD$4,305 (calculado: 150,000 × 2.87%)
ISR: RD$0 (bajo exención)
Otras: RD$0
────────────────────────
NETO: RD$151,390
```

### Caso 2: Empleado Con ISR
```
Empleado: Juan Pérez
Salario Base: RD$220,000
Bonificaciones: RD$15,000
Bono Especial: RD$5,000
AFP: RD$6,314 (calculado)
TSS: RD$6,314 (calculado)
ISR: RD$3,693 (calculado con tramos)
Otras: RD$2,000 (adelanto de salario)
────────────────────────
NETO: RD$228,679
```

### Caso 3: Nómina en Lote
```
Generar para todos los empleados activos:
- Mes: 12 (Diciembre)
- Año: 2024
- Crea nómina para ~50 empleados
- Todas en estado DRAFT
- Deducciones inicializadas en 0
- Listas para editar y calcular
```

## 🛠️ Service: PayrollService

```typescript
// Crear nómina individual
async create(createDto: CreatePayrollDto): Promise<Payroll>

// Listar con filtros
async findAll(month?: number, year?: number, status?: PayrollStatus): Promise<Payroll[]>

// Obtener por ID
async findById(id: string): Promise<Payroll>

// Buscar por empleado y mes
async findByEmployeeAndMonth(employeeId: string, month: number, year: number): Promise<Payroll | null>

// Actualizar nómina (recalcula total)
async update(id: string, updateDto: UpdatePayrollDto): Promise<Payroll>

// Eliminar (DRAFT only)
async delete(id: string): Promise<void>

// Generar en lote
async generateMonthlyPayroll(generateDto: GeneratePayrollDto): Promise<Payroll[]>

// Cambiar a APPROVED
async approvePayroll(id: string): Promise<Payroll>

// Marcar como PAID (requiere paidBy)
async markAsPaid(id: string, paidBy: string): Promise<Payroll>

// Estadísticas por mes/año
async getPayrollStats(month: number, year: number): Promise<{
  month: number
  year: number
  totalPayrolls: number
  totalAmount: number
  byStatus: { draft: number, pending: number, approved: number, paid: number, cancelled: number }
}>
```

## 🔐 Seguridad

- ✅ Todos los endpoints requieren JWT
- ✅ Validación de estructura en DTOs
- ✅ Proteción contra inyección SQL (TypeORM)
- ✅ Auditoría en pagos (quién pagó, cuándo)
- ✅ Transacciones atómicas
- ✅ Validaciones en base de datos

## 🧮 Fórmulas Implementadas

### Backend (validado)
```typescript
const totalDeductions = afpDeduction + isrDeduction + tssDeduction + otherDeductions;
const totalAmount = baseSalary + bonuses + holidayBonus - totalDeductions;
```

### Frontend (normalización)
```dart
totalAmount = baseSalary + bonuses + holidayBonus 
            - (afpDeduction + isrDeduction + tssDeduction + otherDeductions)
```

## 📱 Frontend Integration

El frontend incluye:
- `PayrollService`: Comunicación HTTP con normalización
- `PayrollScreen`: UI con filtros y acciones
- `PayrollCalculator`: Cálculos automáticos dominicanos
- `payroll_service_provider`: Inyección de dependencias

Ver `lib/services/payroll_service.dart` para detalles de implementación.

## 🔄 Flujo de Aprobación

1. **Crear** → DRAFT (deducciones inicializadas)
2. **Editar** → Ajustar bonificaciones y deducciones
3. **Calcular** (opcional) → AFP/ISR/TSS automáticos
4. **Revisar** → Verificar que todo esté correcto
5. **Aprobar** → DRAFT → APPROVED
6. **Pagar** → APPROVED → PAID (con auditoría)
7. **Reportar** → Estadísticas y detalles

## 📊 Reportes

### Estadísticas por Mes
```
GET /payroll/stats?month=12&year=2024

Response:
{
  "month": 12,
  "year": 2024,
  "totalPayrolls": 45,
  "totalAmount": 8550000.00,
  "byStatus": {
    "draft": 5,
    "pending": 0,
    "approved": 35,
    "paid": 5,
    "cancelled": 0
  }
}
```

## ⚙️ Configuración

### Tasas Actualizables
```typescript
// En payroll_calculator.dart (frontend)
const double AFP_RATE = 2.87;
const double TSS_RATE = 2.87;
const double ISR_EXEMPTION = 173835.27;
```

Actualizar estos valores cuando cambie la legislación dominicana.

## 🧪 Testing

```bash
# Test de creación
POST /payroll
{
  "employeeId": "emp-test-001",
  "month": 12,
  "year": 2024,
  "baseSalary": 200000,
  "afpDeduction": 5740,
  "isrDeduction": 2178,
  "tssDeduction": 5740
}

# Debe retornar totalAmount = 186,342
```

## 📚 Referencias

- AFP: Regulación PENSIA
- ISR: Tablas 2024 DGII (Dirección General de Impuestos Internos)
- TSS: Regulación Seguridad Social Dominicana
- Estructura compatible con SIE (Sistema Integrado Tributario)

## 🎯 Roadmap Futuro

- [ ] Importar datos desde SIE
- [ ] Generar reportes fiscales automáticos
- [ ] Integración con proveedores de pago
- [ ] Portal de empleado para consultar nómina
- [ ] Declaración anual automática de ISR
- [ ] Multi-empresa con consolidación

---

**VERSIÓN**: 1.0 Dominicana
**ÚLTIMA ACTUALIZACIÓN**: Diciembre 2024
**COMPATIBLE CON**: NestJS 10+, TypeORM 0.3+, MySQL 9.5+
**LEGISLACIÓN**: Dominicana 2024
