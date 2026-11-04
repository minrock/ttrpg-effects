# Spec 40 — Fábrica de software para Codex

## Objetivo

Coordinar funcionalidades del repositorio mediante una skill local, subagentes con roles acotados y evidencia Markdown persistente. El flujo completo debe poder comprenderse en pocos minutos y consultarse en un tablero independiente de Electron.

## Alcance

- Skill `factory` en `.agents/skills/`, perfiles Codex en `.codex/agents/` e instrucciones en español.
- Especificación → construcción → seguridad/UX/UI/código → decisión, esperando las cuatro revisiones antes de corregir; máximo dos rondas por ciclo.
- El constructor se reutiliza para las correcciones; los subagentes reciben contexto por archivos y no escriben el tablero.
- Estado durable en `factory/board.json`, cola en `backlog.md` y expedientes creados bajo demanda en `jobs/`.
- Comandos para iniciar, tomar el siguiente, aprobar y rehacer; permisos de Git y ramas conforme a `AGENTS.md`.
- Tablero HTML autónomo servido con Python, sondeo del JSON, tarjetas por etapa, chips por ronda y lectura segura de Markdown. Demostración explícita separada del estado real.

## Criterios de aceptación

1. Las instrucciones identifican stack, comandos y convenciones existentes sin duplicar la arquitectura ni introducir dependencias.
2. Ningún revisor puede autorizar un merge; el ciclo espera cuatro informes completos de la misma revisión y conserva las rondas anteriores.
3. La falta de permisos de commit no impide construir y revisar; el merge espera la orden del usuario. Tras integrar una spec se genera el DMG.
4. El tablero representa todas las etapas y rondas, destaca intervención humana y permite leer los archivos del expediente sin ejecutar HTML de esos archivos.
5. El sondeo conserva datos visibles ante errores y se recupera; la lectura de archivos no muestra respuestas atrasadas de otra selección.
6. Estado inicial vacío y demostración claramente ficticia. Navegación por teclado, diálogo cerrable y presentación adaptable a pantallas estrechas.
7. Pasan `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` y las pruebas de comportamiento del visor. Verificación visual del ejemplo en escritorio y ancho estrecho.

## Reutilización y límites

Se reutilizan `AGENTS.md`, `SDD/specs/`, Vitest, jsdom, los scripts pnpm y el empaquetado actual. No cambia el formato `.ttrpgscene`, el runtime Electron ni los permisos globales de Codex. El visor es de lectura: los agentes se ejecutan desde la sesión de Codex. Los roles son límites de coordinación, no un sandbox del filesystem.
