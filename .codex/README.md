# Agentes locales del proyecto

El hilo principal asume el rol PM al invocar Factory o Build. TL, UI/UX y builders reciben encargos acotados de ese hilo y entregan decisiones o implementación con evidencia. Configuración local del repositorio, sin instalar perfiles globales.

| Perfil | Modelo / razonamiento | Responsabilidad |
| --- | --- | --- |
| [backend_builder](agents/backend_builder.toml) | GPT-5.6 Terra / high | API HTTP/SSE, seguridad y SQLite/PostgreSQL |
| [frontend_builder](agents/frontend_builder.toml) | GPT-5.6 Terra / high | React navegador, clientes HTTP/SSE y PixiJS |
| [ui_ux](agents/ui_ux.toml) | GPT-6 Sol / high | Componentes, interacción, consistencia, investigación visual, catálogo y prototipos |
| [technical_lead](agents/technical_lead.toml) | GPT-6 Astra / high | Plan técnico y tareas desde specs; consulta UX y devuelve al PM, sin ejecutar builders |
| [pm](agents/pm.toml) | Modelo del hilo principal | Contrato de rol leído por Factory/Build; especificación, User Ask, coordinación y despacho exclusivo de builders |

## Contexto y autoridad

- [Contexto backend](contexto-backend.md) y [contexto frontend](contexto-frontend.md): mapas técnicos fechados; contrastarlos con el código.
- [Catálogo UI/UX](../SDD/guias/ui-ux/catalogo.md) y [plantilla de ficha](../SDD/guias/ui-ux/plantilla-componente.md): uso, razones, estados, accesibilidad, código, decisiones y evidencia.
- [SDD](../SDD/README.md): autoridad funcional y de aceptación del producto.

Los archivos forman parte del cierre 3.34.0, cuyo commit y push autorizó el usuario el 2026-11-17. No están excluidos de Git y no cambian por sí mismos la interfaz de producción.

