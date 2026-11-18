# 62 — Servicio exclusivamente web

**Estado:** Implementada, validada e integrada en `main` (3.35.0). **Revisión:** 0.1. **Fecha:** 2026-11-17. **Tipo:** cambio de plataforma.
**Dependencias:** SDD41–52 (cliente, API, identidad, persistencia y operación), SDD54, SDD58–61.
**Orden:** el usuario solicita eliminar Electron y conservar únicamente el servicio web. La implementación está solicitada; la rama `feature/spec-62-solo-web` fue autorizada desde `4dc2786` (3.34.0). La orden posterior «Haz comit, push y merge» autoriza el cierre Git; no incluye despliegue ni migraciones reales.
**Versión:** 3.35.0; fuente oficial `package.json`. **Evidencia:** [validacion.md](validacion.md).

## Problema y objetivo

El producto mantiene Electron autónomo, Electron conectado y navegador. El usuario decide concentrar el mantenimiento en el servicio web para facilitar su operación en distintos servidores. El resultado será una aplicación React/Pixi en navegador con API Node.js, sin runtime, puentes, arranque ni empaquetado Electron.

La retirada simplifica las plataformas soportadas. No convierte por sí sola el runtime de juego en un sistema distribuido: actualmente existe un proceso API autorizado por base y su estado de mesa es efímero.

## Alcance y exclusiones

- Retirar ambos modos Electron, main/preload/IPC, adaptadores exclusivamente nativos, entradas desktop, configuración y dependencias de empaquetado/DMG.
- Mantener `src/renderer` y demás módulos compartidos que el navegador utiliza: editor, PlayerApp, Pixi/Three, reglas, formatos y clientes HTTP/SSE. El nombre de una carpeta o método legado no justifica eliminarlo si participa del servicio web.
- Eliminar autodetección del bridge nativo y ramas activas basadas en Electron. Componer clientes web explícitamente; Storybook y pruebas usan proveedores/dobles propios.
- Hacer que los comandos principales de desarrollo, build y arranque correspondan al servicio web; conservar builds API/frontend independientes, Storybook y CLIs operativas.
- Actualizar documentación vigente, reglas del proyecto y contexto de agentes para la plataforma web. Conservar changelog, specs y evidencias históricas como historia, indicando la decisión que las sustituye cuando corresponda.
- Mantener el comportamiento actual del navegador. No reintroducir el desplegable de escena retirado ni trasladar automáticamente funciones exclusivas del desktop a controles nuevos.
- Conservar archivos y bases reales, `.env` privados, perfiles y antiguos instaladores del usuario. Retirar fuentes de empaquetado no equivale a borrar artefactos privados o datos locales.

Quedan fuera Django, Redis, nuevos motores de persistencia, microservicios, escalado horizontal sobre una misma base, contenedores, nuevos despliegues productivos y cambios funcionales ajenos a la retirada. Las instalaciones independientes deben documentarse con almacenamiento, configuración y hosts propios; no se promete aislamiento de cookies por cambiar únicamente el puerto del mismo host.

## Reglas y contratos

- Admin/DM/invitado conservan autenticación, permisos, privacidad, Host/Origin, cookies y protocolo HTTP/SSE. La UI no obtiene acceso privilegiado al servidor.
- Guardado, borradores IndexedDB/remotos, campañas/arcos/escenas, preparación y publicación continúan por los adaptadores del servicio.
- Se conserva la publicación explícita «Jugador», la entrada de invitados y los dados públicos del jugador. No se abren ventanas nativas ni se anuncian capacidades nativas inexistentes.
- `.ttrpgscene` conserva formato 2/lectura de 1; el paquete operativo conserva escritura v5/lectura v1–v5. No hay migración de esquema ni conversión automática de datos del desktop.
- SQLite del servicio y PostgreSQL TLS siguen soportados. Los repositorios compartidos con compatibilidad/transferencia del servidor se conservan aunque existieran antes del servicio web.
- Los servidores iniciados para validar serán sintéticos y se cerrarán al terminar, verificando puertos libres. No se inicia ni modifica el servicio operativo.

## Criterios de aceptación

| ID | Condición observable | Verificación |
| --- | --- | --- |
| CA-01 | El producto activo no depende de Electron/electron-vite/electron-builder ni incluye entradas main/preload/IPC o empaquetado nativo. | Inventario de referencias/imports, manifiesto, lockfile y build desde dependencias actuales. |
| CA-02 | El editor y jugador web se montan con clientes explícitos, sin `window.ttrpg`, fallback nativo ni bifurcación por Electron. | Pruebas de composición, ausencia de bridge y montaje web/Storybook. |
| CA-03 | Administración, apertura contextual, guardado/recuperación y navegación funcionan en navegador con los permisos existentes. | Regresiones dirigidas y recorrido sintético de campaña/arco/escena, guardado y recarga. |
| CA-04 | Publicación explícita e invitaciones muestran la escena a jugadores y mantienen dados/controles web por rol, sin ventanas nativas. | Regresiones de publicación/dados y recorrido DM/jugador web sobre API sintética. |
| CA-05 | `pnpm dev`, `pnpm build` y el arranque documentado sirven al producto web; API/web independientes, Storybook y CLIs siguen disponibles. | Builds, smoke de comandos y guard de imports; no empaquetado Electron residual. |
| CA-06 | Se mantienen formatos, repositorios y drivers usados por el servicio, sin migraciones ni cambios en datos reales. | Pruebas de formatos/adaptadores afectados, inspección de dependencias y diff de persistencia. |
| CA-07 | Las guías y AGENTS describen la plataforma web y diferencian instalaciones independientes del escalado horizontal todavía no soportado. | Revisión documental de rutas/comandos, límites, aislamiento y trazabilidad histórica. |
| CA-08 | La entrega registra pruebas reales, versión/changelog, límites y cierre de todos los procesos de validación iniciados. | Evidencia por criterio, lint/typecheck/tests/builds y comprobación final de procesos/puertos. |

## Reutilización y compatibilidad

Se reutilizan `src/web`, el editor bajo `src/renderer/src`, dominio, aplicación, contratos compartidos, adaptadores browser y servidor. Los nombres heredados de contratos internos pueden conservarse cuando tienen semántica web real; no se exige un refactor general de nombres o carpetas. Las pruebas exclusivamente desktop se retiran con ese producto; las pruebas de módulos compartidos se adaptan a composición explícita y mantienen sus aserciones funcionales.

## Riesgos y decisiones

- Eliminar carpetas por nombre puede romper transferencias o repositorios legados todavía usados por la API: inventariar antes de retirar.
- Varias pruebas y stories usan el bridge o defaults desktop: corregir composición, sin debilitar validaciones de producto.
- Electron servicio ya compartía la web; se retira su contenedor, manteniendo ese frontend.
- El límite de un runtime por base y los eventos efímeros permanecen. La propuesta Django/Node/caché discutida anteriormente necesita su propio alcance posterior.

## Entrega

[Plan](plan.md) y [tareas](tareas.md) preparados por TL para esta revisión; implementación ejecutada por builders y validación coordinada por PM. [Validación](validacion.md) registra resultados y límites. La orden posterior de integración se ejecutó mediante el merge `9521af9`; [evidencia Git](validacion.md#integración-git).
