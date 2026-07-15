const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager'
  });

  const [rows] = await connection.execute('SHOW CREATE TABLE member_memberships');
  console.log(rows[0]['Create Table']);

  await connection.end();
}
check();
