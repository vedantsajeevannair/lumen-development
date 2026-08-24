const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const net = require('net');

// Clear terminal and print starting message
console.clear();
console.log("\x1b[1;36mStarting LUMEN frontend + backend...\x1b[0m\n");

const backendPath = path.resolve(__dirname, '../backend');

function checkPort(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function isPortInUse(port) {
  const hosts = ['127.0.0.1', '::1', 'localhost'];
  for (const host of hosts) {
    // eslint-disable-next-line no-await-in-loop
    if (await checkPort(port, host)) return true;
  }
  return false;
}

async function start() {
  const frontendInUse = await isPortInUse(5173);
  const backendInUse = await isPortInUse(4000);

  let frontend = null;
  let backend = null;

  if (frontendInUse) {
    console.log("\x1b[33m[dev-runner]\x1b[0m Frontend already running on :5173, reusing it.");
  } else {
    frontend = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
      cwd: __dirname,
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: 'true' }
    });
  }

  if (backendInUse) {
    console.log("\x1b[33m[dev-runner]\x1b[0m Backend already running on :4000, reusing it.");
  } else {
    backend = spawn('npm', ['run', 'start:dev'], {
      cwd: backendPath,
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: 'true' }
    });
  }

  function setupStream(proc, name, color) {
    if (!proc) return;
    const rl = readline.createInterface({
      input: proc,
      terminal: false
    });

    rl.on('line', (line) => {
      process.stdout.write(`${color}[${name}]\x1b[0m ${line}\n`);
    });
  }

  // Timeout to print the ready message since logs are noisy
  setTimeout(() => {
    console.log("\n\x1b[1;32m======================================================================\x1b[0m");
    console.log("\x1b[1;32m  LUMEN DEV SERVICES RUNNING SUCCESSFULLY! \x1b[0m");
    console.log("\x1b[1;32m======================================================================\x1b[0m");
    console.log("\x1b[1;36m  ➜  Front-End (Web Interface):  \x1b[1;32mhttp://localhost:5173/\x1b[0m");
    console.log("\x1b[1;35m  ➜  Back-End (API):             \x1b[1;32mhttp://localhost:4000/\x1b[0m");
    console.log("\x1b[1;30m----------------------------------------------------------------------\x1b[0m");
    console.log("\x1b[1;33m  Press Ctrl+C to terminate services started by this runner.\x1b[0m");
    console.log("\x1b[1;32m======================================================================\x1b[0m\n");
  }, 2000);

  setupStream(frontend?.stdout, 'frontend', '\x1b[36m');
  setupStream(frontend?.stderr, 'frontend-err', '\x1b[31m');
  setupStream(backend?.stdout, 'backend', '\x1b[35m');
  setupStream(backend?.stderr, 'backend-err', '\x1b[31m');

  // Cleanup on exit
  let isCleaningUp = false;
  function cleanup() {
    if (isCleaningUp) return;
    isCleaningUp = true;

    console.log('\n\x1b[1;33mStopping processes started by this runner...\x1b[0m\n');

    frontend?.kill();
    backend?.kill();

    setTimeout(() => {
      process.exit();
    }, 500);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

start().catch((err) => {
  console.error("\x1b[31m[dev-runner] Failed to start services:\x1b[0m", err);
  process.exit(1);
});
