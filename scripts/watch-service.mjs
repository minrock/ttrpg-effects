import { spawn } from 'node:child_process';
import { setTimeout, clearTimeout } from 'node:timers';
import { watchFile, unwatchFile } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = join(root, 'out/dev-service/api');
const webDir = join(root, 'out/dev-service/web');
const envFile = join(root, '.env');
process.chdir(root);
const ready = { api: false, web: false };
const watchers = [];
const watchedFiles = [];
let child;
let stopping = false;
let queue = Promise.resolve();
let generation = 0;
let restartTimer;

function log(message) { process.stdout.write(`[desarrollo] ${message}\n`); }

// Un reinicio no puede adelantarse al cierre de conexiones y al desbloqueo SQLite.
async function stopApi() {
  const current = child;
  if (!current) return;
  child = undefined;
  if (current.exitCode !== null || current.signalCode !== null) return;
  await new Promise((done, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('La API no terminó en 15 segundos. No se abrirá otra instancia; revisa el proceso '+current.pid+'.'));
    }, 15000);
    current.once('exit', () => { clearTimeout(timer); done(); });
    current.kill('SIGTERM');
  });
}

function enqueue(work) {
  queue = queue.then(work).catch(error => {
    process.stderr.write(`[desarrollo] ${error.message}\n`);
    void shutdown(1);
  });
}

function scheduleRestart() {
  const requested = ++generation;
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => enqueue(async () => {
    await stopApi();
    if (stopping || requested !== generation || !ready.api || !ready.web) return;
    const next = spawn(process.execPath, ['--env-file-if-exists='+envFile, join(apiDir, 'index.mjs')], {
      cwd: root,
      env: { ...process.env, TTRPG_WEB_DIR: webDir },
      stdio: 'inherit'
    });
    child = next;
    log(`Iniciando API (PID ${next.pid}); Ctrl+C detiene la vigilancia y el servicio.`);
    next.once('error', error => { process.stderr.write(`[desarrollo] ${error.message}\n`); void shutdown(1); });
    next.once('exit', (code, signal) => {
      if (child !== next) return;
      child = undefined;
      if (!stopping) log(`La API terminó (${signal ?? code}). Corrige el problema y guarda un cambio de API o .env para reintentar.`);
    });
  }), 200);
}

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  generation++;
  clearTimeout(restartTimer);
  for (const file of watchedFiles) unwatchFile(file);
  await Promise.all(watchers.map(watcher => watcher.close()));
  // Esperar también un cierre que ya comenzó por un cambio de código.
  await queue;
  try { await stopApi(); } catch (error) { process.stderr.write(`[desarrollo] ${error.message}\n`); code = 1; }
  process.exitCode = code;
}

async function watchBuild(kind, configFile, outDir, plugins = []) {
  const watcher = await build({
    configFile: join(root, configFile), plugins: [...plugins, ...(kind === 'api' ? [{ name: 'esperar-cierre-api', async buildStart() { await queue; } }] : [])],
    build: { outDir, emptyOutDir: false, watch: { buildDelay: 150 }, minify: false }
  });
  watchers.push(watcher);
  if (stopping) { await watcher.close(); return; }
  watcher.on('event', event => {
    if (stopping) return;
    if (event.code === 'START') {
      ready[kind] = false;
      if (kind === 'api') { generation++; clearTimeout(restartTimer); enqueue(stopApi); }
    } else if (event.code === 'ERROR') {
      ready[kind] = false;
      log(`Error al compilar ${kind}; esperando la corrección.`);
    } else if (event.code === 'END') {
      // Rollup también emite END después de ERROR: únicamente BUNDLE_END habilita el arranque.
      if (ready.api && ready.web && (kind === 'api' || !child)) scheduleRestart();
      if (kind === 'web' && ready.web) log('Frontend actualizado. Recarga el navegador para ver los cambios.');
    } else if (event.code === 'BUNDLE_END') {
      ready[kind] = true;
    }
  });
}

// Rollup sigue imports; incluir también los archivos públicos que Vite copia sin importar.
const publicAssets = {
  name: 'vigilar-assets-publicos',
  async buildStart() {
    const publicDir = join(root, 'src/renderer/public');
    this.addWatchFile(publicDir);
    for (const entry of await readdir(publicDir, { recursive: true, withFileTypes: true })) {
      this.addWatchFile(join(entry.parentPath, entry.name));
    }
  }
};

process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });

try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('El servicio requiere Node.js 24.');
  log('Compilación inicial de API y web; después, vigilancia incremental. No se ejecuta typecheck en cada cambio.');
  // Limpiar solo artefactos propios al iniciar; conservar la última web durante cada recompilación.
  await Promise.all([apiDir, webDir].map(directory => rm(directory, { recursive: true, force: true })));
  await watchBuild('api', 'src/server/vite.config.ts', apiDir);
  if (!stopping) await watchBuild('web', 'src/web/vite.config.ts', webDir, [publicAssets]);
  if (!stopping) {
    watchFile(envFile, { interval: 500 }, () => { log('.env cambió; reiniciando API con la configuración actualizada.'); scheduleRestart(); });
    watchedFiles.push(envFile);
    for (const config of ['src/server/vite.config.ts', 'src/web/vite.config.ts', 'pnpm-lock.yaml']) {
      const file = join(root, config);
      watchFile(file, { interval: 500 }, () => log(`${config} cambió. Detén y vuelve a ejecutar pnpm start:api para aplicar configuración o dependencias.`));
      watchedFiles.push(file);
    }
  }
} catch (error) {
  process.stderr.write(`[desarrollo] ${error.message}\n`);
  await shutdown(1);
}
