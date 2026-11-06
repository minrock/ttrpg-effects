# Recuperación de sesión y consumo de memoria — 3.21.1

Fecha: 2026-11-05. Base integrada: `32bda9f`, 3.21.0. Corrección en `fix/recuperacion-sesion-memoria`, pendiente de commit e integración. No se inició un ciclo factory.

## Incidente y diagnóstico

El usuario informó que dejó caducar la sesión en Chrome, volvió a autenticarse, recibió un conflicto entre el borrador retenido y las revisiones del servidor, eligió descartar/recargar y Chrome agotó memoria.

Se encontraron tres problemas en el código:

1. `LiveEditor` iniciaba un intervalo de 250 ms para cualquier error de revalidación, incluidos conflictos 409 no reintentables. El intervalo no terminaba al vencer Retry-After. Esto provocaba renders periódicos del editor retenido sin acción útil.
2. Ocultar el editor no desmontaba `MapViewport`: Pixi, sus animaciones y recursos gráficos seguían vivos durante la caducidad y el conflicto. Descartar invocaba `location.reload()` con el editor y su protección `beforeunload` todavía montados.
3. El efecto de imágenes de tokens actualizaba el diccionario con un objeto nuevo aunque todas las resoluciones devolvieran `null`. Ese objeto reiniciaba el mismo efecto: petición → estado vacío nuevo → render → petición. Una regresión acotada reprodujo seis peticiones inmediatas de una imagen ausente antes del límite de seguridad del test; la expectativa era una. Además, un rechazo abortaba todo el lote sin manejar el error.

El bucle de imágenes y los renders periódicos se reproducen en pruebas. La conservación del motor gráfico se verificó por inspección del ciclo de vida. **No se capturó un perfil de heap/GPU ni se reprodujo el colapso de Chrome con la partida del usuario**: no se atribuye el agotamiento exacto a una sola causa ni se cuantifica memoria ahorrada.

## Cambios

- El reloj solo funciona mientras existe una espera reintentable vigente y se detiene al cumplirla; conflictos sin reintento permanecen quietos.
- Caducidad, revalidación o estado terminal suspenden el lienzo: se destruye Pixi y sus recursos mediante su limpieza existente. Se mantienen documento y cámara; al recuperar acceso se reconstruye una instancia. Una inicialización tardía de una instancia cancelada se destruye y no reemplaza la cámara vigente.
- Descartar desmonta `LiveEditor`, limpia clientes/suscripciones y vuelve a leer partida, configuración y apertura. Permite continuar o iniciar según lo que devuelva el servicio. No sobrescribe la escena guardada ni recarga el documento web completo.
- La carga de tokens se extrae a `useTokenImageResolution`: no publica cambios vacíos, recuerda fallos dentro del contexto, no reintenta al mover un token y permite reintentar al recuperar acceso/cambiar referencia o abrir de nuevo una escena. Aísla fallos parciales y descarta resultados tardíos.
- Revalidaciones canceladas dejan de avanzar hacia el heartbeat. Se conserva la comprobación de cuenta y revisión; no se omiten conflictos para permitir entrada.

## Validación

- Regresión de imagen ausente: fallaba antes (6 llamadas) y pasa con resolución acotada. Incluye volver a abrir el mismo archivo y recuperar una imagen reparada.
- Hook: imagen válida junto con ausencia/error, diez movimientos sin solicitudes nuevas, reemplazo del mismo ID, suspensión/reactivación y respuesta tardía.
- Viewport con motor instrumentado: no construye durante suspensión, destruye al suspender, restaura cámara al recuperar y destruye inicialización tardía.
- GameEditor: tres ciclos de suspensión → 409 → 60 segundos sin renders/peticiones nuevos → descarte → lectura vigente → editor nuevo. Se conserva borrador hasta la acción explícita y se libera después.
- Regresiones existentes de identidad, diálogos, Retry-After, aperturas y herramientas del editor.

Verificación final sobre el código corregido:

- `pnpm test --exclude '.local/**' --exclude 'tmp/**' --maxWorkers=2`: **149 archivos / 1323 pruebas aprobadas** (35,02 s).
- `pnpm typecheck` y `pnpm lint`: sin errores.
- `pnpm build:web`, `pnpm build:api` y `pnpm build`: correctos. Frontend compilado en `out/web` y Electron en `out/renderer`; no se generó DMG ni se reinició la API.
- `git diff --check` y enlaces locales de la documentación: correctos.
- Logs locales: `/tmp/session-memory-final-tests.log`, `/tmp/session-memory-final-web.log`, `/tmp/session-memory-final-api.log`, `/tmp/session-memory-final-electron.log`, `/tmp/session-memory-final-lint.log`.

Se conservan avisos de canvas no implementado en jsdom y chunks grandes/directivas de dependencias en compilación. No hubo fallos en la verificación final. Una fixture de reapertura necesitó completar su campo `warnings`; se corrigió la fixture y se repitió la suite completa.

 Las pruebas de ciclo de vida usan un doble de Pixi; no equivalen a medir recursos del proceso Chrome. No se ejecutaron contratos PostgreSQL/TLS ni se modificaron persistencia, `.env`, usuarios o datos operativos.

## Reproducción manual pendiente

En una partida de pruebas, abrir una escena con tokens, dejar caducar identidad y recuperar la misma cuenta. Provocar un conflicto de revisión desde otra sesión de pruebas. Comprobar que el diálogo queda estable, el canvas no permanece montado durante el conflicto y descartar permite continuar con contexto nuevo. Repetir y comparar memoria JS/GPU antes y después de la recolección, sin exigir que el proceso libere inmediatamente toda la memoria reservada. Verificar también la recuperación sin conflicto: mismo borrador, cámara y controles.
