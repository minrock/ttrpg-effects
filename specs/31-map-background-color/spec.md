# Spec 31 - Color de fondo infinito por mapa

## Estado

Implementada.

## Objetivo

Permitir que el DM controle el color del fondo infinito que se pinta detras del mapa activo. El color debe guardarse por mapa dentro de la escena para que cada mapa pueda tener una ambientacion visual propia.

## Contexto

Actualmente el canvas usa un fondo gris/oscuro fijo detras de la imagen del mapa. Ese fondo funciona como superficie infinita cuando el DM hace pan, zoom, ajusta mapas o trabaja con mapas que no ocupan todo el viewport. Con escenas multi-mapa, conviene que ese fondo sea configurable por mapa para acompañar distintas atmosferas: dungeon oscuro, exterior nocturno, mar, lava, nieve, niebla, etc.

Esta spec introduce un control simple de color en la zona de mapa del panel izquierdo de controles, y persiste el color como dato de nivel mapa.

## Definiciones

- **Fondo infinito:** superficie visual que se renderiza detras de la imagen del mapa y sus capas, actualmente con color fijo.
- **Color de fondo de mapa:** color configurable por mapa usado para pintar el fondo infinito.
- **Mapa activo:** mapa actualmente seleccionado en una escena multi-mapa.

## Alcance

### Incluido

- Agregar un color de fondo configurable por mapa.
- Mantener el color actual como valor default para mapas nuevos, mapas migrados y escenas antiguas.
- Persistir el color dentro del mapa en el archivo `.ttrpgscene`.
- Restaurar el color al cargar una escena guardada.
- Cambiar el color visible inmediatamente al modificarlo desde la UI.
- Agregar el control en el panel izquierdo, dentro de la zona/tab de mapa.
- Mantener el control disponible solo cuando existe mapa activo.
- Sincronizar el fondo con Player View mediante el snapshot de escena existente.
- Validar que el color persistido sea un hex color seguro.

### Fuera de alcance

- Gradientes, texturas, imagenes o patrones de fondo.
- Colores por escena completa, campana o perfil global.
- Animaciones del fondo.
- Paletas avanzadas, historial de colores o presets de ambientacion.
- Cambiar colores de grilla, niebla, oscuridad, luces u otros elementos.
- Persistir preferencias temporales de UI del selector de color.
- Generar builder/DMG como parte de la revision de spec/plan.

## Modelo funcional

Cada mapa debe tener un campo persistente de color de fondo:

- Formato: string hexadecimal `#RRGGBB`.
- Default: el color visual actual del fondo infinito, equivalente a `#15181a`.
- El valor pertenece al mapa, no a la escena completa.

En una escena multi-mapa, cada mapa puede tener un color distinto. Al cambiar de mapa activo, el canvas del DM y Player View deben usar el color del nuevo mapa.

## Reglas funcionales

### Inicializacion

1. Los mapas nuevos inician con el color default.
2. Los mapas importados o migrados desde escenas antiguas sin este campo reciben el color default.
3. Las escenas existentes sin color de fondo cargan sin errores.
4. Al cargar una escena guardada con color de fondo, cada mapa restaura su propio valor.

### Edicion desde DM

1. El DM usa un control de color ubicado en el panel izquierdo, dentro de la zona de mapa.
2. El control muestra el color actual del mapa activo.
3. Cambiar el color actualiza inmediatamente el fondo infinito del canvas.
4. Cambiar el color marca la escena como modificada.
5. El control queda oculto o deshabilitado cuando no hay mapa activo.
6. El control debe ser discreto y coherente con el resto de controles de mapa.

### Persistencia

1. El color se guarda dentro del mapa activo al guardar la escena.
2. El color se mantiene independiente para cada mapa.
3. El color no se duplica como propiedad raiz de la escena al serializar.
4. Al guardar una escena migrada o antigua, el campo se escribe en el formato vigente.
5. Si un archivo externo trae un color invalido, la app debe rechazarlo con error recuperable o normalizarlo al default segun el patron de validacion existente para colores.

### Player View

1. Player View recibe el color de fondo del mapa activo desde el snapshot de escena.
2. Player View pinta el mismo fondo infinito que ve el DM para ese mapa.
3. Cambiar de mapa activo sincroniza el color correspondiente con Player View.
4. El jugador no tiene controles para cambiar este color.

## Interfaz esperada

### Panel izquierdo

- Nuevo control en la zona/tab de mapa.
- Input de color o swatch editable.
- Texto breve como `Fondo` o `Color de fondo`.
- El swatch debe mostrar el color actual.
- Puede existir un boton discreto para volver al default si encaja con el patron de controles.

### Canvas DM

- El fondo infinito cambia de color inmediatamente.
- El mapa, grilla, fog, oscuridad, efectos, tokens, labels y anotaciones no cambian de color por esta accion.
- Si no hay mapa activo, se mantiene el fondo default de la app o el estado vacio vigente.

### Player View

- El fondo infinito usa el color del mapa activo.
- No aparece ningun control nuevo en Player View.

## Casos de uso

### Cambiar color del mapa activo

1. El DM abre una escena con un mapa.
2. El panel izquierdo muestra el control de fondo en la zona de mapa.
3. El DM selecciona un nuevo color.
4. El canvas actualiza el fondo infinito.
5. La escena queda marcada como modificada.
6. Al guardar y recargar, el color se mantiene.

### Mapas con colores distintos

1. El DM tiene una escena con dos mapas.
2. El mapa A usa un fondo oscuro.
3. El mapa B usa un fondo azul.
4. Al cambiar del mapa A al B, el fondo cambia al color de B.
5. Al volver al mapa A, se restaura el color de A.

### Escena antigua

1. El DM abre una escena creada antes de esta spec.
2. La escena carga sin errores.
3. El mapa usa el color default actual.
4. El DM puede cambiar el color y guardarlo en la nueva version compatible.

## Criterios de aceptacion

- El DM puede cambiar el color del fondo infinito desde el panel izquierdo en la zona de mapa.
- El color se guarda por mapa dentro de `.ttrpgscene`.
- Mapas nuevos y escenas antiguas usan `#15181a` por default.
- Cambiar de mapa restaura el color propio de cada mapa.
- Player View usa el mismo color de fondo del mapa activo.
- Colores invalidos en archivos externos no rompen la carga de forma silenciosa.
- La feature queda documentada para release patch `2.2.1` al cierre.
