const fs = require('fs');
const net = require('net');
const { execSync } = require('child_process');

function readEnvPort() {
  if (process.env.PORT) return process.env.PORT;
  try {
    const env = fs.readFileSync('.env', 'utf8');
    const match = env.match(/^PORT=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function getPortOwner(port) {
  try {
    return execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const port = readEnvPort() || '3000';
const server = net.createServer();

server.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const owner = getPortOwner(port);
    console.error(`Port ${port} is already in use.`);
    if (owner) console.error(owner);
    console.error('Stop that process or choose another PORT before running npm start.');
    process.exit(1);
  }
  throw error;
});

server.once('listening', () => {
  server.close();
});

server.listen(Number(port), '0.0.0.0');
