#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$PROJECT_ROOT"
umask 077

pnpm exec node --input-type=module <<'NODE'
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { parseEnv } from 'node:util';

function existingConfig(path) {
  try {
    if (!lstatSync(path).isFile()) throw new Error('La configuración debe ser un archivo regular, sin enlaces simbólicos.');
    return parseEnv(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('La configuración requiere Node.js 24.');
  const api = existingConfig('.env');
  existingConfig('.env.electron');
  const driver = api?.TTRPG_DB_DRIVER ?? process.env.TTRPG_DB_DRIVER ?? 'sqlite';
  if (!['sqlite', 'postgres'].includes(driver)) throw new Error('TTRPG_DB_DRIVER inválido.');
  if (driver === 'postgres' && api === null) throw new Error('Prepara manualmente .env para PostgreSQL; consulta la guía de persistencia.');
  const dataDir = api?.TTRPG_DATA_DIR ?? process.env.TTRPG_DATA_DIR ?? join(process.cwd(), '.local/service/data');
  if (driver === 'sqlite') {
  if (!isAbsolute(dataDir) || [resolve('/'), resolve(homedir())].includes(resolve(dataDir))) {
    throw new Error('TTRPG_DATA_DIR debe ser un directorio absoluto exclusivo del servicio.');
  }
  // Comprobar los padres antes de crear carpetas o cambiar permisos.
  let parent = resolve(dataDir);
  while (!existsSync(parent)) parent = resolve(parent, '..');
  if (realpathSync(parent) !== parent) throw new Error('TTRPG_DATA_DIR no admite enlaces simbólicos.');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  chmodSync(dataDir, 0o700);
  }
  for (const relative of ['.local', '.local/service', '.local/service/data', '.local/service/backups', '.local/service/logs']) {
    const directory = join(process.cwd(), relative);
    if (existsSync(directory) && (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory() || realpathSync(directory) !== directory)) throw new Error('Los directorios privados deben ser físicos, sin enlaces simbólicos.');
    if (!existsSync(directory)) mkdirSync(directory, { mode: 0o700 }); chmodSync(directory, 0o700);
  }
  if (api === null) {
    const contents = [
      '# Configuración privada de la API. No subir a Git ni compartir las claves.',
      'TTRPG_DEPLOYMENT=local', 'TTRPG_DB_DRIVER=sqlite',
      'TTRPG_HOST=127.0.0.1', 'TTRPG_PORT=8787',
      'TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:8787',
      `TTRPG_WEB_DIR=${JSON.stringify(join(process.cwd(), 'out/web'))}`,
      `TTRPG_DATA_DIR=${JSON.stringify(resolve(dataDir))}`,
      `TTRPG_AUTH_SECRET=${randomBytes(32).toString('base64url')}`, ''
    ].join('\n');
    writeFileSync('.env', contents, { flag: 'wx', mode: 0o600 });
  }
  const clientOrigin = api?.TTRPG_PUBLIC_ORIGIN ?? 'http://127.0.0.1:8787';
  const parsedOrigin = new URL(clientOrigin);
  if (parsedOrigin.origin !== clientOrigin || !['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.protocol === 'http:' && !['localhost','127.0.0.1','[::1]'].includes(parsedOrigin.hostname)) throw new Error('TTRPG_PUBLIC_ORIGIN debe ser un origen raíz seguro.');
  if (!existsSync('.env.electron')) {
    writeFileSync('.env.electron', `# Cliente Electron: service usa la API; local usa archivos locales.\nTTRPG_ELECTRON_MODE=service\nTTRPG_SERVICE_URL=${clientOrigin}\n`, { flag: 'wx', mode: 0o600 });
  }
  chmodSync('.env', 0o600);
  chmodSync('.env.electron', 0o600);
  console.log('Configuración privada conservada; directorios internos 700 y archivos 600.');
  if (api && (!api.TTRPG_AUTH_SECRET || api.TTRPG_IDENTITY_ENABLED === 'false')) {
    throw new Error('Configuración anterior incompleta: conserva una copia y añade un secreto independiente TTRPG_AUTH_SECRET; retira TTRPG_IDENTITY_ENABLED=false. Las claves anteriores ya no autorizan. Consulta docs/service-operations.md.');
  }
  console.log('Siguiente: pnpm build:api, pnpm db:migrate e identity:bootstrap (TTY). Después: pnpm start:api. No se crearon cuentas.');
} catch (error) {
  // No volcar contenido de configuración, claves ni detalles de errores del sistema.
  console.error(error.code ? 'No se pudo preparar la configuración. Comprueba rutas y permisos.' : error.message);
  process.exitCode = 1;
}
NODE
