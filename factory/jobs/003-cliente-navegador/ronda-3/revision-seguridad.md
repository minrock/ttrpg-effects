VEREDICTO: APROBADO

# Revisión de seguridad — 003, ciclo 2, ronda global 3

Se revisaron `retrabajo-ciclo-2.md`, el apartado actualizado de build.md, ronda-3/revision.md, las huellas y la implementación real de los cambios entre rondas 2 y 3. El alcance es la integridad de las transiciones de enlaces, el apilamiento del modal y sus regresiones de seguridad. No se reabren áreas ajenas ni se usan informes de otros revisores de esta ronda como evidencia.

Las 509 huellas coinciden con los archivos actuales. El diferencial entre rondas comprende diez archivos: cinco de implementación, dos de pruebas y tres de documentación/changelog. Los componentes de sesión y portales aprobados en ronda 2 conservan su contenido.

## Resultado y evidencia

**Transiciones entre enlaces internos y remotos.** App rechaza ambos cambios de modalidad antes de iniciar el guardado o cambiar el estado, con un error recuperable que exige Desligar. El dominio comprueba también origen y destino antes de conectar mapas internos (`src/domain/annotations/internal-scene-links.ts:58`). El servicio comprueba que ninguno de los extremos mantenga un enlace interno antes de construir actualizaciones (`src/server/scene-links.ts:30`). El rechazo no depende exclusivamente de los controles visuales.

**Conservación ante fallo.** La conexión y desconexión internas solo ejecutan `setScene(nextScene)` después de un guardado exitoso. El modal comunica el fallo y conserva el enlace previo para reintentar. Los enlaces remotos mantienen la transacción SQLite existente. La prueba HTTP real fuerza el fallo del segundo guardado al desligar y verifica que ambos documentos permanezcan íntegros; después de una desconexión exitosa, las transiciones en ambos sentidos funcionan y los extremos antiguos quedan libres.

**Privacidad del modal.** `.scene-link-backdrop` cambia a posición fija con z-index 40 frente a la cabecera 30 (`src/renderer/src/styles.css:4291`), pero sigue siendo descendiente de App y de `.service-workspace`. No usa un portal nuevo ni sale al body. El contenedor hidden/inert sigue ocultando e inhabilitando el subárbol completo durante expiración, independientemente del posicionamiento fijo. `PortalTargetProvider`, los destinos de portales y la señal compartida de sesión no fueron modificados. Las regresiones de privacidad, recuperación de borradores, preview y selectores tardíos vuelven a pasar.

**Autorización y entradas.** El endpoint de conexión sigue detrás de `auth.require` y de la comprobación de rol DM, con validación de payload y referencias opacas. No se añaden endpoints, rutas arbitrarias, acceso a archivos ni privilegios Electron. Los mensajes nuevos son texto presentado por React. La corrección no relaja CSP, Host/Origin, esquemas, consultas parametrizadas ni validación de imágenes.

No se encontraron hallazgos de seguridad bloqueantes en este diferencial. Los hallazgos P1/P2 de seguridad de ronda 1 permanecen cerrados.

## Verificaciones propias

- `pnpm exec vitest run src/infrastructure/browser/browser-client.test.ts src/renderer/src/App.workspace.test.tsx src/web/ServiceApp.test.tsx src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx src/domain/annotations/internal-scene-links.test.ts`: **5 archivos, 60 pruebas aprobadas**.
- Se inspeccionaron las nuevas pruebas de rechazo previo a toda escritura, conservación tras fallo, reintento, liberación de ambos extremos, bloqueo del origen/destino interno desde HTTP y rollback real mediante trigger SQLite.
- Comparación SHA-256 de las **509 huellas** de ronda 3: **sin diferencias**.
- Advertencia conocida de jsdom sobre canvas sin implementación; ningún fallo de prueba.

## Límites

No realicé acciones UI ni una inspección visual propia a 1024/1440; esa aceptación corresponde a las revisiones UI/UX y al humo CUA documentado por el constructor. La comprobación propia del apilamiento se limita al código/CSS y a que no atraviese la frontera de sesión. No repetí builds ni la suite completa, ya documentados en build.md; ejecuté las regresiones pertinentes al alcance.

Las pruebas usan datos temporales. No se modificaron código, Git, tablero, informes ajenos ni biblioteca personal. Este informe se publica mediante archivo temporal y renombrado. La aprobación técnica de seguridad no autoriza merge, despliegue ni operaciones Git.
