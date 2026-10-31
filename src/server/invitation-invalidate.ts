import { readDatabaseConfig } from "../infrastructure/server/database/config";
import { invalidateRestoredAccess } from "../infrastructure/server/invitations/restore-access";
void invalidateRestoredAccess(readDatabaseConfig(process.env)).then(() => {
  process.stdout.write("Acceso invitado invalidado: aperturas cerradas y credenciales revocadas.\n");
}).catch(() => { process.stderr.write("No se confirmó la invalidación. Mantén la API detenida y comprueba configuración y migraciones.\n"); process.exitCode = 1; });
