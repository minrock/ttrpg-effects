VEREDICTO: APROBADO

# Revisión de código — 005, ciclo 1, ronda 1

Fecha: 2026-10-29. Revisión independiente conforme a `.codex/agents/codigo.toml`. Código congelado en la rama autorizada `feature/fabrica-software`, sobre la base `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. No se modificó implementación, Git, tablero ni informes ajenos.

## Alcance y método

Leídos AGENTS.md, package.json, solicitud, spec, build, identidad/diff de ronda y huellas. Se contrastaron los **17 archivos** cambiados desde `base-archivos.json`: configuración/build/versionado/documentación; `index`, `local-app`, `service-app`, `electron-config`, `window-policy`, incorporación de la política a Player; sus tres archivos de pruebas y validación/pruebas de estáticos. También se consultaron la composición API, configuración y builds web/API, tsconfig, artefactos actuales y decisión/evidencia final de 004 para el alcance heredado.

Las **529 huellas SHA-256 coinciden** con los archivos actuales, comprobadas al iniciar la inspección y antes de publicar. El conjunto cambiado desde la base de esta spec coincide con el declarado en revision.md; los cambios acumulados anteriores no se atribuyen a 005.

## Hallazgos

No se identificaron defectos demostrables que requieran cambios para aceptar el alcance revisado. No hay reproducción de fallo ni corrección obligatoria pendiente.

## Contraste del contrato con el código

- **Composición:** `src/main/index.ts` selecciona configuración antes de evaluar la composición local; solo esa rama registra `map-asset` y llama `startLocal`. La rama servicio no importa repositorios, no registra IPC local y carga el mismo frontend web mediante URL. El test de entrada verifica también ausencia de evaluación del módulo local y fallo sin fallback ante configuración inválida.
- **Conservación local:** se comparó `local-app.ts` con el anterior main completo. Conserva repositorios, menú/recientes, handlers IPC, precarga Player y limpieza de dados. Las diferencias funcionales corresponden a política de navegación y selección correcta de icono al ejecutar artefacto no empaquetado. La protección se instala en ambas ventanas antes de cargar contenido. No cambia dominio, coordenadas, mediciones ni formato de escena.
- **Aislamiento y recuperación:** ventana de servicio sin preload, sandbox y aislamiento activos, Node/subframes/workers/webviews deshabilitados; partición efímera única. La política compara origen completo, restringe frames/redirecciones/peticiones iniciales y deniega popups/permisos. El registro por WebContents se elimina al destruirse. La recuperación propia no ejecuta scripts, reintenta el origen configurado y limita Salir a su documento exacto; la pérdida SSE posterior no provoca una recarga desde main.
- **Compilados y rutas:** inspeccionados `out/main/index.js`, chunks local/servicio/política, salidas preload/renderer/web/API y configuración Rollup. Los chunks main están junto al entry, por lo que `../preload/index.cjs` y `../renderer/index.html` resuelven correctamente también para Player. API no importa Electron en runtime. Las salidas coexisten y el empaquetado enumera solo main/preload/renderer; la inspección de nombres de artefactos no encontró SQLite, DB ni archivos .env. No se ejecutó empaquetado.
- **Estáticos y operación:** `createStaticHandler` verifica index físico y legible antes de crear ServiceStore; pruebas cubren falta de index y symlink. La guía enlazada documenta comandos existentes, Node 24, dependencias de producción/nativas, rutas absolutas, claves separadas, cookie/sesión efímera, HTTPS/Host/Origin/SSE, límites del proxy, reinicio y respaldo integral detenido. No promete empaquetar imágenes en JSON ni conservar publicación/dados/sesiones al reiniciar.
- **Compatibilidad y versión:** los esquemas de escena y reglas de mapas/enlaces no cambiaron en 005. Se conserva v2 con migración v1 y límites de referencias opacas documentados. package.json contiene 3.6.0 y CHANGELOG registra el único bump minor de esta spec, fechado y de tipo feature. No se añadieron dependencias respecto de su base.

## Verificaciones propias y evidencia reutilizada

Ejecución propia:

```sh
pnpm exec vitest run src/main/electron-config.test.ts src/main/electron-entry.test.ts src/main/service-app.test.ts src/server/static-files.test.ts
```

Resultado: **4 archivos / 35 pruebas PASS**, código 0. Se ejercitan matriz URL/modos, composición, flags, partición, política de peticiones/permisos, recuperación/reintento/salida y validación del build web. No se confunden estos mocks de Electron con evidencia de ventanas reales.

Se leyeron los logs finales existentes del constructor: `/tmp/005-tests-final.log` acredita **125 archivos / 1171 pruebas PASS**; `/tmp/005-typecheck-final.log` y `/tmp/005-lint-final.log` registran los checks sin errores. Los tres logs `/tmp/005-build-{electron,api,web}-final.log` muestran compilación terminada y salidas concordantes con los artefactos inspeccionados. Se reutiliza esa ejecución final sobre fuentes que permanecen congeladas; no se presenta como una nueva suite o recompilación de este revisor.

El humo real se atribuye al constructor en build.md: Electron compilado local, servicio DM hacia jugador web y roles invertidos, archivos import/export, ausencia de bridge/Node, navegación/redirección/popup/permisos, caída y reintento, rechazo TLS y conservación de cambios tras interrupción API. La privacidad y funciones de mesa/dados de módulos sin cambios se reutilizan de la entrega aprobada 004 y su suite, conforme a solicitud.

Se leyó además `/tmp/ttrpg-005-operacion.md`, evidencia del orquestador sobre procesos Node compilados reales: frontend/API sin dev server, rutas desconocidas sin fallback HTML, reinicio con persistencia y sesión/mesa invalidadas, respaldo detenido y restauración de las tres bases con hashes coincidentes y recuperación de escena, PNG y bibliotecas. No se atribuye esta ejecución al revisor.

## Limitaciones

No se repitió CUA, una suite completa ni builds; las comprobaciones propias complementan la evidencia final identificada y conservan su atribución. No se ensayó proxy HTTPS remoto con certificado público, proyector físico, lector de pantalla ni todas las combinaciones manuales del VTT. El rechazo TLS sí está acreditado por el humo del constructor. Los límites previos de crítico natural, dibujo manual y dados ocultos nativos siguen explícitos; no se convierten en pruebas realizadas. Las reglas y suites heredadas no cambiaron, y el humo nuevo cubre las fronteras de esta spec.

Persisten avisos conocidos de canvas/jsdom, tamaño de chunks/directivas de dependencias y CSP local; no se declara consola completamente vacía ni una auditoría de distribución firmada. No se detecta un incumplimiento de código que requiera ampliar el producto o repetir comprobaciones ya respaldadas.

Esta aprobación es técnica del área de código; no autoriza staging, commit, push, merge, despliegue ni DMG. Informe publicado mediante temporal y renombrado; única escritura de esta revisión.
