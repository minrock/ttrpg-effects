# Spec 27 - Menu de Escenas Recientes

## Objetivo

Agregar un acceso nativo de aplicacion para abrir rapidamente las ultimas escenas `.ttrpgscene` usadas, sin pasar por el dialogo de seleccion de archivo.

## Contexto

El usuario carga escenas desde `Cargar escena`. En sesiones de mesa es comun alternar entre pocas escenas locales, por lo que tener una lista de recientes reduce friccion. La funcionalidad debe vivir en el menu nativo de Electron para integrarse con macOS y con el menu de aplicacion de Windows/Linux.

## Alcance

- Agregar en el menu nativo `File` una entrada `Abrir recientes`.
- Mostrar las ultimas 5 escenas abiertas o guardadas correctamente.
- Registrar una escena como reciente cuando:
  - se carga desde el dialogo `Cargar escena`;
  - se guarda correctamente;
  - se abre desde `Abrir recientes`.
- Al seleccionar una escena reciente, cargarla en la app igual que `Cargar escena`.
- Si el archivo ya no existe, no puede leerse o no es una escena valida, mostrar error amigable y retirar esa entrada de recientes.
- Persistir la lista de recientes entre ejecuciones de la app.
- Mantener seguridad Electron: renderer no accede a filesystem ni Electron internals.

## Fuera de alcance

- Recientes de mapas sueltos.
- Miniaturas de escenas en el menu.
- Sincronizar recientes por nube.
- Fusionar escenas o preguntar por guardado antes de abrir reciente.

## Comportamiento

### Registro de recientes

- La lista conserva maximo 5 rutas absolutas.
- Al abrir/guardar una escena ya existente en la lista, sube al primer lugar.
- La lista no debe contener duplicados.
- Solo se registran escenas cargadas o guardadas exitosamente.
- Cancelar un dialogo no modifica la lista.

### Menu nativo

- En macOS, la entrada vive bajo `File`.
- En Windows/Linux, la entrada vive bajo el menu nativo de aplicacion equivalente.
- `Abrir recientes` es un submenu.
- Si no hay recientes, muestra una entrada deshabilitada `Sin escenas recientes`.
- Cada item muestra el nombre del archivo o una ruta abreviada legible.

### Abrir reciente

- Al seleccionar una escena reciente:
  - main valida que la ruta exista;
  - main carga y parsea la escena usando el mismo use case de `Cargar escena`;
  - main emite el resultado al renderer DM;
  - renderer actualiza escena, mapa, tokens, warnings, camara y path actual igual que `Cargar escena`.
- Si la ruta falla, main la elimina de recientes y notifica al renderer con error.

## Arquitectura

- La persistencia de recientes vive en `main`, bajo `app.getPath("userData")`.
- El renderer recibe eventos tipados via preload:
  - `onRecentSceneOpen(handler)`.
- El renderer conserva la responsabilidad de aplicar el `SceneOperationResult`.
- Main no conoce React ni muta estado visual.

## Criterios de aceptacion

- El menu `File > Abrir recientes` aparece.
- Al cargar o guardar una escena, aparece en recientes.
- La lista conserva maximo 5 escenas, sin duplicados y en orden de uso reciente.
- Seleccionar una reciente carga la escena en el canvas.
- Seleccionar una reciente rota muestra error y la retira de la lista.
- La lista persiste al reiniciar la app.
- Renderer sigue sin acceso directo a `fs`, `path`, `ipcRenderer` ni Electron internals.
