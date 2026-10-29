# Plan 39 - Integracion de interfaz VTT

## Estado y restricciones

2026-10-28. Implementacion y extension Player aceptadas. El usuario autoriza cierre, commit, integracion de `feature/vtt-interface-lab` en `main` y generacion del DMG. Version objetivo 3.0.0 por solicitud expresa de siguiente version mayor, en lugar del minor previsto inicialmente; no cambia el formato ni la compatibilidad de escenas. No se solicita push.

Las restricciones sin commit/release y los resultados intermedios de las secciones siguientes documentan las fases anteriores a esta autorizacion. El cierre se registra al final de este plan.

## Fronteras

- `App.tsx` sigue siendo propietario del estado y de las acciones reales. No importar `InterfaceLab`, fixtures, `LabCanvas` ni `LabDice` desde produccion.
- Nuevos componentes presentacionales de cabecera/rail reciben callbacks tipados; no acceden a preload ni persistencia.
- `DmAsidePanel`, `SceneMapsSection`, `RightSidebarTabs`, `DicePanel`, overlays, formularios y menus existentes se conservan. Pestañas ocultas conservan estado.
- Una hoja de estilos de interfaz, acotada por `.vtt-interface`, redefine la composicion DM. La extension Player usa `.player-workspace-root` y estilos propios sin afectar al DM.
- `MapViewport` permanece montado. La extension Player amplia de forma opcional su contrato de interaccion con una allowlist de figuras locales; reutiliza las formulas de coordenadas y motores existentes.
- No cambios a domain, application, infrastructure, main, preload, SQLite o esquemas.

## Secuencia

1. Escribir spec y plan, vinculando la propuesta 38 y las reglas de brujula 30.
2. Corregir `CompassOverlay`: geometria norte arriba, aguja norte diferenciada, N legible, Player fijado a cero. Compartirlo con el lab y probar todos los cardinales.
3. Integrar cabecera compacta y acciones reales de escena. Trasladar controles de camara sin alterar su estado/callbacks. Mantener errores y avisos visibles.
4. Incorporar rail y opciones contextuales. Delegar creacion a callbacks existentes con posicion explicita cuando corresponda; cancelar borradores al cambiar herramienta. Preservar menu contextual.
5. Afinar explorador e inspector con tabs accesibles, listas compactas y estilos del lab. Conservar todas las secciones de la matriz de spec38.
6. Implementar drawers responsive, cierre/reapertura y navegacion por teclado. No remount de canvas ni controlador de dados al cambiar paneles.
7. Tests de brujula, cabecera, rail, paridad de callbacks, pestañas, responsive y ciclo de vida. Ejecutar suite completa, typecheck, lint y build.
8. Inspeccion visual de lab y aplicacion en escritorio y movil. Documentar resultados reales y limites de validacion; entregar sin commit/push/merge/DMG.

## Riesgos y mitigaciones

- Reemplazar App por la demo perderia servicios: solo adaptar shell y callbacks.
- Nuevos paneles pueden recrear Pixi/dados: conservar el mismo arbol y ocultar con `hidden`.
- Resize puede alterar camara: aprovechar ResizeObserver existente, no ejecutar fit por apertura de paneles.
- Doble herramienta activa: salida comun limpia pan, borradores y modos incompatibles antes de activar otro acceso.
- Brujula con base diagonal: geometria construida verticalmente y tests 0/90/180/270; Player ignora rotacion visual recibida.
- CSS global puede alterar Player: todos los estilos nuevos acotados, salvo estilos propios de la brujula compartida.

## Verificacion prevista

- Unit/UI: coordenada de creacion por rail y contextual; callbacks de guardado/carga/jugador; zoom DM separado de jugador; Escape; controles de fuego/relampago originales; paneles sin remount; norte por rol.
- Smoke visual: 1440x900, 1280x720 y 390x844; explorador/inspector, menu escena, opciones de herramientas, dados, orientacion y ausencia de overflow.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- No confundir pruebas de browser sin preload con validacion de IPC nativo. Registrar expresamente que flujos Electron fueron ejecutados o quedaron sin verificar.

## Resultados de la integracion DM inicial

