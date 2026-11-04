# Fábrica de software

La fuente de planificación y contratos vigentes es [SDD](../SDD/README.md). El [flujo SDD](../SDD/flujo.md) vincula cada spec/plan con su expediente; los trabajos 001–012 se consolidan en las specs 41–52. Las evidencias históricas permanecen aquí para mantener el dashboard y la trazabilidad.

Una skill, siete roles y un tablero local. Codex orquesta el trabajo; el navegador solo muestra archivos. Las instrucciones del ciclo están en [SKILL.md](../.agents/skills/factory/SKILL.md).

```text
Idea → Especificación → Construcción → Seguridad / UX / UI / Código
                            ↑             ↓ esperar las cuatro
                            └── cambios ──┤ (dos rondas por ciclo)
                                          ↓ aprobadas
                                      Aprobación
                                   ↙              ↘
                      Integrar + DMG          Necesita persona
                      (con tu orden)          aprobar / rehacer
```

## Uso en Codex

```text
$factory Agregar una regla de diagonales configurable
$factory siguiente
$factory aprobar 001-regla-diagonal
$factory rehacer 001-regla-diagonal Ajustar la interacción con teclado
```

También se entienden `/factory`, `next`, `approve` y `rework` como alias textuales. Usa `$factory` para seleccionar la skill nativa; si una sesión abierta aún no la muestra, abre una sesión nueva en este repo o pide leer `.agents/skills/factory/SKILL.md`. Los perfiles `.codex/agents/*.toml` contienen las instrucciones de cada rol y heredan el modelo de la sesión. No requieren API keys, servicios ni dependencias nuevas.

La fábrica usa `feature/factory-<id>` para funcionalidades y `fix/factory-<id>` para bugs, según `AGENTS.md`. Construye y revisa sin necesitar commits intermedios. Commit y merge esperan tu autorización explícita; `aprobar <id>` da la orden de preparar el commit local e integrar ese trabajo, sujeto a sus comprobaciones. Nunca hace push por defecto. Los permisos no se transfieren automáticamente entre sesiones.

## Ver el tablero

Desde la raíz del repo:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory factory
```

Abre [el tablero](http://127.0.0.1:8765/dashboard.html). Consulta `board.json` cada dos segundos. Las tarjetas muestran todas las rondas; al abrirlas puedes leer solicitud, spec, build, revisiones y decisión como texto Markdown seguro. El botón «Ver ejemplo» muestra datos ficticios identificados, sin escribir archivos. El tablero real empieza vacío. Detén el servidor con Ctrl+C. Abrir el HTML como `file://` no permite consultar el JSON.

## Archivos y responsables

```text
.agents/skills/factory/SKILL.md    Orquestador y ciclo
.codex/agents/*.toml              Siete perfiles de Codex
factory/
  board.json                     Solo escribe el orquestador
  dashboard.html                 Visor autónomo, sin CDN
  backlog.md                     Cola de funcionalidades
  jobs/<id>/
    solicitud.md                 Orquestador: petición y contexto
    spec.md                      Especificador: aceptación verificable
    build.md                     Constructor: cambios y pruebas
    ronda-1/
      revision.md                Orquestador: identidad del código
      revision-seguridad.md      Revisor de seguridad
      revision-ux.md             Revisor de experiencia
      revision-ui.md             Revisor visual
      revision-codigo.md         Revisor de código
    decision.md                  Aprobador
    retrabajo-ciclo-2.md          Orquestador, solo si se pide rehacer
    decision-ciclo-1.md           Decisión archivada al rehacer
```

No se crean expedientes ficticios. Los trabajos nacen al invocar la skill. Se reutilizan `SDD/specs/`, los comandos de `package.json` y las reglas de `AGENTS.md`: TypeScript estricto, React, Electron, PixiJS, SQLite y separación dominio/aplicación/infraestructura/render. Las pruebas existentes usan Vitest (`pnpm test`); checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Tras integrar se ejecuta `./scripts/build-dmg.sh`.

## Contrato mínimo del tablero

`version: 1`, `actualizado`: fecha ISO o `null`, `trabajos`: lista. Cada trabajo tiene este formato (ejemplo, no ejecución real):

```json
{
  "id": "001-regla-diagonal",
  "titulo": "Regla de diagonales configurable",
  "rama": "feature/factory-001-regla-diagonal",
  "base": "SHA de main al empezar",
  "etapa": "revision",
  "ciclo": 1,
  "ronda": 1,
  "constructor": "identificador real devuelto por Codex",
  "rondas": [
    {
      "numero": 1,
      "ciclo": 1,
      "revisiones": {
        "seguridad": "CAMBIOS",
        "ux": "APROBADO",
        "ui": "pendiente",
        "codigo": "APROBADO"
      }
    }
  ],
  "motivo": "Esperando las cuatro revisiones"
}
```

Etapas: `especificacion`, `construccion`, `revision`, `aprobacion`, `necesita-persona`, `integracion`, `integrado`. ID: dígitos, guion y slug ASCII en minúsculas; no rutas libres. `ronda` es la última ronda global (0 antes de revisar); `ciclo` empieza en 1. Opcionales: `backlog` (línea y texto), `integradoEn` (SHA del merge), `dmg` (ruta del archivo generado). No guardes secretos ni credenciales.

Cada revisión comienza exactamente con `VEREDICTO: APROBADO` o `VEREDICTO: CAMBIOS`, seguido de evidencia en español. `decision.md` comienza con `APROBAR` o `ESCALAR`. Los informes solo se publican al terminar, escribiendo un temporal en la misma carpeta y renombrándolo. El orquestador verifica los cuatro archivos y la terminación de los cuatro agentes antes de continuar. Las rondas cerradas son inmutables.

El tablero no integra ramas ni ejecuta agentes. La exclusividad de escritura y los permisos de cada rol son instrucciones de coordinación, no un aislamiento del sistema de archivos. Mantén un único orquestador por checkout.

Adaptación basada en la documentación oficial de [skills de Codex](https://learn.chatgpt.com/docs/build-skills) y [subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents): skills locales en `.agents/skills`, perfiles TOML en `.codex/agents` y delegación con las herramientas disponibles de la sesión.

## Serie actual: API y clientes

La [migración a servicio privado](migracion-servicio.md) contiene cinco prompts ejecutables y sus dependencias. Los trabajos se construyeron secuencialmente en `feature/fabrica-software`, conservando los cambios anteriores y sin commits intermedios. El usuario autorizó después su aprobación e integración local con `$factory aprobar`; el cierre conjunto espera las cuatro revisiones y decisión técnica de la última spec, seguido del DMG. No se hace push. `/fabric` se acepta como alias de `$factory`. Una aprobación técnica desbloquea la siguiente spec aunque la integración permanezca pendiente.
