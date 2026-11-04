# API privada del servicio de cuentas

El artefacto `out/api/index.mjs` compone identidad, propiedad, invitaciones y runtime contextual. Requiere Node24. `pnpm start:api` carga `.env`; variables del entorno explícito tienen precedencia. No abre `ServiceStore`, no crea cuentas al arrancar y no adopta datos legados automáticamente.

| Configuración | Uso |
| --- | --- |
| `TTRPG_HOST`, `TTRPG_PORT` | Listener; defaults127.0.0.1 y8787. |
| `TTRPG_PUBLIC_ORIGIN` | Origen raíz exacto; HTTPS fuera de loopback. |
| `TTRPG_WEB_DIR` | Build web absoluto/físico. Nunca raíz del proyecto. |
| `TTRPG_AUTH_SECRET` | Aleatorio base64url de al menos32bytes, privado y persistente. |
| `TTRPG_DB_DRIVER`, `TTRPG_DEPLOYMENT` | SQLite/local o PostgreSQL; production exige PostgreSQL. |
| `TTRPG_DATA_DIR` | Solo SQLite: directorio absoluto privado; `control.sqlite`. |
| `TTRPG_DATABASE_URL`, `TTRPG_DB_TLS`, `TTRPG_DB_CA_FILE` | PostgreSQL con TLS verify-full/CA en producción. Assets en bytea; sin SQLite auxiliar. |

`TTRPG_IDENTITY_ENABLED` ya no selecciona acceso legado: ausente/true usan cuentas obligatorias; false u otro valor aborta antes de escuchar. `TTRPG_DM_KEY` y `TTRPG_PLAYER_KEY` antiguos no autorizan y setup no los genera. Sus valores existentes no se reemplazan inadvertidamente.

## Familias de autoridad

| Rutas | Autoridad y documentación |
| --- | --- |
| `/api/v1/health` | Salud con versión del manifiesto. |
| `/api/v1/identity/*` | Cuenta/cambio de contraseña/admin DM: [identidad](identity.md). |
| `/api/v1/admin/systems/*` | Administrador de catálogo, sin acceso DM: [datos privados](owned-data.md). |
| `/api/v1/dm/{games,scenes,assets,libraries,scene-links,systems}/*` | DM propietario, revisiones y bindings: [datos privados](owned-data.md). |
| `/api/v1/dm/definitions/{scenes,monsters}/:id` GET | Presentaciones de los bindings de una instancia propia retenida. No admite referencias arbitrarias, no consulta otra cuenta ni reemplaza ID privado por built-in. |
| `/api/v1/dm/games/:gameId/{opening,invitation}/*` | Apertura/invitación: [invitaciones](invitations.md). |
| `/api/v1/games/:gameId/{admission,guest/session,guest/leave}` | Invitado por cookie de path, independiente de cuentaDM. |
| `/api/v1/{dm/}games/:gameId/{table,dice,participants,assets}/*` | Audiencias separadas, SSE contextual, moderación: [protocolo](moderation.md). |

Las rutas globales antiguas `/auth/*`, `/scenes`, `/assets`, `/libraries`, `/monster-templates`, `/table/*`, `/dice/*` bajo `/api/v1` devuelven404 sin datos. Cookie `ttrpg_session` y query `?view=player` no otorgan acceso. `/api/*` jamás cae al shell HTML.

Host y Origin exactos; mutaciones requieren Origin. Sin CORS, contenido remoto ni confianza en X-Forwarded-For. Cookies HttpOnly/SameSite Strict y Secure con HTTPS. Respuestas no-store/no-referrer, CSP restrictiva y estáticos confinados a build físico sin symlinks. No se sirven env, respaldos ni `.local`.

General600solicitudes/minuto/IP,10000entradas,100conexiones,100requests/socket, cabeceras16KiB/10s, cuerpo30s y keep-alive5s. JSON10MiB, imagen20MiB/40millones píxeles; validación de imagen acotada. Cuotas específicas de login/admisión/runtime y reservaDM se describen en sus guías.429 conserva Retry-After. No hay autorización por capacidades UI ni caché de otra cuenta.

Un runtime por base; exclusión antes del listener. Pérdida de lock termina accesos y falla cerrada. Reinicio conserva datos/sesiones/plazos, vacía proyección/dados y no reabre partidas. [Operación, migración y restauración](service-operations.md).
