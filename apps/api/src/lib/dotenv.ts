import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type RawLine = { key: string; value: string };

function parseLine(line: string): RawLine | null {
  const eq = line.indexOf('=');
  if (eq < 0) return null;
  const key = line.slice(0, eq).trim();
  if (!key) return null;
  let value = line.slice(eq + 1).trim();
  const first = value[0];
  const last = value[value.length - 1];
  if (first === '"' && last === '"') value = value.slice(1, -1);
  else if (first === "'" && last === "'") value = value.slice(1, -1);
  return { key, value };
}

function loadFromFile(path: string): boolean {
  const content = readFileSync(path, 'utf8');
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parsed = parseLine(line);
    if (!parsed) continue;
    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  }
  return true;
}

export function loadDotEnv(startDir = process.cwd()): void {
  const candidates = [
    resolve(startDir, '.env'),
    resolve(startDir, '../../.env'),
    resolve(startDir, '../.env'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    loadFromFile(path);
    return;
  }
}
