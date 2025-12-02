# 🚀 Backend NestJS - Guía de Setup y Ejecución

## ✅ Lo que ya está hecho

1. ✅ Proyecto NestJS creado en `C:\develop\gym\gym-backend`
2. ✅ Entidades TypeORM (User, Product, Sale, SaleItem) implementadas
3. ✅ Servicios (Auth, Product, Sales) implementados
4. ✅ Controladores con 24 endpoints listos
5. ✅ Autenticación JWT configurada
6. ✅ Docker MySQL configurado
7. ✅ Variables de entorno (.env) listas

---

## 🐳 Paso 1: Iniciar MySQL con Docker

```bash
cd C:\develop\gym\gym-backend
docker-compose up -d
```

**Verificar que MySQL está corriendo**:
```bash
docker ps
# Deberías ver "gym-mysql" corriendo
```

---

## 📦 Paso 2: Verificar Dependencias

Las dependencias ya están instaladas en el proyecto. Si no, ejecuta:

```bash
cd C:\develop\gym\gym-backend
npm install
```

---

## 🔧 Paso 3: Configurar Variables de Entorno

El archivo `.env` ya está creado con las credenciales. Si necesitas cambiarlas:

```env
# .env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=gym_manager

JWT_SECRET=your-super-secret-key-change-this-in-production

NODE_ENV=development
PORT=3000
```

---

## ▶️ Paso 4: Ejecutar el Backend

### Opción A: Desarrollo (con hot reload)
```bash
cd C:\develop\gym\gym-backend
npm run start:dev
```

Espera a ver:
```
[Nest] 12345  - 01/16/2025, 10:30:15 AM     LOG [NestFactory] Nest application successfully started +2ms
```

### Opción B: Producción
```bash
npm run build
npm run start
```

---

## 🧪 Paso 5: Probar los Endpoints

### 1. Registrar Usuario
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gym.com",
    "password": "Admin123!",
    "name": "Admin",
    "role": "admin"
  }'
```

**Respuesta**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "admin@gym.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gym.com",
    "password": "Admin123!"
  }'
```

### 3. Guardar el Token
```bash
set TOKEN=<el-token-que-recibiste>
```

O en PowerShell:
```powershell
$TOKEN = "tu-token-aqui"
```

### 4. Crear Producto
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer %TOKEN%" \
  -d '{
    "name": "Protein Shake",
    "description": "Whey protein",
    "category": "beverages",
    "price": 5.99,
    "quantity": 100,
    "supplier": "SupplierCo"
  }'
```

### 5. Crear Venta
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer %TOKEN%" \
  -d '{
    "memberId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "productId": "product-id-aqui",
        "quantity": 2,
        "unitPrice": 5.99
      }
    ],
    "paymentMethod": "cash",
    "discount": 0
  }'
```

---

## 📊 Endpoints Disponibles

### Autenticación (2)
```
POST   /api/auth/login             - Login
POST   /api/auth/register          - Registro
```

### Productos (12)
```
GET    /api/products               - Listar
POST   /api/products               - Crear
GET    /api/products/:id           - Detalle
PUT    /api/products/:id           - Actualizar
DELETE /api/products/:id           - Eliminar
GET    /api/products/category/:cat - Por categoría
GET    /api/products/low-stock     - Stock bajo
GET    /api/products/expired       - Expirados
GET    /api/products/search        - Buscar
POST   /api/products/:id/stock/add - Añadir stock
POST   /api/products/:id/stock/remove - Retirar stock
GET    /api/products/inventory/value  - Valor inventario
```

### Ventas (10)
```
GET    /api/sales                  - Listar
POST   /api/sales                  - Crear
GET    /api/sales/:id              - Detalle
PUT    /api/sales/:id              - Actualizar
DELETE /api/sales/:id              - Eliminar
GET    /api/sales/member/:id       - Por miembro
GET    /api/sales/statistics       - Estadísticas
GET    /api/sales/top-products     - Top vendidos
GET    /api/sales/daily-revenue    - Ingresos diarios
GET    /api/sales/date-range/:start/:end - Por rango
```

