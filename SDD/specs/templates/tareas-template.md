# Tareas técnicas — NN Nombre

**Spec fuente:** `spec.md`. **Plan:** `plan.md`. **Estado:** Propuesta de planificación; no despachada.
**Base inspeccionada:** rama/SHA, fecha y cambios locales relevantes. **Revisión de spec:** fecha/hash o referencia verificable.
**Decisiones de producto pendientes:** IDs y enlaces al plan; resolverlas corresponde al PM.

## Mapa de tareas

| ID | Resultado concreto | Criterios fuente | Perfil propuesto | Predecesoras / condiciones | Estado de definición |
| --- | --- | --- | --- | --- | --- |
| T-01 | Por definir | CA-01 | Perfil adecuado | Ninguna o condición concreta | Lista para proponer / pendiente de decisión |

Los perfiles son recomendaciones al PM, no asignaciones ni agentes ya ejecutándose. Conservar los IDs de criterios que use la spec, aunque sean numerados en vez de CA-NN. Todas las dependencias deben existir y formar un grafo sin ciclos.

## T-01 — Título verificable

- **Objetivo:** resultado observable y razón técnica.
- **Criterios de la spec:** IDs exactos y cobertura parcial/completa.
- **Perfil responsable propuesto:** backend_builder / frontend_builder / ui_ux / responsable que debe definir PM.
- **Contexto mínimo:** comportamiento actual/esperado, decisiones aceptadas y enlaces a spec/plan/fichas. El encargo debe poder entenderse sin toda la conversación.
- **Entradas:** contratos, fixtures, prototipo o decisiones disponibles. Distinguir hechos de propuestas.
- **Lectura:** rutas/símbolos existentes relevantes.
- **Escritura y propiedad:** archivos/módulos concretos; señalar archivos nuevos y propietario único propuesto para contratos compartidos.
- **Pasos técnicos:** cambios delimitados, reutilización, interfaces y compatibilidad. No duplicar reglas entre adaptadores.
- **Exclusiones:** responsabilidades que corresponden a otra tarea y ampliaciones fuera de alcance.
- **Dependencias de inicio:** IDs/decisiones que deben estar resueltos antes de empezar.
- **Barrera de integración:** qué otros resultados se necesitan para comprobar el recorrido completo, si difiere de lo anterior.
- **Seguridad/asincronía:** permisos, validación, carreras, cancelación, recursos y casos negativos pertinentes.
- **Clientes/roles afectados:** navegador, Electron servicio/local, DM/jugador/admin; justificar no aplicabilidad.
- **Entregables:** archivos, contratos, documentación y evidencia esperados.
- **Validación:** comandos reales o pasos observables; entorno aislado y requisitos. No insertar resultados de pruebas todavía no ejecutadas.
- **Condición de cierre:** criterios verificables por el receptor; dependencias pendientes impiden declarar integración completa.
- **Riesgos/incertidumbre:** decisión necesaria, impacto y propuesta al PM.

Repetir una ficha por tarea. No generar tareas ficticias solo para rellenar cada capa o perfil.

## Propiedad y conflictos

| Archivo / contrato / recurso compartido | Tarea propietaria propuesta | Consumidores | Condición de estabilidad / secuencia |
| --- | --- | --- | --- |
| Ruta o puerto real | T-ID | T-IDs | Acuerdo previo / implementación disponible / serialización |

Considerar también salidas de build, puertos, DB y fixtures; directorios distintos no garantizan independencia.

## Tandas paralelas propuestas

| Tanda | Tareas | Condiciones previas | Por qué son independientes | Recursos aislados / conflictos | Barrera de salida |
| --- | --- | --- | --- | --- | --- |
| P-01 | T-IDs | Contratos/decisiones/tareas concretas | Escrituras y dependencias compatibles | Entornos separados o secuencia | Evidencia necesaria para siguiente tanda |

Indicar camino crítico y orden de integración. El PM ajusta capacidad y despacha. No proponer paralelismo cuando la tarea necesita un contrato o un archivo que otra está cambiando sin un acuerdo de estabilidad.

## Cobertura y devolución al PM

| Criterio de spec | Tareas | Comprobación integrada / entorno | Evidencia esperada |
| --- | --- | --- | --- |
| CA-01 | T-IDs | Recorrido concreto | Resultado a registrar en validacion.md |

- Tareas suficientemente definidas para asignar:
- Tareas pendientes y decisión que las desbloquea:
- Acuerdos UI/UX y prototipos necesarios:
- Riesgos y alternativas que debe resolver el PM:
- Validación documental ejecutada (rutas, enlaces, IDs, ciclos, cobertura y conflictos):
- Pruebas del producto propuestas, no ejecutadas durante la planificación:

Planificación completa no significa implementación autorizada ni tareas ejecutadas. La ejecución y el cierre pertenecen al flujo del PM y a las autorizaciones vigentes.