Implementado en renderer, sin modificaciones de dominio, motores Pixi/Three, transporte, persistencia, dependencias ni esquema.

- `WorkspaceHeader`: menu real de escena, batalla, contadores, dados, apertura de Player View y controles de panel.
- `WorkspaceTools`: rail, opciones por familia y delegacion a las herramientas existentes. Creacion inmediata usa centro de camara DM; el contextual sigue usando su posicion original.
- `MapViewportHandle.setCameraSnapshot` delega a la API existente de Pixi. Zoom DM conserva centro y no modifica camara de jugador. El porcentaje solo actualiza estado cuando cambia el zoom.
- `workspace.css`: shell acotado, inspector compacto, controles de camara y drawers. La version visible se lee de package.json, no del placeholder de preload ni del formato de escena.
- Dados: swatches en columnas auto-fit y fieldsets con `minmax(0, 1fr)` para que el inspector estrecho no recorte controles. Lanzar permanece accesible con sticky y fondo opaco incluso deshabilitado.
- Explorador: tabs con foco itinerante y aria-controls/labelledby; secciones y pestañas ocultas permanecen montadas. Acciones de mapas conservan seleccion, renombrado, DnD, reemplazo y borrado.
- Brujula compartida: geometria vertical, N con contrarrotacion de texto, extremo norte menta mas largo, sur atenuado; DM 80px, Player 84px. Player fuerza orientacion visual cero.

### Verificacion ejecutada

