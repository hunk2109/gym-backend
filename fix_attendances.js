const { execSync } = require('child_process');
const mysql = require('mysql2/promise');
const path = require('path');

async function fixAttendances() {
  const mysqlConn = await mysql.createConnection({
    host: 'localhost',
    user: 'hunk2109',
    password: 'muerete66',
    database: 'gym_manager',
    port: 3306
  });

  try {
    const pythonScript = path.join(process.cwd(), 'src', 'modules', 'sync', 'scripts', 'access-query.py');
    const dbPath = 'c:\\develop\\gym-backend\\dowtown.mdb';
    const query = 'SELECT pin, time FROM acc_monitor_log ORDER BY time DESC';
    
    console.log('Running python script...');
    const stdout = execSync(`python "${pythonScript}" "${dbPath}" "${query}"`, { maxBuffer: 1024 * 1024 * 10 }).toString();
    const logs = JSON.parse(stdout);
    console.log(`Fetched ${logs.length} logs from ZKAccess`);

    // Create a map of time (ms) to cleanPin
    const logMap = new Map();
    for (const log of logs) {
      if (!log.pin) continue;
      const cleanPin = String(log.pin).trim();
      if (!cleanPin) continue;
      
      const timeMs = new Date(log.time).getTime();
      logMap.set(timeMs, cleanPin);
    }

    // Get all members
    const [members] = await mysqlConn.execute('SELECT id, memberCode FROM members');
    const memberMap = new Map();
    for (const m of members) {
      memberMap.set(m.memberCode, m.id);
    }

    // Get all null attendances
    const [attendances] = await mysqlConn.execute('SELECT id, visitDate FROM attendances WHERE memberId IS NULL');
    console.log(`Found ${attendances.length} attendances with null memberId`);
    
    let updatedCount = 0;
    for (const att of attendances) {
      const attTimeMs = new Date(att.visitDate).getTime();
      const cleanPin = logMap.get(attTimeMs);
      
      if (cleanPin) {
        const memberCode = `MEM_${cleanPin.padStart(6, '0')}`;
        const memberId = memberMap.get(memberCode);
        
        if (memberId) {
          await mysqlConn.execute('UPDATE attendances SET memberId = ? WHERE id = ?', [memberId, att.id]);
          updatedCount++;
        }
      }
    }
    
    console.log(`Successfully updated ${updatedCount} attendances!`);
  } catch (error) {
    console.error(error);
  } finally {
    await mysqlConn.end();
  }
}

fixAttendances();
