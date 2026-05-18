const mysql = require('mysql2/promise');
const pyodbc = require('child_process').execSync;

async function findMissing() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager'
  });

  try {
    // Traer IDs de Access
    const accessIds = new Set();
    for (let i = 1; i <= 562; i++) {
      accessIds.add(`member_${i}`);
    }

    // Traer IDs de MySQL
    const [users] = await connection.execute(
      "SELECT id, firstName, lastName FROM users WHERE role = 'CLIENTE' ORDER BY id"
    );

    console.log('\n========== USUARIOS CLIENTE EN MYSQL ==========\n');
    console.log(`Total: ${users.length}`);

    const mysqlIds = new Set();
    for (const user of users) {
      mysqlIds.add(user.id);
    }

    // Buscar faltantes
    const faltantes = [];
    for (const id of accessIds) {
      if (!mysqlIds.has(id)) {
        const userId = parseInt(id.split('_')[1]);
        faltantes.push(userId);
      }
    }

    if (faltantes.length > 0) {
      console.log(`\n⚠️ FALTANTES (${faltantes.length}):`);
      console.log(faltantes.sort((a, b) => a - b).join(', '));
    } else {
      console.log('\n✅ Todos los usuarios están presentes');
    }

    // Revisar duplicados
    const idCounts = {};
    for (const user of users) {
      idCounts[user.id] = (idCounts[user.id] || 0) + 1;
    }

    const duplicados = Object.entries(idCounts).filter(([, count]) => count > 1);
    if (duplicados.length > 0) {
      console.log(`\n⚠️ DUPLICADOS (${duplicados.length}):`);
      for (const [id, count] of duplicados) {
        console.log(`  ${id}: ${count} copias`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

findMissing();
