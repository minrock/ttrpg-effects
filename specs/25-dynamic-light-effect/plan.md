# Plan tecnico - Luz dinamica ambiental

## Estado

- [x] Revisar el pipeline de efectos, luces, mascaras y persistencia.
- [x] Definir el modelo de dominio y validacion de escena.
- [x] Integrar creacion, seleccion, movimiento y propiedades.
- [x] Implementar el renderer animado persistente en PixiJS.
- [x] Integrar oscuridad normal y vision en la oscuridad.
- [x] Completar pruebas automatizadas y smoke test visual.
- [x] Obtener aceptacion antes de mergear.

## Modelo y persistencia

1. Agregar `SceneDynamicLightEffect` a la union `SceneEffect`.
2. Crear funciones puras de creacion y actualizacion con sanitizacion.
3. Extender Zod para aceptar y validar `kind: "dynamic-light"`.
4. Mantener `SCENE_DOCUMENT_VERSION = 1` porque el cambio es aditivo.
5. Normalizar todos los caminos de guardado con un payload IPC compatible con el esquema prototipo y retirar el campo auxiliar durante la serializacion actual.

## UI y flujo

1. Agregar `Luz dinamica` al submenu contextual de efectos.
2. Crear el efecto con fuente de una celda, 2 cuadros de luz fuerte y 4 de luz tenue.
3. Mostrar sus propiedades en el aside de seleccion.
4. Reutilizar el flujo generico de movimiento y eliminacion de efectos.

## Render PixiJS

1. Incorporar la luz al cache de la capa `lights` con firma propia.
2. Construir una jerarquia de circulos concentricos una sola vez.
3. Usar `Container.onRender` para actualizar alfa sin listeners persistentes ni allocations por frame.
4. Usar una fase determinista por id para evitar que todas las luces pulsen sincronizadas.
5. Mantener la geometria de mascara estable para evitar regenerar `RenderTexture` durante la animacion.
6. Combinar ondas lentas, medias y rapidas con contraste medio, aplicando una curva no lineal al nucleo para enfatizar el ciclo encendido/apagado sin producir destellos excesivos.
7. Separar el estado animado mutable de la firma del contenedor para actualizar intensidad, opacidad, variacion y velocidad sin destruir objetos Pixi.
8. Usar firmas independientes para geometria visual, mascara de iluminacion y capas de efectos, invalidando solo la capa afectada.
9. Evitar redibujar la niebla y la seleccion cuando un cambio de luz no altera su geometria.
10. Configurar culling por el radio tenue para omitir luces dinamicas completamente fuera del viewport.

## Vision y capas

1. Agregar la luz fuerte como borrado completo y la tenue como borrado parcial de oscuridad.
2. Reproducir la misma diferencia en la mascara de color de darkvision.
3. Mantenerlo en la capa de luces, debajo de oscuridad magica, niebla y herramientas de area.

## Verificacion

1. Tests unitarios para defaults y sanitizacion.
2. Test de esquema para round trip del efecto.
3. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build`.
4. Abrir la app y validar creacion, animacion, seleccion, controles y persistencia.
5. Verificar que el dialogo abre con una luz dinamica presente y que el round trip conserva sus propiedades dentro de `effects`.

## Cierre

- [x] Modelo, schema y serializacion compatibles implementados.
- [x] Creacion, seleccion, movimiento, eliminacion y propiedades implementados.
- [x] Render animado y mascaras de iluminacion integrados en DM y Player View.
- [x] Invalidacion selectiva, culling y reutilizacion de objetos Pixi verificados.
- [x] Guardado nuevo, guardado directo y round trip `.ttrpgscene` verificados.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` completados.
- [x] Smoke test visual completado y cambios aceptados.

## Extension: apertura y direccion

### Estado

- [x] Extender dominio y schema con `apertureDegrees` y `direction`.
- [x] Mantener compatibilidad con escenas anteriores mediante defaults `360°` y `0°`.
- [x] Agregar selector de cobertura completa, mitad y angulo personalizado.
- [x] Agregar control numerico de apertura y direccion.
- [x] Recortar halos, oscuridad y mascara de color con la misma geometria radial.
- [x] Implementar manivela de orientacion con preview Pixi local.
- [x] Incluir apertura y direccion en firmas de cache visual, mascara y seleccion.
- [x] Cubrir defaults, normalizacion y round trip con pruebas automatizadas.
- [x] Completar smoke visual en DM y Player View.
- [x] Obtener aceptacion antes de mergear nuevamente.

### Implementacion tecnica

1. Modelar la apertura como grados para evitar estados duplicados: `360` representa completa, `180` mitad y cualquier otro valor el modo angular.
2. Derivar el modo del selector desde `apertureDegrees`; al pasar por primera vez a angulo usar `90°`.
3. Reutilizar una funcion geometrica que dibuje circulo para `360°` y sector radial para aperturas menores.
4. Aplicar esa funcion a halo tenue, halo fuerte, borrado de oscuridad y recuperacion de color en darkvision.
5. Mantener los circulos de la fuente central completos para representar una fuente fisica circular de una celda.
6. Mostrar la manivela solo cuando la apertura sea menor a `360°`.
7. Guardar el preview de direccion en `previewEffects` y publicar `onDynamicLightDirectionChange` solo al finalizar el drag.
8. No invalidar niebla, capas de efectos ni estado React durante cada movimiento de la manivela.
