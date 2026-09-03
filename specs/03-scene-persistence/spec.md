# Spec - Persistencia y Formato de Escena

Este documento describe de forma unificada la funcionalidad de persistencia y formato de escena, consolidando el alcance funcional vigente en el proyecto.

## Formato de Sesion

### Objetivo

Definir el formato de guardado y carga de una escena local, incluyendo mapa, camara, grilla, luces, efectos y herramientas tacticas.

### Alcance

- Crear un formato JSON versionado.
- Guardar ruta local de imagen.
- Guardar posicion y escala visual del mapa.
- Guardar configuracion de camara.
- Guardar configuracion de grilla.
- Guardar oscuridad global.
- Guardar luces, efectos y formas.
- Cargar una sesion guardada.

### Fuera de alcance

- Empaquetar imagenes dentro del archivo.
- Sincronizacion en nube.
- Campanas multiusuario.

### Extension propuesta

Usar una extension propia:

```text
.ttrpgscene
```

El contenido sera JSON.

### Estructura tentativa

```json
{
  "version": 1,
  "map": {
    "imagePath": "/ruta/local/map.png",
    "position": { "x": 0, "y": 0 },
    "scale": 1
  },
  "camera": {
    "x": 0,
    "y": 0,
    "zoom": 1
  },
  "grid": {
    "enabled": true,
    "locked": true,
    "cellSizeWorld": 100,
    "opacity": 0.35,
    "unit": "ft",
    "distancePerCell": 5,
    "metricDistancePerCell": 1.5
  },
  "darkness": {
    "enabled": true,
    "opacity": 0.65,
    "color": "#000000"
  },
  "settings": {
    "diagonalMode": "dnd5e-default",
    "snapToGrid": true
  },
  "lights": [],
  "effects": [],
  "shapes": []
}
```

### Criterios de aceptacion

- Se puede guardar una escena en disco.
- Se puede cargar una escena desde disco.
- Si una escena fue cargada desde un `.ttrpgscene` existente, `Guardar escena` abre el dialogo nativo en esa misma ruta y sugiere el mismo nombre de archivo para permitir sobrescribir con una sola confirmacion.
- Si la imagen local no existe, la app muestra un error recuperable.
- El formato incluye version para migraciones futuras.
- El guardado conserva rutas locales sin copiar la imagen.
- El guardado conserva `map.position` y `map.scale`; `map.scale` representa la escala visual de la imagen del mapa y es independiente de `camera.zoom`.
- Al cargar una escena, `map.scale` se normaliza a un rango seguro para evitar mapas invisibles o dimensiones extremas.

### Riesgos

- Guardar datos dependientes de pantalla en vez de coordenadas de mundo.
- No versionar el formato desde el inicio.
- No manejar rutas rotas de imagen.

### Notas de implementacion

- Mantener validacion de esquema.
- Considerar Zod o una validacion equivalente.
- El renderer puede enviar la ruta actual como sugerencia tipada de guardado, pero no debe escribir directamente en filesystem; main/infrastructure siguen controlando el dialogo y la escritura.
- No bloquear el render si falla la carga de un asset.
- Tratar `map.scale` como un factor decimal (`1` = 100%) de la imagen del mapa; no usarlo como zoom de camara ni como tamano de celda.
## Integracion con anotaciones del mapa

- La escena persiste `mapAnnotations.pins` y `mapAnnotations.areas`, incluyendo coordenadas de mundo, Markdown, tipo, geometria y bloqueo.
- Escenas V1 anteriores cargan con ambas listas vacias y se marcan para re-guardado compatible.
- Los highlights temporales de areas no forman parte del archivo `.ttrpgscene`.

## Persistencia de extension de grilla

- No guardar una opcion de extension: la grilla siempre cubre el viewport. Ignorar el campo obsoleto `grid.extendToViewport` en archivos de prueba, independientemente de su valor.
- No cambiar version de formato ni serializar ventanas de cache, escalas de controles, filtros o expansion del arbol.
- Seleccion, centrado y borrado desde el arbol reutilizan las entidades e ids existentes.

## Persistencia del grosor de grilla

- Guardar `grid.lineWidth` en `.ttrpgscene` y snapshots: 1 para delgadas, 3 para gruesas.
- Campo ausente en archivos anteriores se normaliza a 1; rechazar otros valores. No cambiar la version V1 del formato.
- Conservar la calibracion y demas datos al guardar/cargar. El grosor no predeterminado cuenta como contenido de escena; una escena vacia antigua con default aplicado sigue vacia.

## Cierre 1.9.0

Los cambios de controles de efectos, arbol de objetos y/o grilla descritos en las extensiones de esta especificacion fueron aceptados por el usuario el 2026-09-02 para cierre en main. El plan registra la verificacion realizada; los pendientes historicos ajenos a estas extensiones no se consideran ejecutados por este cierre.
