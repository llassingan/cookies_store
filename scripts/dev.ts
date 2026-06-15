#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

function loadDotEnv(): void {
  const path = resolve(root, '.env');
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const apiPort = process.env.API_PORT ?? '14045';
const webPort = process.env.WEB_PORT ?? '14022';
const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
const apiUrl = isDev
  ? `http://localhost:${apiPort}`
  : (process.env.WEB_API_URL ?? `http://localhost:${apiPort}`);

function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; name: string; env?: NodeJS.ProcessEnv } = { name: cmd },
): Promise<number> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd ?? root,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const prefix = `[${opts.name}] `;
    const tagged = (chunk: Buffer | string) =>
      prefix + chunk.toString().replace(/\n(?!$)/g, `\n${prefix}`);
    child.stdout.on('data', (b) => process.stdout.write(tagged(b)));
    child.stderr.on('data', (b) => process.stderr.write(tagged(b)));
    child.on('error', rejectP);
    child.on('exit', (code) => resolveP(code ?? 0));
  });
}

async function ensureDatabase(): Promise<void> {
  console.log('[dev] migrating + seeding database…');
  const code = await run('bun', ['run', 'src/db/seed.ts'], {
    name: 'db',
    cwd: resolve(root, 'apps/api'),
  });
  if (code !== 0) throw new Error(`seed exited with ${code}`);
}

async function startApi() {
  return run('bun', ['run', 'src/index.ts'], { name: 'api', cwd: resolve(root, 'apps/api') });
}

async function startWeb() {
  return run('bun', ['x', 'next', 'dev', '--port', webPort, '--hostname', '0.0.0.0'], {
    name: 'web',
    cwd: resolve(root, 'apps/web'),
    env: { WEB_API_URL: apiUrl },
  });
}

async function main() {
  await ensureDatabase();
  const apiP = startApi();
  const webP = startWeb();
  const onSig = (sig: string) => {
    console.log(`[dev] received ${sig}, shutting down`);
    process.exit(0);
  };
  process.on('SIGINT', () => onSig('SIGINT'));
  process.on('SIGTERM', () => onSig('SIGTERM'));
  const [apiCode, webCode] = await Promise.all([apiP, webP]);
  process.exit(apiCode === 0 ? webCode : apiCode);
}

main().catch((e) => {
  console.error('[dev] fatal', e);
  process.exit(1);
});
