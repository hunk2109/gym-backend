const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager'
  });

  const [rows] = await connection.execute('SELECT name, durationMonths, durationDays FROM memberships');
  console.log('Memberships:', rows);

  await connection.end();
}
check();
