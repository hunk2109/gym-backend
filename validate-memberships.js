const mysql = require('mysql2/promise');

async function validate() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager'
  });

  try {
    console.log('\n========== VALIDACIÓN DE MEMBRESÍAS ==========\n');

    // Memberships
    const [memberships] = await connection.execute('SELECT COUNT(*) as total FROM memberships');
    console.log(`✅ Memberships: ${memberships[0].total} registros`);

    // Member-Memberships
    const [memberMemberships] = await connection.execute('SELECT COUNT(*) as total FROM member_memberships');
    console.log(`✅ Member-Memberships: ${memberMemberships[0].total} registros`);

    // Members
    const [members] = await connection.execute('SELECT COUNT(*) as total FROM members');
    console.log(`✅ Members: ${members[0].total} registros`);

    // Payments
    const [payments] = await connection.execute('SELECT COUNT(*) as total FROM payments');
    console.log(`✅ Payments: ${payments[0].total} registros`);

    // Users with CLIENTE role
    const [clients] = await connection.execute("SELECT COUNT(*) as total FROM users WHERE role = 'CLIENTE'");
    console.log(`✅ Usuarios CLIENTE: ${clients[0].total} registros`);

    console.log('\n========== ACCESS DATABASE ==========\n');
    console.log(`✅ Facturas en Access: 3822`);
    console.log(`✅ USERINFO en Access: 562`);
    console.log(`✅ Productos en Access: 43`);

    console.log('\n========== DIFERENCIAS ==========\n');
    if (payments[0].total !== 3822) {
      console.log(`⚠️ Payments mismatch: MySQL=${payments[0].total} vs Access=3822`);
    } else {
      console.log(`✅ Payments OK: ${payments[0].total} == 3822`);
    }

    if (clients[0].total !== 567) {
      console.log(`⚠️ Clientes mismatch: MySQL=${clients[0].total} vs Access=567`);
    } else {
      console.log(`✅ Clientes OK: ${clients[0].total} == 567`);
    }

    if (members[0].total !== 567) {
      console.log(`⚠️ Members mismatch: MySQL=${members[0].total} vs Access=567`);
    } else {
      console.log(`✅ Members OK: ${members[0].total} == 567`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

validate();
