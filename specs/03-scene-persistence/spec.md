# Spec - Persistencia y Formato de Escena

Este documento describe de forma unificada la funcionalidad de persistencia y formato de escena, consolidando el alcance funcional vigente en el proyecto.

## Formato de Sesion

### Objetivo

Definir el formato de guardado y carga de una escena local, incluyendo mapa, camara, grilla, luces, efectos y herramientas tacticas.

### Alcance

- Crear un formato JSON versionado.
- Guardar ruta local de imagen.
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

### Riesgos

- Guardar datos dependientes de pantalla en vez de coordenadas de mundo.
- No versionar el formato desde el inicio.
- No manejar rutas rotas de imagen.

### Notas de implementacion

- Mantener validacion de esquema.
- Considerar Zod o una validacion equivalente.
- El renderer puede enviar la ruta actual como sugerencia tipada de guardado, pero no debe escribir directamente en filesystem; main/infrastructure siguen controlando el dialogo y la escritura.
- No bloquear el render si falla la carga de un asset.
