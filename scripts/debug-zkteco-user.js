const Zkteco = require('zkteco-js');

function getArg(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function normalizeUsers(raw) {
  const candidates = [
    raw?.data,
    raw?.users,
    raw?.data?.users,
    Array.isArray(raw) ? raw : null,
  ];

  const users = candidates.find((item) => Array.isArray(item));
  return users || [];
}

function getUserId(user) {
  return String(user?.userId ?? user?.userid ?? user?.user_id ?? '').trim();
}

function summarizeUser(user) {
  if (!user) return null;
  return {
    uid: user.uid ?? null,
    userId: user.userId ?? user.userid ?? user.user_id ?? null,
    name: user.name ?? null,
    role: user.role ?? null,
    cardno: user.cardno ?? user.cardNo ?? null,
    raw: user,
  };
}

function printSection(title, value) {
  console.log('\n============================================================');
  console.log(title);
  console.log('============================================================');
  if (value !== undefined) {
    console.dir(value, { depth: 8, colors: true });
  }
}

function validateInput({ uid, userId, name, password, cardNo }) {
  const errors = [];
  const numericUid = Number(uid);

  if (!Number.isInteger(numericUid) || numericUid <= 0 || numericUid > 3000) {
    errors.push('uid debe ser entero entre 1 y 3000');
  }

  if (!userId || String(userId).length > 9) {
    errors.push('userId es requerido y maximo 9 caracteres');
  }

  if (!name || String(name).length > 24) {
    errors.push('name es requerido y maximo 24 caracteres');
  }

  if (String(password).length > 8) {
    errors.push('password maximo 8 caracteres');
  }

  if (String(cardNo).length > 10) {
    errors.push('cardNo maximo 10 caracteres');
  }

  return errors;
}

async function main() {
  const ip = getArg('ip', process.env.ZK_IP || '192.168.1.201');
  const port = Number(getArg('port', process.env.ZK_PORT || '4370'));
  const timeout = Number(getArg('timeout', '10000'));
  const inport = Number(getArg('inport', '10000'));
  const uid = Number(getArg('uid', '50'));
  const userId = String(getArg('userid', getArg('userId', String(uid)))).substring(0, 9);
  const name = String(getArg('name', 'PRUEBA')).substring(0, 24);
  const password = String(getArg('password', '123456'));
  const role = Number(getArg('role', '0'));
  const cardNo = Number(getArg('cardno', getArg('cardNo', '0')));
  const force = hasFlag('force');

  printSection('CONFIG', {
    ip,
    port,
    timeout,
    inport,
    uid,
    userId,
    name,
    passwordLength: password.length,
    role,
    cardNo,
    force,
  });

  const validationErrors = validateInput({ uid, userId, name, password, cardNo });
  if (validationErrors.length) {
    printSection('VALIDACION FALLIDA', validationErrors);
    process.exitCode = 1;
    return;
  }

  const device = new Zkteco(ip, port, timeout, inport);

  try {
    printSection('CONECTANDO');
    const socketResult = await device.createSocket();
    printSection('RESPUESTA createSocket', socketResult);

    let info = null;
    try {
      info = await device.getInfo();
    } catch (error) {
      info = { error: error?.message || String(error), stack: error?.stack };
    }
    printSection('INFO EQUIPO', info);

    const beforeRaw = await device.getUsers();
    const beforeUsers = normalizeUsers(beforeRaw);
    const beforeByUid = beforeUsers.find((user) => Number(user?.uid) === uid);
    const beforeByUserId = beforeUsers.find((user) => getUserId(user) === userId);

    printSection('USUARIOS ANTES', {
      total: beforeUsers.length,
      existingByUid: summarizeUser(beforeByUid),
      existingByUserId: summarizeUser(beforeByUserId),
      rawShape: {
        isArray: Array.isArray(beforeRaw),
        keys: beforeRaw && typeof beforeRaw === 'object' ? Object.keys(beforeRaw) : null,
      },
    });

    if (beforeByUid && getUserId(beforeByUid) !== userId && !force) {
      printSection('NO SE ENVIO', {
        reason: 'El UID ya existe con otro userId. Usa --force solo si quieres sobrescribir ese UID.',
        existing: summarizeUser(beforeByUid),
      });
      return;
    }

    printSection('ENVIANDO setUser', {
      call: 'device.setUser(uid, userId, name, password, role, cardNo)',
      args: [String(uid), userId, name, password, role, cardNo],
    });

    const setUserResponse = await device.setUser(
      String(uid),
      userId,
      name,
      password,
      role,
      cardNo,
    );

    printSection('RESPUESTA setUser', setUserResponse);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const afterRaw = await device.getUsers();
    const afterUsers = normalizeUsers(afterRaw);
    const afterByUid = afterUsers.find((user) => Number(user?.uid) === uid);
    const afterByUserId = afterUsers.find((user) => getUserId(user) === userId);
    const created =
      Boolean(afterByUid) &&
      getUserId(afterByUid) === userId;

    printSection('USUARIOS DESPUES', {
      total: afterUsers.length,
      foundByUid: summarizeUser(afterByUid),
      foundByUserId: summarizeUser(afterByUserId),
    });

    printSection('RESULTADO FINAL', {
      createdOrUpdated: created,
      message: created
        ? 'El dispositivo confirmo el usuario por uid y userId.'
        : 'El dispositivo NO confirmo el usuario con uid y userId esperados.',
      expected: { uid, userId, name },
    });
  } catch (error) {
    printSection('ERROR COMPLETO', {
      message: error?.message || String(error),
      name: error?.name,
      code: error?.code,
      errno: error?.errno,
      syscall: error?.syscall,
      address: error?.address,
      port: error?.port,
      stack: error?.stack,
      raw: error,
    });
    process.exitCode = 1;
  } finally {
    try {
      const disconnectResult = await device.disconnect();
      printSection('DESCONECTADO', disconnectResult);
    } catch (error) {
      printSection('ERROR AL DESCONECTAR', {
        message: error?.message || String(error),
        stack: error?.stack,
      });
    }
  }
}

main();
