import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting Dashboard Application...\n');

// Start backend
console.log('📦 Starting dashboard backend on port 3001...');
const backend = spawn('node', ['src/index.js'], {
  cwd: join(projectRoot, 'dashboard/backend'),
  stdio: 'inherit',
  env: { ...process.env }
});

// Wait for backend to initialize
await new Promise(resolve => setTimeout(resolve, 3000));

// Start frontend
console.log('🎨 Starting dashboard frontend on port 5000...');
const frontend = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5000'], {
  cwd: join(projectRoot, 'dashboard/frontend'),
  stdio: 'inherit',
  env: { ...process.env }
});

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down dashboard...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});

// Keep process alive
backend.on('exit', (code) => {
  console.error(`❌ Backend exited with code ${code}`);
  frontend.kill();
  process.exit(code || 1);
});

frontend.on('exit', (code) => {
  console.error(`❌ Frontend exited with code ${code}`);
  backend.kill();
  process.exit(code || 1);
});
