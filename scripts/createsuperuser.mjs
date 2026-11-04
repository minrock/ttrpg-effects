import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cli = join(root, 'out/api/identity-cli.mjs');
const args = process.argv.slice(2);
const help = `Crear un administrador desde una terminal local.

Uso: pnpm createsuperuser
     node scripts/createsuperuser.mjs

Solicita correo, nombre y contraseña con confirmación oculta.
Puedes elegir una contraseña definitiva (10–128 caracteres) o pulsar Enter
para generar una temporal, que se muestra una sola vez en esta terminal.
Carga el .env de este proyecto; no abre un servidor ni usa HTTP.
Antes: pnpm build:api y pnpm db:migrate. Detén la API si usas SQLite.
Permite varios administradores, cada uno con un correo distinto.
Si el correo ya existe y perdiste el acceso,
detén la API y usa pnpm identity:recover-admin.
Solo la contraseña generada exige cambio al ingresar o con pnpm identity:password.
No admite credenciales por argumentos ni pipes.
`;

function fail(message) {
  process.stderr.write(message + '\n');
  process.exitCode = 1;
}

if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  process.stdout.write(help);
} else if (args.length) {
  fail('Usa pnpm createsuperuser sin argumentos. Las credenciales se solicitan en la terminal.');
} else if (Number(process.versions.node.split('.')[0]) !== 24) {
  fail('El servicio requiere Node.js 24.');
} else if (!process.stdin.isTTY || !process.stdout.isTTY) {
  fail('Se requiere una terminal TTY interactiva; no se admiten contraseñas por pipe.');
} else if (!existsSync(cli)) {
  fail('Falta el comando compilado. Ejecuta pnpm build:api y pnpm db:migrate antes de crear el administrador.');
} else {
  // Un único camino de provisión: mismas validaciones, hash y transacción que el CLI existente.
  process.stdout.write('Crear administrador local. La API debe estar detenida si usas SQLite.\n');
  const child = spawn(process.execPath, [
    `--env-file-if-exists=${join(root, '.env')}`, cli, 'create-admin'
  ], { cwd: root, stdio: 'inherit' });
  const interrupt = () => child.kill('SIGINT');
  const terminate = () => child.kill('SIGTERM');
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  child.once('error', () => fail('No se pudo iniciar el comando local de administración.'));
  child.once('close', code => {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', terminate);
    process.exitCode = code ?? 1;
  });
}