Codex descubre perfiles TOML independientes en `.codex/agents/` por su campo `name`; no hace falta un registro `[agents.<nombre>]`. Heredan permisos, proveedor y herramientas de la sesión: las instrucciones no constituyen un sandbox adicional. [Documentación oficial](https://learn.chatgpt.com/docs/agent-configuration/subagents). Modelos elegidos por el usuario: [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra) para construcción, [Sol](https://developers.openai.com/api/docs/models/gpt-6-sol) para UI/UX y [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) para liderazgo técnico. El archivo PM conserva Astra/high como referencia de configuración, pero Factory/Build aplican sus instrucciones en el hilo actual y no cambian automáticamente su modelo ni crean un subagente PM. No sustituir silenciosamente los modelos de los subagentes si una instalación carece de acceso.

## Factory y Build: PM en el hilo principal

El flujo es **usuario → Factory o Build → mismo hilo como PM → TL / UI-UX / builders**. Las skills leen [pm.toml](agents/pm.toml) y aplican su contrato de rol en la conversación principal; no crean, reanudan ni usan un PM subordinado ni otra tarea como intermediario.

| Entrada | Resultado y autorización |
| --- | --- |
| [Factory](../.agents/skills/factory/SKILL.md) | Descubre la necesidad, contrasta SDD/código, consulta viabilidad/UX y prepara o corrige la spec para revisión. No despacha builders. |
| [Build](../.agents/skills/build/SKILL.md) | Parte de una spec identificada, acepta su alcance documentado y autoriza planificar, implementar y validar, salvo un límite expreso del usuario. Revisa/actualiza plan y tareas antes del despacho; no asume respuestas de negocio pendientes. |

Ejemplos: `$factory Especifica cómo compartir una escena.` y `$build SDD 59`. Son ejemplos, no órdenes ejecutadas al leer esta guía. Crear o editar estas skills tampoco inicia trabajo de producto. Una petición de compilar con `pnpm build` no equivale a invocar Build para una spec.

El PM conserva necesidad, referencias, decisiones, revisión, alcance y autorizaciones. Contrasta SDD antes de clasificar: nueva función → nueva spec; corrección → delta fechado en la vigente sin borrar historia. Una orden explícita de construir cambia al flujo Build sin exigir repetir el OK. Aceptar una spec, invocar Build o cerrar una tarjeta no concede permisos Git ni de despliegue; se mantienen las reglas de AGENTS.md y las autorizaciones expresas de la sesión.

En una continuación, el mismo hilo sigue siendo PM. Un hilo nuevo reconstruye el contexto desde SDD y el Kanban privado, conserva IDs/preguntas/evidencia y no reactiva al PM subordinado de una sesión antigua. Una spec abierta se identifica por datos realmente disponibles; si hay ambigüedad, se pregunta antes de construir. No se crea otro hilo salvo petición explícita.

**Solo el hilo principal en rol PM crea, asigna o reanuda `backend_builder` y `frontend_builder`.** TL planifica; UI/UX asesora; los builders implementan. El PM coordina propiedad de archivos, dependencias, capacidad y rama. Cada encargo incluye tarea, revisión de spec/plan, criterios, contexto, archivos asignados, exclusiones, pruebas, autorizaciones e ID real del hilo PM. Responder una consulta a un builder ya activo no equivale a despacharlo.

### User Ask y espera de respuestas

Toda pregunta del PM al usuario se presenta con User Ask siguiendo [su protocolo](agents/pm.toml): `request_user_input_async`, o `request_user_input` únicamente donde su contrato lo permita. Las preguntas de negocio de TL/UX/builders llegan al hilo PM, que consulta directamente. No hay preguntas en texto ni instrucciones «responde 1A…» como sustituto del formulario.

Una llamada asíncrona devuelve inmediatamente: PM conserva turno/formulario abierto hasta recibir y registrar todas las respuestas. Mientras espera, trabaja solo en lo independiente o usa esperas interrumpibles de hasta 60 segundos. No emite `final`, no duplica el formulario ni toma silencio, timeout o preselección como respuesta. Las respuestas parciales dejan las otras preguntas pendientes; solo cancelación/pausa explícita permite abandonar la espera. Si la herramienta no está disponible, se comunica la limitación sin preguntas de texto ni aprobación inventada.

Los subagentes usan el identificador real de colaboración del hilo PM que los convocó, por ejemplo `/root` cuando corresponda; el nombre de perfil y el UUID de una tarea Codex no son destinos intercambiables de `collaboration.send_message`. Se conservan los perfiles/modelos de TL, UX y builders. La falta de esos perfiles se informa sin simularlos; aplicar PM en el hilo principal no requiere que se pueda crear un subagente PM.

## Kanban privado del PM

La skill local [kanban-local](../.agents/skills/kanban-local/SKILL.md) permite al PM crear tarjetas desde tareas de TL, asignar responsables, registrar aclaraciones y cerrar con evidencia. Es una skill auxiliar de Factory/Build. Solo el hilo principal en rol PM escribe el tablero; los subagentes reportan resultados.

La skill, sus templates y herramientas están ignorados por Git en `.agents/skills/kanban-local/`. El tablero, plantilla vacía adaptada al proyecto, entradas JSON y seguimiento operativo se guardan bajo `.local/kanban/`, también ignorado. Los archivos no viajarán con un clone: deben conservarse o copiarse localmente si se cambia de equipo. No usar `git add -f` para incluirlos.

```bash
python3 .agents/skills/kanban-local/scripts/kanban.py init
python3 .agents/skills/kanban-local/scripts/kanban.py serve --port 8766
```

El servidor muestra `http://127.0.0.1:8766/dashboard.html`. Solo lectura, sin acceso a archivos arbitrarios ni a la API del producto. `init` conserva tareas y descubre los perfiles actuales; las mutaciones y `sync` añaden nuevas columnas al aparecer agentes. El template generado permanece vacío.

Columnas por responsable, más «Requiere aclaración» y «Terminadas». El PM presenta las consultas con ID Q-NNNN mediante User Ask, registra las respuestas y resuelve el bloqueo tras incorporar las decisiones. Copiar una consulta del tablero sigue sirviendo para recuperar contexto/IDs, sin reemplazar el formulario. La página no ejecuta agentes ni reanuda trabajo automáticamente.

Las 10 últimas terminadas se muestran al abrir; el resto se carga a petición en bloques de 10 y permanece almacenado. El PM registra evidencia antes del cierre; terminado no implica merge. Specs/planes siguen en SDD; seguimiento operativo y respuestas de tarjetas permanecen privados.

## Planificación con Technical Lead

`technical_lead` recibe del PM una spec con contexto y genera `plan.md` + `tareas.md` en su carpeta SDD. Reutiliza las plantillas de [plan](../SDD/specs/templates/plan-template.md) y [tareas](../SDD/specs/templates/tareas-template.md). El interlocutor es el hilo principal ejerciendo PM; proporciona su ID real y los de las consultas necesarias. El TL devuelve artefactos y ambigüedades a ese hilo, sin contactar builders. En Factory puede limitarse a una consulta de viabilidad; Build encarga el plan completo o revisa uno existente.

```text
Consulta a technical_lead para planificar esta spec; no implementes.
Spec fuente: [ruta, revisión y criterios de aceptación].
Contexto: [decisiones, dependencias, base de código y restricciones].
Salida: plan.md + tareas.md en la carpeta de la spec.
Interlocutores: [ID real de PM/principal e ID disponible de ui_ux].
Revisa reutilización de núcleo, seguridad, API y clientes web.
Devuelve tareas delimitadas, dependencias, propiedad de archivos,
tandas paralelas justificadas, pruebas y decisiones pendientes para PM.
No invoques ni contactes builders; el PM decide alcance y ejecución.
```

El TL consulta a `ui_ux` para decisiones de front y acuerda el lab necesario antes de proponer producción. UI/UX conserva fichas/prototipos; el TL escribe plan/tareas, sin editar código del producto ni spec.md. Las ambigüedades de producto se devuelven al PM con opciones y recomendación, dejando pendiente solo lo dependiente. La composición concreta y los permisos de cada entorno se conservan aunque compartan dominio y casos de uso.

No confundir tareas planificadas con agentes despachados. El TL propone propietarios y paralelismo según contratos, archivos y recursos; el PM asigna capacidades y coordina la ejecución. Crear los perfiles no ejecuta ninguna spec ni despacha tareas de ejemplo.

## Consultar a UI/UX

El PM activa/reutiliza una instancia del perfil `ui_ux` y facilita su ID real a frontend, TL u otros solicitantes. Se envían mensajes a la instancia activa y se retoma su tarea cuando esté inactiva; no se inventa un ID a partir del nombre de perfil. La continuidad se apoya también en fichas SDD, por si cambia la instancia. La creación de estos archivos no inicia una conversación de agentes ni una vigilancia en segundo plano.

```text
Consulta: [ID breve, objetivo y decisión necesaria].
Solicitante: [ID real para responder].
Usuario/rol y contexto: [tarea, ubicación, clientes y espacio disponible].
Semántica: [estado/acción, efecto inmediato o diferido, carga/error].
Referencias: [spec, ficha, componentes, capturas o sitios a comparar].
Opciones/duda: [alternativas, propuesta y restricciones técnicas].
Respuesta necesaria: componente + ubicación + estados + accesibilidad
+ reutilización/código + razones + criterios verificables + pendientes.
```

Frontend consulta a `ui_ux` cualquier duda de interfaz/experiencia antes de implementar lo dependiente. Reutiliza decisiones vigentes cuando ya resuelven el caso; no exige aprobación rutinaria repetida. UI/UX propone mejoras y resuelve dentro del alcance; cambios funcionales o desacuerdos se elevan a pm, que consulta al usuario si el contexto no basta. El silencio no es acuerdo.

`ui_ux` mantiene el catálogo y prototipos documentales; frontend implementa producción y devuelve evidencia. Un único editor por ficha evita colisiones. El encendido/apagado usa el switch común (UI-001); no se confunde con selección o acción puntual. Una referencia a Tailwind u otro sistema inspira el diseño sin añadir su framework.

El laboratorio React existente se consulta como referencia. Se puede crear HTML puro local en `SDD/guias/ui-ux/prototipos/` cuando aporte valor; las fichas enlazan código y demos para no mantener una segunda librería de producción. No hay prototipos nuevos ni validación visual global en esta entrega.

## Comprobar configuración

```bash
python3 - <<'PY'
from pathlib import Path
import tomllib
esperados = {
    'backend_builder': 'gpt-5.6-terra',
    'frontend_builder': 'gpt-5.6-terra',
    'ui_ux': 'gpt-6-sol',
    'technical_lead': 'gpt-6-astra',
    'pm': 'gpt-6-astra',
}
nombres = set()
for p in sorted(Path('.codex/agents').glob('*.toml')):
    a = tomllib.loads(p.read_text())
    assert all(isinstance(a.get(k), str) and a[k].strip()
               for k in ('name', 'description', 'developer_instructions'))
    assert a['name'] == p.stem and a['name'] not in nombres
    nombres.add(a['name'])
    if a['name'] in esperados:
        assert a['model'] == esperados[a['name']]
        assert a['model_reasoning_effort'] == 'high'
    print(f"Perfil válido: {a['name']} / {a.get('model')}.")
assert esperados.keys() <= nombres
PY
```

Esta comprobación valida archivos, no ejecución remota, disponibilidad del modelo ni interfaz del producto. El conjunto no establece rondas obligatorias ni recupera la fábrica retirada.
