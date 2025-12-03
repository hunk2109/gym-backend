#!/bin/bash

# Variables
API="http://localhost:3000/api"
TOKEN="your_token_here" # Se necesitará obtener un token válido

# Obtener primer miembro
echo "Obteniendo miembros..."
MEMBERS=$(curl -s "$API/members" -H "Authorization: Bearer $TOKEN")
echo "Respuesta de miembros: $MEMBERS"

# Obtener primera membresía
echo "Obteniendo membresías..."
MEMBERSHIPS=$(curl -s "$API/memberships" -H "Authorization: Bearer $TOKEN")
echo "Respuesta de membresías: $MEMBERSHIPS"

# Verificar pagos pendientes
echo "Verificando pagos pendientes..."
PENDING=$(curl -s "$API/member-memberships/pending-payments" -H "Authorization: Bearer $TOKEN")
echo "Respuesta de pagos pendientes: $PENDING"
