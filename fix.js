const mysql = require('mysql2/promise');

async function fix() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager',
    port: 3306
  });

  const [result] = await connection.execute('DELETE FROM attendances WHERE memberId IS NULL');
  console.log(`Deleted ${result.affectedRows} attendances with null memberId`);
  
  await connection.end();
}

fix().catch(console.error);