- `pnpm test`: 104 archivos, 948 tests aprobados. Incluye 8 tests de App real con solo MapViewport simulado, 7 de chrome, 13 de brujula y cobertura de explorador/mapas/laboratorio.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`: aprobados. Build mantiene avisos de directivas `use client` ignoradas en dependencias. jsdom avisa que no implementa canvas.getContext; el renderer real se verifico aparte.
- Browser: viewport 390x844 sin overflow horizontal (scrollWidth=390), un drawer a la vez y camaras accesibles debajo; creacion real de cono, circulo y linea de fuego con propiedades/seleccion. La barra de fuego queda en una fila sin tapar el control de contadores. Captura Playwright 1280x720 con ambos paneles y efecto visible; inspeccion inicial 1388x939.
- Electron existente: carga nativa de `assets/lab/cloister-map.png` en una escena nueva sin guardar; zoom DM por botones; DM norte90 y apertura real de Player View. Se verifico mapa rotado y brujula del jugador norte0; el toggle sigue funcionando. Player cerrado despues de probar, su visibilidad restaurada, norte DM vuelto a0. No se abrieron ni sobrescribieron escenas guardadas del usuario.
- Laboratorio: norte90 coloca aguja/N a la derecha del mapa sin rotar DM. Componente compartido con la aplicacion. No se copiaron servicios locales del lab al producto.
- Inspector de dados a 1440x900: sin scroll horizontal interno (clientWidth y scrollWidth de 270px), controles y colores completos. Recarga final de la interfaz integrada sin errores de consola del navegador.

No se ejecutaron todas las operaciones nativas de guardado/importacion/bibliotecas durante el smoke. Sus callbacks originales permanecen conectados y la suite existente pasa. No se generaron DMG, commits, push ni merge; version mantenida en 2.8.1 hasta cierre de esta iteracion.

## Extension Player: secuencia tecnica

1. Actualizar spec/plan antes del codigo. Mantener la rama de interfaz abierta, sin release ni operaciones de historial.
2. Crear `usePlayerTools`: estado efimero separado de SceneDocument, ids locales unicos, seleccion, borrador de linea/path y acciones con helpers puros de shapes existentes. Reinicio por identidad de viewport; no reiniciar por snapshot ordinario o reemplazo de imagen.
3. Combinar shapes publicas y locales solo para render. Dar a `MapViewport` una lista opcional `localEditableShapeIds`; mantener `isReadOnly=true`, fog bloqueante y politica de tokens ocultos.
4. En Pixi, permitir picking/handles unicamente de shapes autorizadas y path local. Ningun objeto DM se vuelve seleccionable ni arrastrable. Conservar valores default de DM y Player sin herramientas. Pruebas especificas contra permisos accidentales y drags ajenos.
5. Reusar preview de path con callback imperativo para hover, conversion mundo/pantalla con norte, render de formas y calculos de medidas. Linea finaliza al segundo punto; path con confirmar/Enter y deshacer ultimo punto. Figuras se crean al centro de camara efectiva, no la ultima camara remota.
6. `PlayerTools` presentacional recibe callbacks y propiedades; rail/controles compactos, accesos de teclado, propiedades numericas y limpieza local. Integrar opcion ocultar herramientas y dock local con lock/compass; preservar dados, informacion publica, turnos y contadores.
7. Pruebas UI de creacion/edicion/borrado, bloqueo de objetos remotos, snapshots/cambio de mapa, Escape/Enter/inputs; pruebas de renderer con readOnly. Typecheck, lint, suite y build. Smoke real desktop/estrecho con norte rotado, pan y zoom, verificando que DM no cambia.

### Detalles de integracion Player

- Los callbacks de `usePlayerTools` son estables y leen grilla/settings actuales mediante refs: el efecto de creacion de MapViewport depende de esas referencias. Recrearlas por seleccion/dibujo causaria destruccion y recarga del canvas. Arrays vacios de capas privadas tambien son estables.
- Aplicar shapes y allowlist antes de seleccion, para que un id local recien creado no sea rechazado por la lista del render anterior.
- Las interacciones Player utilizan conversion inversa con rotacion de presentacion, ademas de la conversion mundo-a-pantalla equivalente para hit tests de manivelas. No alcanza con rotar la capa visual: los clicks y drags deben usar la misma transformacion.
- `player-lab.html` monta PlayerApp real con el fixture generado del lab38 y un adaptador en memoria sin filesystem ni IPC. `?north=90/180/270` permite reproducir el norte. Entrada solo dev, no importada por produccion ni agregada al empaquetado.
- Las etiquetas de medida reciben contrarrotacion respecto de la presentacion Player. Solo se actualizan por cambios de zoom/orientacion o al reconstruir las formas, sin cambiar la geometria ni forzar redraw extra por cada frame.

### Verificacion de la extension Player

- Suite final: 107 archivos, 991 tests aprobados. Incluye 31 regresiones Pixi de herramientas locales/rotacion/etiquetas, 11 de PlayerApp y 1 de orden de aplicacion de la allowlist en MapViewport.
- Typecheck, lint, build y `git diff --check` correctos. Se mantienen los avisos previos de canvas ausente en jsdom y directivas `use client` ignoradas en dependencias durante build.
- Electron real: apertura desde DM, creacion de cono con propiedades y linea de dos puntos sobre el mapa; el canvas se mantiene visible con oscuridad activa. No se cargaron ni sobrescribieron escenas guardadas. Player queda abierto para revision.
- Browser con PlayerApp real y fixture: 390x844 sin overflow de pagina (scrollWidth=390), opciones y dock accesibles; 1440x900 con norte90, dibujo de linea y camino, arrastre de circulo alineado con el puntero y zoom local. Distancias quedan derechas tras la rotacion. Sin errores de consola en la verificacion final.
- Aislamiento automatizado: cambios locales no invocan guardar/publicar escena, callbacks no aceptan ids de formas DM, snapshots ordinarios conservan formas locales, nueva identidad de viewport las limpia, Delete dentro de inputs no borra y callbacks de tools conservan referencias aun al actualizar grilla.
- La verificacion no es un benchmark de carga masiva; no se afirma un numero de FPS. El renderer, calculos y scheduler existentes se reutilizan y el hover no actualiza estado React.

Extension implementada y aceptada por el usuario para el cierre 3.0.0.

## Cierre 3.0.0

- Actualizar version unica en package.json, changelog, README y referencias de specs 15, 30, 38 y 39.
- Repetir lint, suite y typecheck; revisar diff y registrar el trabajo aceptado en un commit de la rama.
- Integrar en main conservando el historial de dados 2.8.x que forma parte de la base de esta rama.
- Ejecutar `./scripts/build-dmg.sh` desde main; comprobar version empaquetada e integridad del DMG y registrar resultados efectivos.
- Conservar el laboratorio como entrada de desarrollo. Sin nueva publicacion remota, tag ni cambios incompatibles de persistencia.
