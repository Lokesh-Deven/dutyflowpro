const { spawn } = require('child_process');
const http = require('http');

// 1. Listen on port 9002 and redirect to port 3000
const forwarder = http.createServer((req, res) => {
  res.writeHead(307, {
    Location: `http://localhost:3000${req.url}`,
    'Access-Control-Allow-Origin': '*',
  });
  res.end();
});

forwarder.on('error', (err) => {
  console.warn('[DutyFlow] Port 9002 redirector warning:', err.message);
});

forwarder.listen(9002, () => {
  console.log('[DutyFlow] Port 9002 forwarder active -> http://localhost:3000');
});

// 2. Start Next.js on port 3000 (matching Supabase authentication Site URL)
const nextProcess = spawn('npx', ['next', 'dev', '--turbopack', '-p', '3000'], {
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  forwarder.close();
  if (nextProcess) nextProcess.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
