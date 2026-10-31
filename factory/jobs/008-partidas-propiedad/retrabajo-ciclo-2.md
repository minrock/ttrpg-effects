# Retrabajo autorizado — ciclo 2 de 008

Fecha: 2026-10-30. El usuario acepta la propuesta de separación de sistemas, datos y presentación, con esta corrección explícita: «no hagamos un borrado permitamos al Admin máximo deshabilitar para que no se puedan crear cosas nuevas pero la versión para quien pueda seguir viendo sus monstruos y temas de reglas […] Por ahora entonces hagamos lo propuesto para 8 + que el Admin solo pueda deshabilitar y no borrar los templates y continua con la 8».

Esto autoriza abrir ciclo 2 y cambiar el alcance de 008; no es aceptar el defecto residual ni autorizar integración. Conservar rondas 1/2 e historial. Próximas rondas globales 3/4. Misma rama y checkout; sin git add/commit/push/merge/DMG, datos privados ni servicios originales.

## Cambio aceptado

- Catálogo compartido de sistemas y versiones, administrado solo por admin. Separar reglas/capacidades, esquema de datos y presentación (plantillas). DMs consumen definiciones publicadas y conservan propiedad de sus monstruos/escenas/datos; admin de catálogo no recibe acceso implícito a contenido privado.
- Publicaciones inmutables y referencias estables por versión. Admin crea/configura/publica y puede deshabilitar para usos nuevos; NO borrar plantillas, incluidas sus versiones, por API ni puerto. La deshabilitación conserva lectura, render, reglas, exportación y edición de instancias existentes sin cambio de referencia; no permite crear/copiar nuevos monstruos o asociar nuevas partidas con esa definición deshabilitada. Especificar comportamiento de borradores/activación y distinguir actualización de instancia de creación nueva.
- Persistir sistema/version de la partida; coherencia entre sistema de partida y nuevas referencias de recursos. Un único viewport sigue consumiendo configuración resuelta; reglas fuera de React/Pixi. Entregar contratos backend/dominio para adaptación en011; no construir anticipadamente pantallas o un segundo viewport.
- Reutilizar perfil D&D y perfil genérico existente, capacidades implementadas y medición actual; no inventar soporte de nuevas mecánicas narrativas. Registro tipado/manifest versionado para módulos incorporados prepara futura arquitectura por plugins. Instalación de terceros, marketplace y ejecución dinámica de JS son FUTUROS, no alcance actual.
- Resolver hallazgo de Código ronda2 por retención y consistencia transaccional, incluyendo concurrencia deshabilitar/crear y Promise.all dentro de la unidad autorizada. Acreditar ambos motores reales.
- Datos/plantillas personales históricas no pasan automáticamente a catálogo público. Conservar referencias y contenido privado, diseñar transición explícita reproducible y compatible con exportación/importación/SQLite→PG. Preservar escenas v1/v2 y Electron local sin cuentas; no aplicar restricciones del servicio al editor local autónomo.
- Mantener todas las garantías anteriores de008: aislamiento owner, CAS/idempotencia, revocación, efectos postCOMMIT, transferencia y rollback. No debilitar separación de roles para facilitar el catálogo admin.
- Versión del trabajo sigue3.10.0, único bump de008; ajustar changelog al alcance final. Documentar contrato para009/010/011 sin declarar UI ni runtime invitados implementados.

## Entradas y responsabilidades

Especificador lee solicitud/spec-ciclo-1/build-ciclo-1, cuatro informes ronda2, modelo común y fuentes reales; publica únicamente spec.md reconciliada. Después constructor original, si recuperable, implementa spec final y escribe build.md. Orquestador solo coordinación/solicitudes/tablero. Código congelado hasta spec final y comienzo del constructor.

El PostgreSQL temporal anterior fue cerrado/eliminado; el orquestador reprovisionará uno nuevo. No usar rutas históricas como si estuvieran activas. Recetas en /tmp/ttrpg-auth-pg-setup.py y /tmp/ttrpg-auth-pg-run.py. Prohibido imprimir conexión privada.
