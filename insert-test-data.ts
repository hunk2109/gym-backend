import { createConnection } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function insertTestData() {
  const connection = await createConnection({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'gym_manager',
    synchronize: false,
  });

  try {
    const queryRunner = connection.createQueryRunner();

    // 1. Insertar User (cliente)
    const hashedPassword = await bcrypt.hash('password123', 10);
    await queryRunner.query(`
      INSERT IGNORE INTO users (id, email, passwordHash, firstName, lastName, phone, role, isActive, createdAt, updatedAt)
      VALUES (UUID(), 'juan.perez@test.com', '${hashedPassword.replace(/'/g, "\\'")}', 'Juan', 'Pérez', '+34123456789', 'cliente', 1, NOW(), NOW())
    `);

    // 2. Obtener el userId
    const userResult = await queryRunner.query(`
      SELECT id FROM users WHERE email = 'juan.perez@test.com' LIMIT 1
    `);
    
    const userId = userResult[0]?.id;
    if (!userId) {
      throw new Error('No se pudo obtener el userId');
    }

    // 3. Insertar miembro
    await queryRunner.query(`
      INSERT IGNORE INTO members (id, userId, documentId, joinDate, isPaid, createdAt, updatedAt)
      VALUES (UUID(), '${userId}', '12345678A', DATE_SUB(NOW(), INTERVAL 60 DAY), 0, NOW(), NOW())
    `);

    // 4. Obtener memberId
    const memberResult = await queryRunner.query(`
      SELECT id FROM members WHERE userId = '${userId}' LIMIT 1
    `);
    
    const memberId = memberResult[0]?.id;
    if (!memberId) {
      throw new Error('No se pudo obtener el memberId');
    }

    // 5. Insertar membresía (si no existe)
    await queryRunner.query(`
      INSERT IGNORE INTO memberships (id, name, description, price, durationMonths, benefits, isActive, createdAt, updatedAt)
      VALUES (UUID(), 'Premium 3 Meses', 'Membresía premium por 3 meses', 99.99, 3, 'Acceso gym,Piscina,Clases ilimitadas', 1, NOW(), NOW())
    `);

    // 6. Obtener membershipId
    const membershipResult = await queryRunner.query(`
      SELECT id FROM memberships WHERE name = 'Premium 3 Meses' LIMIT 1
    `);
    
    const membershipId = membershipResult[0]?.id;
    if (!membershipId) {
      throw new Error('No se pudo obtener el membershipId');
    }

    // 7. Insertar member_memberships con estado PENDING
    await queryRunner.query(`
      INSERT INTO member_memberships (
        id, memberId, membershipId, startDate, endDate, isActive, 
        amountPaid, paymentDate, paymentStatus, isRecurring, suspensionDate, createdAt, updatedAt
      )
      VALUES (
        UUID(),
        '${memberId}',
        '${membershipId}',
        DATE_SUB(NOW(), INTERVAL 50 DAY),
        DATE_SUB(NOW(), INTERVAL 20 DAY),
        0,
        NULL,
        NULL,
        'pending',
        0,
        NULL,
        NOW(),
        NOW()
      )
    `);

    // 8. Verificar
    const results = await queryRunner.query(`
      SELECT 
        mm.id,
        u.firstName,
        u.lastName,
        mb.name as membership,
        mb.price,
        mm.endDate,
        mm.paymentStatus,
        DATEDIFF(NOW(), mm.endDate) as dias_vencido
      FROM member_memberships mm
      JOIN members m ON mm.memberId = m.id
      JOIN users u ON m.userId = u.id
      JOIN memberships mb ON mm.membershipId = mb.id
      WHERE mm.paymentStatus = 'pending'
      ORDER BY mm.endDate DESC
    `);

    console.log('✅ Datos de prueba insertados exitosamente!');
    console.log('Pagos pendientes encontrados:');
    console.table(results);

  } catch (error) {
    console.error('❌ Error al insertar datos:', error.message);
    console.error(error.stack);
  } finally {
    await connection.close();
  }
}

insertTestData();
