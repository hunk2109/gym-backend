#!/bin/bash
# Script para probar el flujo completo de grupos

echo "=== TESTING GROUPS ENDPOINT FIX ==="
echo ""

# Test 1: Verificar que el endpoint está disponible
echo "1️⃣  Verificando que el endpoint /api/groups/my-groups existe..."
echo "   Llamada: GET /api/groups/my-groups (con JWT)"
echo ""

# Test 2: Verificar la ruta correcta (sin duplicación de /api)
echo "2️⃣  Verificando que NO hay duplicación de ruta..."
echo "   Debería ser: GET /api/groups/my-groups"
echo "   NO debería ser: GET /api/api/groups/my-groups"
echo ""

# Test 3: Verificar el flujo de ID
echo "3️⃣  Flujo de conversión de IDs:"
echo "   1. JWT contiene: userId = 'c2f5ba53-d337-48b7-97e7-34726c5adf0b'"
echo "   2. Backend busca: Member where userId = 'c2f5ba53-d337-48b7-97e7-34726c5adf0b'"
echo "   3. Backend obtiene: memberId = '2025-12-10 10:19:55.805'"
echo "   4. Backend consulta: grupos para ese memberId"
echo ""

# Test 4: Flujo manual en Flutter
echo "4️⃣  MANUAL TESTING EN FLUTTER:"
echo "   a. Inicia la app Flutter"
echo "   b. Asigna una membresía 'Grupal' a un miembro"
echo "   c. Navega a 'Mis Grupos'"
echo "   d. ¿Aparece el grupo creado?"
echo ""
echo "   Expected behavior:"
echo "   - El grupo aparece en la pantalla"
echo "   - Muestra el nombre, fecha de inicio, fecha de fin"
echo "   - Muestra el número de acompañantes"
echo ""

# Test 5: Backend logs
echo "5️⃣  VERIFICAR LOGS DEL BACKEND:"
echo "   Buscar líneas como:"
echo "   - '[GroupsController] 📍 GET /api/groups/my-groups'"
echo "   - '[GroupsController] userId del JWT: \"c2f5ba53...\"'"
echo "   - '[GroupsService] 🔍 Finding member where userId = ...'  "
echo "   - '[GroupsController] ✅ X grupos encontrados'"
echo ""

# Test 6: Verificar query
echo "6️⃣  QUERY VERIFICATION:"
echo "   La query debe COMBINAR:"
echo "   - Grupos donde responsibleMemberId = memberId"
echo "   - Grupos donde memberId está en group_companions"
echo "   Sin restricciones adicionales por usuario"
echo ""

echo "=== ROLLBACK IF NEEDED ==="
echo ""
echo "Si algo falla, estos son los cambios:"
echo ""
echo "CAMBIOS EN BACKEND:"
echo "1. groups.controller.ts: @Controller('api/groups') → @Controller('groups')"
echo "2. groups.controller.ts: Nuevo endpoint @Get('my-groups')"
echo "3. groups.service.ts: Nuevo método getGroupsByUserId(userId)"
echo ""
echo "CAMBIOS EN FLUTTER:"
echo "1. group_service.dart: Nuevo método getMyGroups()"
echo "2. my_groups_screen.dart: Cambió de getMemberGroups(auth.id) a getMyGroups()"
echo ""
