#!/usr/bin/env bun
/**
 * Maison Croûte — Development Orchestrator
 *
 * This is the script behind `bun run dev`. It does three things in order:
 *
 * 1. **Load .env into process.env** (loadDotEnv)
 *    Bun doesn't auto-load .env files for scripts run via `bun run`.
 *    This manual loader reads key=value pairs from the root .env file
 *    and sets them on `process.env` before any other code runs.
 *
 * 2. **Run database migration + seed** (ensureDatabase)
 *    Executes `apps/api/src/db/seed.ts`, which idempotently applies pending
 *    Drizzle migrations and then inserts the default admin user, shop
 *    settings, and 5 sample cookies. If the seed fails (e.g. Postgres isn't
 *    running), the whole startup aborts with a non-zero exit code.
 *
 * 3. **Start API + Web concurrently**
 *    Spawns the Hono API server (`bun run src/index.ts`) and Next.js dev
 *    server (`bun x next dev`) as child processes. Their stdout/stderr is
 *    tagged with `[api]` and `[web]` prefixes so you can tell which process
 *    produced each log line. The script listens for SIGINT/SIGTERM to shut
 *    down gracefully on Ctrl+C or kill signals.
 *
 * Port configuration:
 * — API defaults to 14045, overridable via API_PORT in .env
 * — Web defaults to 14022, overridable via WEB_PORT in .env
 * These non-standard ports avoid conflicts with common dev server ports
 * (3000, 3001) on shared development machines.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The project root is one level above this script (scripts/ → root).
const root = resolve(import.meta.dir, '..');

/**
 * Manually loads key=value pairs from the root .env file into process.env.
 *
 * Bun automatically loads `.env` for `bun run` commands defined in
 * package.json, but NOT for direct script execution. Since our dev
 * orchestrator needs env vars (DATABASE_URL, ports, etc.) before spawning
 * subprocesses, we load them explicitly here.
 *
 * Rules:
 * — Blank lines and lines starting with `#` are skipped (comments).
 * — Values wrapped in single or double quotes have those quotes stripped.
 * — Existing `process.env` values are NOT overwritten, so you can override
 *   variables at the shell level (e.g. `API_PORT=9999 bun run dev`).
 */
function loadDotEnv(): void {
  const path = resolve(root, '.env');
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    // Skip blank lines and comments.
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue; // Malformed line (no = sign), skip gracefully.
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present (both single and double).
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Only set if not already defined — shell overrides take priority.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Load .env before anything else that might depend on environment variables.
loadDotEnv();

// Resolve ports from environment, falling back to the project defaults.
// These non-standard ports were chosen to avoid clashing with 3000/3001
// which are already in use on the original developer's machine.
const apiPort = process.env.API_PORT ?? '14045';
const webPort = process.env.WEB_PORT ?? '14022';

// In production, NODE_ENV is set to 'production' and Next.js runs in
// production mode. In dev, we pass the WEB_API_URL to the Next.js child
// process so it knows where to find the Hono API.
const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
const apiUrl = isDev
  ? `http://localhost:${apiPort}`
  : (process.env.WEB_API_URL ?? `http://localhost:${apiPort}`);

/**
 * Spawns a child process and returns a Promise that resolves with its
 * exit code when the process terminates.
 *
 * Each output line from the child is prefixed with a tag like `[api]` or
 * `[web]` so you can tell which service produced the log. Multi-line
 * output is handled: every newline gets its own prefix.
 *
 * @param cmd   The executable to run (e.g. 'bun').
 * @param args  Arguments passed to the executable.
 * @param opts  Working directory, display name, and extra environment vars.
 * @returns     A Promise that resolves with the child's exit code.
 */
function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; name: string; env?: NodeJS.ProcessEnv } = { name: cmd },
): Promise<number> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd ?? root,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr; ignore stdin.
    });

    // Prefix each output line with the process name so the console is readable.
    const prefix = `[${opts.name}] `;
    const tagged = (chunk: Buffer | string) =>
      prefix + chunk.toString().replace(/\n(?!$)/g, `\n${prefix}`);

    child.stdout.on('data', (b) => process.stdout.write(tagged(b)));
    child.stderr.on('data', (b) => process.stderr.write(tagged(b)));

    child.on('error', rejectP);          // e.g. command not found.
    child.on('exit', (code) => resolveP(code ?? 0));
  });
}

