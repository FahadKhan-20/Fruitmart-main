import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isProd = process.argv.includes('--prod');

console.log('----------------------------------------------------');
console.log(' Starting FruitMart Fullstack & Database System');
console.log(' Mode:', isProd ? 'Production' : 'Development');
console.log('----------------------------------------------------');

// 1. Launch Database Service
const dbProcess = spawn('node', [path.join(rootDir, 'scripts', 'local-db.mjs')], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir,
});

dbProcess.on('error', (err) => {
  console.error('[DB] Failed to start database:', err);
});

// Wait 1 second before starting Next.js
setTimeout(() => {
  const nextCmd = isProd ? 'start' : 'dev';
  const nextArgs = isProd ? ['next', 'start'] : ['next', 'dev', '--webpack'];

  const webProcess = spawn('npx', nextArgs, {
    stdio: 'inherit',
    shell: true,
    cwd: rootDir,
  });

  webProcess.on('error', (err) => {
    console.error('[Web] Failed to start Next.js:', err);
  });

  process.on('SIGINT', () => {
    dbProcess.kill();
    webProcess.kill();
    process.exit();
  });

  process.on('SIGTERM', () => {
    dbProcess.kill();
    webProcess.kill();
    process.exit();
  });
}, 1000);
