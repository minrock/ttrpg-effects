# Coordinación 011

## Especificación

Especificador /root/especificador_011 finalizó spec.md reconciliada el 2026-10-31. La construcción espera APROBAR de 010 y comprobación final de contratos. No hay constructor011 activo todavía.

## PostgreSQL de pruebas y herramientas de respaldo

El clúster temporal010 sigue reservado a su constructor hasta finalizar sus gates. No usar simultáneamente ni detenerlo. Configuración privada /tmp/ttrpg-auth-pg-env.json (no imprimir), wrapper /tmp/ttrpg-auth-pg-run.py. Al empezar011 el orquestador confirmará disponibilidad real y asignación exclusiva.

Se prepararon herramientas cliente PostgreSQL17.11 de Postgres.app2.9.6, compatibles por versión mayor con el servidor17.10. Descarga oficial https://github.com/PostgresApp/PostgresApp/releases/download/v2.9.6/Postgres-2.9.6-17.dmg, SHA256 b38bb00b8c8702a568270aab85995c550f7f93d1503b818efdc5ff9a519b7168 contrastado contra digest de release oficial. codesign --verify --deep --strict correcto; firma Developer ID Application: Jakob Egger (ZF84SJ5A3G), cadena Apple. Copia únicamente temporal, imagen desmontada; no instalación global ni servidor adicional.

Rutas en /tmp/ttrpg-auth-pg-tools.json (0600); raíz /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-pg-tools-lhd0tfpg. pg_dump, pg_restore y psql --version correctos17.11. Esto verifica disponibilidad de herramientas, todavía no prueba respaldo/restauración de la app. Consumir conexión mediante PGPASSFILE temporal0600 y PGSSLMODE=verify-full/PGSSLROOTCERT; contraseña nunca en argv o logs. Limpiar únicamente fixtures propias; orquestador retirará herramientas al final.

## Cierre real

Leer solicitud completa y su preflight. No leer datos personales ni archivos privados durante construcción/revisión. La adopción de escena legada espera propietario DM, sin bloquear implementación. Servicio antiguo8787 permanece activo hasta corte del orquestador.

## Comprobación de herramientas de respaldo

Con PG liberado por todos los revisores010 se realizó un roundtrip independiente: pg_dump17.11 formato custom y pg_restore17.11 contra servidor17.10, TLS verify-full y PGPASSFILE0600. Dos bases UUID propias, tabla mínima y contenido Unicode verificado en destino; ambas bases y archivos de prueba retirados. Verifica herramientas, no sustituye respaldo/restauración integral de aplicación exigido en011.
