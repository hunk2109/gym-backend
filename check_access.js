const ADODB = require('node-adodb');

async function checkAccess() {
  const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=c:\\develop\\gym-backend\\dowtown.mdb;');
  try {
    const logs = await connection.query('SELECT TOP 10 pin, time FROM acc_monitor_log ORDER BY time DESC');
    console.log('Logs from Access:', logs);
  } catch (error) {
    console.error(error);
  }
}

checkAccess();
