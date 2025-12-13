# EJEMPLOS DE USO - MÓDULO DE MESAS

## 🔑 Headers Necesarios

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 📋 EJEMPLOS DE REQUESTS

### **1. CREAR MESA**

```bash
curl -X POST http://localhost:3000/tables \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableNumber": 1,
    "capacity": 4,
    "notes": "Mesa 1 cerca de ventana"
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tableNumber": 1,
  "status": "available",
  "capacity": 4,
  "notes": "Mesa 1 cerca de ventana",
  "accounts": [],
  "createdAt": "2025-12-12T10:30:00.000Z",
  "updatedAt": "2025-12-12T10:30:00.000Z"
}
```

---

### **2. LISTAR TODAS LAS MESAS**

```bash
curl -X GET "http://localhost:3000/tables?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "tables": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tableNumber": 1,
      "status": "available",
      "capacity": 4,
      "accounts": []
    }
  ],
  "total": 1,
  "page": 1,
  "lastPage": 1
}
```

---

### **3. OBTENER MESAS DISPONIBLES**

```bash
curl -X GET http://localhost:3000/tables/available \
  -H "Authorization: Bearer $TOKEN"
```

---

### **4. OBTENER MESA POR NÚMERO**

```bash
curl -X GET http://localhost:3000/tables/number/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### **5. ABRIR CUENTA EN MESA**

```bash
curl -X POST http://localhost:3000/accounts/550e8400-e29b-41d4-a716-446655440000/open \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "tableId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-id-123",
  "status": "open",
  "totalAmount": 0,
  "discount": 0,
  "notes": null,
  "items": [],
  "openedAt": "2025-12-12T10:35:00.000Z",
  "finalAmount": 0
}
```

---

### **6. AGREGAR ITEM A CUENTA**

```bash
curl -X POST http://localhost:3000/accounts/660e8400-e29b-41d4-a716-446655440001/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid-123",
    "quantity": 2,
    "unitPrice": 15.50
  }'
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "tableId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "open",
  "totalAmount": 31,
  "discount": 0,
  "items": [
    {
      "id": "item-uuid-456",
      "productId": "product-uuid-123",
      "quantity": 2,
      "unitPrice": 15.50,
      "subtotal": 31,
      "addedAt": "2025-12-12T10:36:00.000Z",
      "removedAt": null,
      "product": {
        "id": "product-uuid-123",
        "name": "Coca Cola 2L",
        "price": 15.50
      }
    }
  ],
  "itemsCount": 1,
  "finalAmount": 31
}
```

---

### **7. AGREGAR MÁS ITEMS**

```bash
curl -X POST http://localhost:3000/accounts/660e8400-e29b-41d4-a716-446655440001/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid-789",
    "quantity": 1,
    "unitPrice": 25.00
  }'
```

---

### **8. VER TOTAL ACTUAL DE CUENTA**

```bash
curl -X GET http://localhost:3000/accounts/660e8400-e29b-41d4-a716-446655440001/total \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "subtotal": 56,
  "discount": 0,
  "total": 56
}
```

---

### **9. APLICAR DESCUENTO A CUENTA**

```bash
curl -X PUT http://localhost:3000/accounts/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "discount": 5.60,
    "notes": "Descuento cliente VIP"
  }'
```

---

### **10. REMOVER ITEM DE CUENTA**

```bash
curl -X DELETE http://localhost:3000/accounts/items/item-uuid-456 \
  -H "Authorization: Bearer $TOKEN"
```

---

### **11. CERRAR CUENTA**

```bash
curl -X PUT http://localhost:3000/accounts/660e8400-e29b-41d4-a716-446655440001/close \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "closed",
  "totalAmount": 56,
  "discount": 5.60,
  "finalAmount": 50.40,
  "closedAt": "2025-12-12T10:40:00.000Z"
}
```

---

### **12. PROCESAR PAGO**

```bash
curl -X PUT http://localhost:3000/accounts/660e8400-e29b-41d4-a716-446655440001/pay \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "paid",
  "totalAmount": 56,
  "discount": 5.60,
  "finalAmount": 50.40,
  "mesa": "AVAILABLE"
}
```

---

### **13. CANCELAR CUENTA**

```bash
curl -X PUT http://localhost:3000/accounts/660e8400-e29b-41d4-a716-446655440001/cancel \
  -H "Authorization: Bearer $TOKEN"
```

---

### **14. VER CUENTAS ABIERTAS**

```bash
curl -X GET http://localhost:3000/accounts \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "tableId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "open",
    "totalAmount": 31,
    "table": {
      "tableNumber": 1
    },
    "user": {
      "firstName": "Juan",
      "lastName": "Pérez"
    }
  }
]
```

---

## 🔄 FLUJO COMPLETO

### **Escenario: Mesero atendiendo una mesa**

```bash
# 1. Mesero abre mesa
TABLE_ID="550e8400-e29b-41d4-a716-446655440000"
ACCOUNT=$(curl -s -X POST http://localhost:3000/accounts/$TABLE_ID/open \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

ACCOUNT_ID=$(echo $ACCOUNT | jq -r '.id')
echo "✓ Cuenta abierta: $ACCOUNT_ID"

# 2. Agrega 1 Coca Cola
curl -s -X POST http://localhost:3000/accounts/$ACCOUNT_ID/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-coke",
    "quantity": 1,
    "unitPrice": 15.50
  }' | jq '.'
echo "✓ Item agregado"

# 3. Agrega 2 Sándwiches
curl -s -X POST http://localhost:3000/accounts/$ACCOUNT_ID/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-sandwich",
    "quantity": 2,
    "unitPrice": 25.00
  }' | jq '.'
echo "✓ Más items agregados"

# 4. Ve total
curl -s -X GET http://localhost:3000/accounts/$ACCOUNT_ID/total \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo "Total: $65.50"

# 5. Aplica descuento
curl -s -X PUT http://localhost:3000/accounts/$ACCOUNT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"discount": 5}' | jq '.finalAmount'

# 6. Cliente pide la cuenta - cierra
curl -s -X PUT http://localhost:3000/accounts/$ACCOUNT_ID/close \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo "✓ Cuenta cerrada"

# 7. Cajero cobra - procesa pago
curl -s -X PUT http://localhost:3000/accounts/$ACCOUNT_ID/pay \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo "✓ Pago procesado - Mesa libre"
```

---

## ⚠️ CÓDIGOS DE ERROR

| Código | Error | Causa |
|--------|-------|-------|
| 400 | Bad Request | Datos inválidos |
| 404 | Not Found | Mesa/Cuenta no existe |
| 409 | Conflict | Mesa con cuenta abierta |
| 403 | Forbidden | Sin permisos |
| 500 | Server Error | Error interno |

---

## 🛠️ NOTAS

- Los tokens JWT deben tener role suficiente
- Las UUIDs deben ser válidas
- Los precios deben tener máximo 2 decimales
- No se puede agregar items a cuenta cerrada
- No se puede cerrar cuenta sin items

