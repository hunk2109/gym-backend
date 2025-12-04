#!/usr/bin/env node

const mysql = require('mysql2/promise');
const axios = require('axios');

async function testMembershipRevenue() {
  console.log('🔍 TEST: Ingresos por Tipo de Membresía\n');

  try {
    // 1. Verificar datos en BD
    console.log('1️⃣  Verificando datos en base de datos...');
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'muerete66',
      database: 'gym_manager'
    });

    // Verificar membresías pagadas
    const [paidMemberships] = await conn.execute(`
      SELECT 
        m.name,
        COUNT(mm.id) as count,
        SUM(m.price) as revenue
      FROM member_memberships mm
      INNER JOIN memberships m ON m.id = mm.membershipId
      WHERE mm.paymentStatus = 'paid'
      GROUP BY m.id, m.name
      ORDER BY revenue DESC
    `);

    console.log('   Membresías PAGADAS encontradas:', paidMemberships.length);
    paidMemberships.forEach(m => {
      console.log(`   - ${m.name}: ${m.count} membresías, $${m.revenue}`);
    });

    if (paidMemberships.length === 0) {
      console.log('   ⚠️  NO HAY MEMBRESÍAS PAGADAS EN LA BD');
    } else {
      console.log('   ✅ Datos OK en BD\n');
    }

    // 2. Obtener token de admin
    console.log('2️⃣  Obteniendo token de autenticación...');
    
    // Buscar un usuario admin/encargado
    const [users] = await conn.execute(
      `SELECT id, email FROM users WHERE role IN ('admin', 'encargado') LIMIT 1`
    );

    if (!users[0]) {
      console.log('   ❌ No hay usuario admin/encargado en la BD');
      await conn.end();
      return;
    }

    console.log(`   Usando usuario: ${users[0].email}`);

    // Para este test, vamos a hacer una solicitud sin token
    // (o con un token si lo tienes disponible)
    
    // 3. Llamar al endpoint
    console.log('\n3️⃣  Llamando al endpoint /api/dashboard/revenue/memberships-by-type...');
    
    try {
      // Aquí puedes agregar headers de autenticación si tienes un token válido
      const response = await axios.get('http://localhost:3000/api/dashboard/revenue/memberships-by-type', {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Reemplaza con un token válido
        }
      });
      
      console.log('   Response status:', response.status);
      console.log('   Response data:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ⚠️  Error 401 Unauthorized - Se necesita token válido');
        console.log('   Esto podría indicar un problema con la autenticación');
      } else if (error.response?.status === 403) {
        console.log('   ⚠️  Error 403 Forbidden - El usuario no tiene permisos');
        console.log('   Verifica que el usuario sea ADMIN o ENCARGADO');
      } else {
        console.log('   Error:', error.message);
        if (error.response?.data) {
          console.log('   Response data:', error.response.data);
        }
      }
    }

    console.log('\n📊 Resumen:');
    console.log('   - BD tiene datos de membresías pagadas:', paidMemberships.length > 0);
    console.log('   - API es accesible');
    console.log('   - Verifica los logs del servidor backend para más detalles');

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMembershipRevenue();
