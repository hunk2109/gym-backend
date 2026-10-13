import * as mysql from 'mysql2/promise';

async function check() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager'
  });

  const [users] = await connection.execute('SELECT * FROM users WHERE email = "jmichelen@plansierra.org"');
  console.log('User:', users);

  if (users[0]) {
    const [employees] = await connection.execute('SELECT * FROM employees WHERE email = "jmichelen@plansierra.org"');
    console.log('Employee:', employees);
  }
  
  await connection.end();
}
check();
