VEREDICTO: APROBADO

## Alcance

Revisión independiente de 003, ciclo 2/ronda global 3, conforme al perfil codigo.toml. Se conserva el contexto de AGENTS.md, solicitud, spec y revisiones propias; se leyeron retrabajo-ciclo-2.md, build.md actualizado y ronda-3/revision.md/huellas.json. Se inspeccionaron los diez archivos modificados desde ronda 2, incluidos implementación, pruebas, CSS, documentación y changelog. No se consultaron informes de otros revisores.

Las 509 huellas coinciden con el árbol revisado al inicio y al cierre. No se detectaron hallazgos de código pendientes dentro del alcance examinado.

## Verificación de C-003-04

**Corregido.** La solución elige la alternativa permitida en el hallazgo: exigir Desligar antes de cambiar de modalidad, sin intentar una transición automática parcial.

- `src/renderer/src/App.tsx`, handleConnectSceneLink y handleConnectRemoteSceneLink: rechazan remoto→interno e interno→remoto antes de persistir o aplicar el nuevo estado. El modal captura el error y explica cómo continuar.
- `src/domain/annotations/internal-scene-links.ts`: también rechaza conectar mapas internos si origen o destino conserva un enlace remoto. Esta protección evita que otro consumidor del caso de dominio reproduzca la sobrescritura.
- `src/server/scene-links.ts`, connect: rechaza conexiones entre escenas cuando cualquiera de los extremos conserva un enlace interno. La reconexión entre destinos remotos permanece disponible y conserva la corrección de acumulación por escena de C-003-02.
- La conexión y desconexión internas aplican setScene únicamente después de confirmar el guardado. Un fallo de Desligar conserva el enlace en memoria, muestra un error recuperable y permite reintentar. La desconexión remota continúa protegida por la transacción SQLite.

La reproducción independiente de la ronda anterior se adaptó a la política explícita autorizada: crear A:a→B:b, intentar conectar A:a→A:c y comprobar rechazo más igualdad íntegra de A/B; desligar, conectar internamente, guardar/releer y comprobar B:b libre; intentar volver a remoto mientras permanece el interno y comprobar rechazo sin alterar A. PASS con dominio y SQLite reales.

Las pruebas nuevas de App/modal recorren ambas direcciones, verifican ausencia de llamadas de escritura ante rechazo, inyectan fallos de desligar, comprueban que sigue bloqueado el cambio y reintentan con éxito. Para enlaces internos inspeccionan ambos marcadores en el documento enviado a persistencia. La integración HTTP real inyecta fallo del segundo guardado de la desconexión mediante trigger SQLite y relee ambas escenas sin modificaciones; tras reintentar comprueba extremos libres y navegación. No se limita a afirmar mensajes de éxito.

## Regresiones y compatibilidad

Los casos C-003-01/02/03 permanecen resueltos: selector remoto conectado a App, reconexión recíproca y cancelación de selectores/lecturas ante 401. Las pruebas dirigidas incluyen sesión y portales privados, reemplazo de imágenes y enlaces internos existentes.

El cambio de apilamiento en styles.css mantiene el diálogo dentro del árbol protegido por hidden/inert; no cambia la composición de sesión ni traslada portales. La valoración visual específica queda al revisor UI; esta revisión verificó su alcance técnico.

Se mantiene versión 3.4.0, formato de escena 2 y TypeScript estricto, sin dependencias nuevas. Guía y changelog describen la exigencia de Desligar y el comportamiento ante fallo. No se observan cambios incompatibles de serialización, coordenadas o mediciones en este retrabajo.

## Verificaciones ejecutadas

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm exec vitest run src/infrastructure/browser/browser-client.test.ts src/renderer/src/App.workspace.test.tsx src/domain/annotations/internal-scene-links.test.ts src/web/ServiceApp.test.tsx src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx`: PASS, 5 archivos/60 pruebas, 3.35 s. Advertencia conocida de canvas no implementado en jsdom.
- Reproducciones independientes temporales: PASS, 3 pruebas/337 ms; reconexión remota, selector anterior al 401 y transición de modalidad con rechazo previo/Desligar/persistencia.
- SHA-256 de ronda-3/huellas.json: 509 archivos, ninguna diferencia.

Reproductor externo al repositorio: `/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-003-code-review-ppt9nwxc/round3.test.ts`; configuración `vitest-r3.config.mts` vecina. Comando:

```sh
pnpm exec vitest run --root /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-003-code-review-ppt9nwxc --config /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-003-code-review-ppt9nwxc/vitest-r3.config.mts
```

Las bases temporales se cerraron y eliminaron en finally. No se abrió la biblioteca personal.

## Limitaciones

No repetí builds, suite completa ni humo CUA de build.md; esos resultados conservan su atribución al constructor. No se tomó el turno UI ni se controló interfaz mediante scripts. La aprobación se sustenta en inspección del código y pruebas automatizadas de los recorridos/persistencia descritos; no equivale a autorización de Git, merge o distribución. Solo se publica este informe mediante temporal y renombrado, sin modificar implementación, tablero ni revisiones anteriores.
