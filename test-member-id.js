const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager'
  });

  const [rows] = await connection.execute("SELECT id FROM members WHERE id LIKE 'member_%'");
  console.log('Members with member_ id:', rows.length);

  await connection.end();
}
check();