/**
 * Runs the database seed script inside apps/api.
 *
 * The seed script (`apps/api/src/db/seed.ts`) is idempotent: it applies
 * pending Drizzle migrations and then upserts the default data (admin
 * user, shop settings, sample cookies). Running it every time `bun run dev`
 * starts ensures the database is always in a known-good state.
 *
 * If the seed fails (non-zero exit code), the orchestrator throws and the
 * whole startup aborts — there's no point starting the API without a
 * working database.
 */
async function ensureDatabase(): Promise<void> {
  console.log('[dev] migrating + seeding database…');
  const code = await run('bun', ['run', 'src/db/seed.ts'], {
    name: 'db',
    cwd: resolve(root, 'apps/api'),
  });
  if (code !== 0) throw new Error(`seed exited with ${code}`);
}

/**
 * Starts the Hono API server on the configured port.
 *
 * Runs `bun run src/index.ts` inside apps/api. The API listens on localhost
 * with the port from API_PORT (default 14045).
 */
async function startApi() {
  return run('bun', ['run', 'src/index.ts'], { name: 'api', cwd: resolve(root, 'apps/api') });
}

/**
 * Starts the Next.js development server on the configured port.
 *
 * Runs `bun x next dev` inside apps/web. The WEB_API_URL env var is passed
 * to the child process so Next.js knows where to proxy `/api/*` requests
 * (via its rewrite rules) and where route handlers should forward auth
 * calls.
 *
 * `--hostname 0.0.0.0` binds to all network interfaces so the dev server
 * is accessible from other devices on the network (useful for testing on
 * mobile or sharing with teammates).
 */
async function startWeb() {
  return run('bun', ['x', 'next', 'dev', '--port', webPort, '--hostname', '0.0.0.0'], {
    name: 'web',
    cwd: resolve(root, 'apps/web'),
    env: { WEB_API_URL: apiUrl },
  });
}

/**
 * Main entry point.
 *
 * 1. Ensure the database is migrated and seeded.
 * 2. Start API and Web as concurrent child processes.
 * 3. Listen for SIGINT (Ctrl+C) and SIGTERM (kill) to shut down cleanly.
 * 4. When either child process exits, the orchestrator exits with the
 *    first non-zero exit code (prioritizing API failure over Web failure).
 */
async function main() {
  await ensureDatabase();

  // Start both servers. They run indefinitely until the process is killed.
  const apiP = startApi();
  const webP = startWeb();

  // Graceful shutdown: SIGINT comes from Ctrl+C in the terminal,
  // SIGTERM from `kill` or container orchestrators (Docker, K8s).
  // Child processes are cleaned up automatically when the parent exits.
  const onSig = (sig: string) => {
    console.log(`[dev] received ${sig}, shutting down`);
    process.exit(0);
  };
  process.on('SIGINT', () => onSig('SIGINT'));
  process.on('SIGTERM', () => onSig('SIGTERM'));

  // Wait for both children. They typically run until killed, so this
  // Promise.all only resolves if one of them crashes.
  const [apiCode, webCode] = await Promise.all([apiP, webP]);

  // Exit with the API's code if non-zero (API failure is more critical);
  // otherwise exit with the Web's code.
  process.exit(apiCode === 0 ? webCode : apiCode);
}

// Kick off the orchestrator. If anything throws unexpectedly (e.g. the
// seed script can't connect to Postgres), log it and exit with code 1.
main().catch((e) => {
  console.error('[dev] fatal', e);
  process.exit(1);
});
