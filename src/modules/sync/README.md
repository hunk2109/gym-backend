# Módulo de Sincronización de Datos

## Descripción

Este módulo sincroniza datos entre una base de datos Access y MySQL automáticamente. Permite:

1. **Seleccionar Ruta de Access**: Desde Flutter o cualquier cliente
2. **Sincronización Inicial**: Copia todos los datos relevantes de Access a MySQL
3. **Sincronización Automática**: Actualiza los datos cada 5 minutos después de la sincronización inicial

⚠️ **IMPORTANTE**: La ruta de la base de datos Access DEBE ser establecida ANTES de ejecutar cualquier sincronización.

## Tablas Sincronizadas

| Access | MySQL | Descripción |
|--------|-------|-------------|
| USERINFO | users | Empleados/Usuarios |
| Productos | products | Productos/Servicios |
| factura (clientes) | members | Miembros/Clientes |
| factura | payments | Facturas/Pagos |
| acc_monitor_log | attendances | Asistencias/Accesos |

## Endpoints API

### 1. Sincronización Inicial
```
POST /api/sync/initial
```

Realiza una sincronización completa de Access → MySQL.

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/sync/initial
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Sincronización inicial completada",
  "data": {
    "users": { "inserted": 562, "updated": 0 },
    "products": { "inserted": 43, "updated": 0 },
    "members": { "inserted": 556, "updated": 0 },
    "payments": { "inserted": 3822, "updated": 0 },
    "attendances": { "inserted": 1000, "updated": 0 },
    "timestamp": "2026-05-14T10:30:00Z"
  }
}
```

### 2. Habilitar Sincronización Automática
```
POST /api/sync/enable-auto
```

Activa sincronización automática cada 5 minutos.

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/sync/enable-auto
```

**Respuesta:**
```json
{
  "status": "Sincronización automática habilitada",
  "interval": "5 minutos"
}
```

### 3. Desactivar Sincronización Automática
```
POST /api/sync/disable-auto
```

Detiene la sincronización automática.

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/sync/disable-auto
```

**Respuesta:**
```json
{
  "status": "Sincronización automática deshabilitada"
}
```

### 4. Estado de Sincronización
```
GET /api/sync/status
```

Obtiene el estado actual de la sincronización.

**Ejemplo:**
```bash
curl http://localhost:3000/api/sync/status
```

**Respuesta:**
```json
{
  "isEnabled": true,
  "lastSyncTime": "2026-05-14T10:30:00Z",
  "interval": "5 minutos"
}
```

### 5. Establecer Ruta de Access
```
PUT /api/sync/access-path
```

Cambia la ruta de la base de datos Access.

**Ejemplo:**
```bash
curl -X PUT http://localhost:3000/api/sync/access-path \
  -H "Content-Type: application/json" \
  -d '{"path": "C:\\ruta\\a\\basedatos.mdb"}'
```

**Respuesta:**
```json
{
  "success": true,
  "path": "C:\\ruta\\a\\basedatos.mdb"
}
```

## Flujo de Sincronización Recomendado

1. **Inicio del servidor**: El backend levanta con sincronización deshabilitada (sin ruta)
2. **Establecer ruta de Access**: 
   ```bash
   curl -X PUT http://localhost:3000/api/sync/access-path \
     -H "Content-Type: application/json" \
     -d '{"path": "C:\\ruta\\a\\basedatos.mdb"}'
   ```
3. **Sincronización inicial**: 
   ```bash
   curl -X POST http://localhost:3000/api/sync/initial
   ```
4. **Activar auto-sync**: 
   ```bash
   curl -X POST http://localhost:3000/api/sync/enable-auto
   ```
5. **Monitorear estado**:
   ```bash
   curl http://localhost:3000/api/sync/status
   ```

## Configuración

### Variables de entorno (.env)

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=hunk2109
DB_PASSWORD=muerete66
DB_NAME=gym_manager
```

### Ruta de Access

⚠️ **NO hay ruta por defecto**. Debe ser establecida dinámicamente usando:

```bash
PUT /api/sync/access-path
Content-Type: application/json

{"path": "/ruta/a/basedatos.mdb"}
```

Una vez establecida, se usa para todas las sincronizaciones.

## Cambiar Ruta de Access

Para usar una base de datos Access diferente:

```bash
curl -X PUT http://localhost:3000/api/sync/access-path \
  -H "Content-Type: application/json" \
  -d '{"path": "/nueva/ruta/basedatos.mdb"}'
```

Luego ejecutar sincronización inicial nuevamente (primero desactivar auto-sync si está habilitado).

## Notas Importantes

1. **Python requerido**: El sistema requiere Python 3 con `pyodbc` instalado
2. **Driver Access**: Necesita el driver ODBC de Microsoft Access
3. **Sincronización unidireccional**: Los datos van de Access → MySQL
4. **Límite de attendances**: Solo se sincronizan los últimos 1000 registros
5. **Intervalo**: La sincronización automática se ejecuta cada 5 minutos

## Troubleshooting

### Error: "Ruta de la base de datos Access no establecida"
- **Causa**: No se estableció la ruta antes de sincronizar
- **Solución**: Use `PUT /api/sync/access-path` primero
  ```bash
  curl -X PUT http://localhost:3000/api/sync/access-path \
    -H "Content-Type: application/json" \
    -d '{"path": "C:\\ruta\\a\\basedatos.mdb"}'
  ```

### Error: "No hay usuarios registrados"
- **Causa**: La sincronización de usuarios falló
- **Solución**: Verifique la ruta y ejecute `POST /api/sync/initial` nuevamente

### Error: "Base de datos no encontrada" 
- **Causa**: La ruta no existe o es incorrecta
- **Solución**: Verifique la ruta con `GET /api/sync/status` y cámbiela si es necesario

### Error: "Driver ODBC de Access no disponible"
- **Causa**: No está instalado el driver de Access
- **Solución**: Instale los Microsoft Office drivers o ejecute: `pip install pyodbc`

## Performance

- Sincronización inicial: ~30-60 segundos (con 4000+ registros)
- Sincronización automática: ~10-20 segundos (cada 5 minutos)
- No afecta otras operaciones del backend

## Seguridad

- Los endpoints están disponibles en `/api/sync`
- Se recomienda agregar autenticación en producción
- Las credenciales de Access se cargan desde variables de entorno
