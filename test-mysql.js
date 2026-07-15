const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gym_manager'
  });

  const [members] = await connection.execute('SELECT id, memberCode, userId FROM members ORDER BY createdAt DESC LIMIT 5');
  console.log('Last Members:', members);

  const [memberships] = await connection.execute('SELECT id, memberId, membershipId FROM member_memberships ORDER BY createdAt DESC LIMIT 5');
  console.log('Last MemberMemberships:', memberships);

  await connection.end();
}
check();
