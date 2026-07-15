const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager'
  });

  const [rows] = await connection.execute("SELECT id, email, role FROM users WHERE email = 'HUHU@AFDAD.COM'");
  console.log('Users found:', rows);

  await connection.end();
}
check();
