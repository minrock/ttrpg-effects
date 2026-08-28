# Spec 25 - Luz dinamica ambiental

## Estado

- Aceptada e implementada.
- Validacion visual, persistencia y pruebas automatizadas completadas antes del merge.

## Objetivo

Agregar una fuente de luz ambiental animada inspirada en la lectura visual de fogatas y luces vistas desde arriba en mapas animados: nucleo calido, halo radial suave y variacion organica continua.

La implementacion debe producir su propia animacion con PixiJS. No debe copiar ni incluir recursos propietarios de Dynamic Dungeons.

## Referencias visuales

- Dynamic Dungeons presenta mapas animados pensados para TV o proyector y una escena que se percibe viva: <https://dynamicdungeons.com/>.
- Su editor combina fondos animados en loop, props y particulas con ajustes de color y brillo: <https://dynamicdungeons.com/help/>.

## Requerimientos funcionales

1. En el submenu contextual `Efectos` debe existir la accion `Luz dinamica`.
2. La accion crea el efecto en la coordenada del menu contextual y lo selecciona.
3. La fuente ocupa exactamente una celda de diametro.
4. La luz fuerte y la luz tenue tienen alcances independientes expresados en cuadros de grilla.
5. Los valores iniciales son 2 cuadros de luz fuerte y 4 cuadros de luz tenue.
6. La luz tenue nunca puede tener un alcance menor que la luz fuerte.
7. El efecto se mueve libremente y no hace snap a la grilla.
8. El efecto debe poder seleccionarse, arrastrarse, eliminarse y persistirse en la escena.
9. Sus propiedades aparecen en el acordeon superior del aside derecho:
   - visible;
   - color;
   - alcance de luz fuerte en cuadros;
   - alcance de luz tenue en cuadros;
   - intensidad;
   - opacidad;
   - variacion del parpadeo;
   - velocidad de animacion.
10. Debe renderizarse tanto en la vista del DM como en la del jugador.
11. La luz fuerte debe retirar completamente la oscuridad normal y la tenue debe reducirla parcialmente.
12. Con vision en la oscuridad activa, la zona fuerte devuelve el color completo y la tenue lo recupera parcialmente.
13. La niebla de guerra y la oscuridad magica conservan prioridad visual sobre la luz.

## Comportamiento visual

- Circulo exterior amplio para la luz tenue.
- Circulo intermedio calido para la luz fuerte.
- Fuente formada solo por circulos concentricos y con una celda exacta de diametro.
- Pulso marcado pero sin saltos bruscos, combinando varias ondas de diferente frecuencia.
- La variacion modifica la profundidad entre encendido y apagado; en su valor maximo la fuente debe atenuarse de forma marcada sin desaparecer abruptamente.
- La velocidad modifica la frecuencia y debe ser claramente perceptible en su valor maximo.
- Los alcances efectivos permanecen estables durante la animacion; solo cambia la luminancia.

## Rendimiento

- No actualizar estado React por frame.
- No reconstruir `Graphics`, mascaras o `RenderTexture` por frame.
- Crear una sola jerarquia Pixi por efecto y animar unicamente `alpha`.
- No registrar listeners globales por efecto que sobrevivan a la destruccion del contenedor.
- Intensidad, opacidad, variacion y velocidad actualizan un estado de render reutilizable sin reconstruir la geometria Pixi.
- Solo cambios estructurales como posicion, radios, color o visibilidad pueden reconstruir la entrada cacheada de esa luz.
- Cambiar propiedades exclusivamente visuales no regenera las mascaras de oscuridad o darkvision ni redibuja las capas de fuego y agua.
- La niebla permanece por encima de las luces y no se invalida cuando cambia una fuente de luz.
- Las luces completamente fuera del viewport usan culling por el radio de luz tenue y no ejecutan trabajo de render hasta volver a entrar en camara.

## Persistencia

El efecto se guarda en `effects` con `kind: "dynamic-light"` y los campos necesarios para reproducir exactamente su apariencia. El cambio es aditivo y mantiene compatibilidad con escenas existentes.

- El payload IPC incluye temporalmente un `radius` de compatibilidad para procesos main que sigan ejecutando el esquema prototipo.
- El esquema actual elimina ese campo auxiliar antes de serializar y conserva `brightRadiusCells`, `dimRadiusCells`, color, intensidad, opacidad, variacion, velocidad, posicion y visibilidad.
- Guardar una escena nueva debe abrir el dialogo aun cuando contenga luces dinamicas; los guardados directos y en segundo plano usan la misma normalizacion.

## Criterios de aceptacion

- Se puede crear desde `Efectos > Luz dinamica`.
- El nucleo y los halos parpadean de forma continua.
- Los controles cambian la apariencia sin reiniciar la escena.
- La luz revela oscuridad normal y color en darkvision.
- Guardar y cargar una escena conserva la luz y sus propiedades.
- El archivo `.ttrpgscene` contiene la luz dinamica bajo `effects` y no conserva campos transitorios de compatibilidad.
- Seleccionar, mover o animar la luz no reconstruye las demas capas por frame.
