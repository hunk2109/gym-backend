const { DataSource } = require('typeorm');

async function testTypeOrm() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager',
    entities: [__dirname + '/src/entities/*.ts'],
    synchronize: false,
  });

  await dataSource.initialize();
  
  const repo = dataSource.getRepository('Attendance');
  const [data, count] = await repo.findAndCount({
    relations: ['member', 'member.user', 'employee'],
    order: { visitDate: 'DESC' },
    take: 5
  });

  console.log('Count:', count);
  console.log(data.map(d => ({
    visitDate: d.visitDate,
    memberName: d.member ? (d.member.user ? d.member.user.firstName : 'NO_USER') : 'NO_MEMBER',
    memberId: d.memberId
  })));

  await dataSource.destroy();
}

testTypeOrm().catch(console.error);
