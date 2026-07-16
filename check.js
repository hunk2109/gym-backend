const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager',
    port: 3306
  });

  const [rows] = await connection.execute(`
    SELECT a.id, a.visitDate, a.memberId, m.memberCode, u.firstName, u.lastName
    FROM attendances a
    LEFT JOIN members m ON a.memberId = m.id
    LEFT JOIN users u ON m.userId = u.id
    ORDER BY a.visitDate DESC
    LIMIT 10
  `);
  console.log(rows);
  
  await connection.end();
}

check().catch(console.error);
