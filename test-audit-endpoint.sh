#!/bin/bash

echo "Testing Audit Log Endpoint..."
echo "========================================"

# Test sin token
echo "1. POST sin token:"
curl -X POST http://localhost:3000/api/audit-logs \
  -H "Content-Type: application/json" \
  -d '{
    "action": "TEST_ACTION",
    "module": "TEST",
    "description": "Test audit log"
  }' 2>/dev/null | jq .

echo ""
echo "========================================"
echo "2. GET audit logs (con token):"

# Primero obtenemos un token de prueba (si existe usuario)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzU1ZWY0NTdmYjBmYjAwMWQ3YjdhMjMiLCJlbWFpbCI6ImFkbWluQGd5bS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3MzEwODY0NTF9.X1234567890"

curl -X GET http://localhost:3000/api/audit-logs?page=1&limit=10 \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null | jq '.data | length'

echo ""
echo "Done!"