---

## 🛠️ Comandos Útiles

### Ver logs
```bash
cd C:\develop\gym\gym-backend
npm run start:dev
# Los logs aparecen en consola
```

### Parar MySQL
```bash
docker-compose down
```

### Resetear BD (elimina datos)
```bash
docker-compose down -v
docker-compose up -d
```

### Conectar a MySQL directamente
```bash
docker exec -it gym-mysql mysql -u root -ppassword gym_manager
```

---

## 🔍 Verificar Conexión

### Tabla de Usuarios
```bash
docker exec -it gym-mysql mysql -u root -ppassword gym_manager -e "SELECT * FROM users;"
```

### Tabla de Productos
```bash
docker exec -it gym-mysql mysql -u root -ppassword gym_manager -e "SELECT * FROM products;"
```

### Tabla de Ventas
```bash
docker exec -it gym-mysql mysql -u root -ppassword gym_manager -e "SELECT * FROM sales;"
```

---

## ✅ Checklist de Verificación

- [ ] Docker corriendo: `docker ps`
- [ ] Backend iniciado: `npm run start:dev`
- [ ] Servidor listening en puerto 3000
- [ ] Registro funciona
- [ ] Login funciona
- [ ] Token JWT generado
- [ ] Crear producto funciona
- [ ] Crear venta funciona

---

## 📁 Estructura del Proyecto

```
gym-backend/
├── src/
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── product.entity.ts
│   │   ├── sale.entity.ts
│   │   └── sale-item.entity.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── guards/jwt-auth.guard.ts
│   │   ├── products/
│   │   │   ├── product.service.ts
│   │   │   ├── product.controller.ts
│   │   │   ├── products.module.ts
│   │   │   └── dto/create-product.dto.ts
│   │   └── sales/
│   │       ├── sales.service.ts
│   │       ├── sales.controller.ts
│   │       ├── sales.module.ts
│   │       └── dto/create-sale.dto.ts
│   └── app.module.ts
├── .env
├── docker-compose.yml
└── package.json
```

---

## 🆘 Posibles Problemas

### Error: "ECONNREFUSED" en conexión a BD
```
Solución: Verificar que MySQL está corriendo
docker-compose up -d
```

### Error: "Port 3306 is already in use"
```
Solución: Cambiar puerto en docker-compose.yml
ports:
  - "3307:3306"  # Cambiar a 3307
```

### Error: "JWT_SECRET not defined"
```
Solución: Verificar que .env existe y tiene:
JWT_SECRET=your-secret-key
```

### Error al crear venta: "Invalid UUID"
```
Solución: Usar un UUID válido para memberId
Ej: 550e8400-e29b-41d4-a716-446655440000
```

---

## 📝 Variables de Entorno

Si necesitas cambiar credenciales, edita `.env`:

```env
# MySQL
DB_HOST=localhost          # Dirección del servidor
DB_PORT=3306               # Puerto MySQL
DB_USERNAME=root           # Usuario MySQL
DB_PASSWORD=password       # Contraseña
DB_NAME=gym_manager        # Nombre BD

# JWT
JWT_SECRET=tu-secret-key   # CAMBIAR EN PRODUCCIÓN

# Node
NODE_ENV=development       # development / production
PORT=3000                  # Puerto del backend
```

---

## 🎯 Integración con Flutter

En el Flutter app (`lib/services/api_client.dart`):

```dart
const String baseUrl = 'http://localhost:3000';
```

O si usas emulador Android:
```dart
const String baseUrl = 'http://10.0.2.2:3000';
```

Luego en Flutter:
```bash
flutter run
```

---

## 📞 Contacto Rápido

**Backend corriendo**: `http://localhost:3000`
**Base de datos**: `localhost:3306`
**Usuario MySQL**: `root` / `password`
**Base de datos**: `gym_manager`

---

**Status**: ✅ Backend completamente configurado y listo
**Próximo paso**: Conectar con Flutter app

¡A probar! 🚀
