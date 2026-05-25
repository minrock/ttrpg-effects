# Spec 30 - Biblioteca Persistente de Monstruos

## Objetivo

Agregar una biblioteca local persistente de monstruos para que el DM pueda reutilizar statblocks entre escenas. Al agregar un monstruo a la campaña/escena, el usuario puede elegir uno existente desde un listado con buscador o crear uno nuevo. Si crea uno nuevo, este se guarda en la base de datos local y se inserta inmediatamente en la escena actual.

## Contexto

El aside del DM ya permite crear monstruos dentro de una escena y el spec 29 agrego templates Markdown/CSS para facilitar statblocks por sistema. Sin embargo, los monstruos creados viven solamente dentro de la escena. Para preparar campañas de forma mas eficiente, se necesita una biblioteca persistente que sobreviva entre escenas y pueda alimentar el flujo de agregar monstruos.

La app debe seguir funcionando sin servicios externos. La persistencia recomendada es SQLite local en el proceso `main`, guardada bajo `app.getPath("userData")`, expuesta al renderer mediante preload + IPC tipado.

## Alcance

- Crear una biblioteca local persistente de monstruos respaldada por SQLite.
- Agregar flujo de seleccion al hacer `+ Agregar monstruo`:
  - abrir modal tipo grilla/listado;
  - buscar por nombre;
  - filtrar o visualizar sistema/template;
  - seleccionar un monstruo existente;
  - crear un monstruo nuevo si no existe.
- Al elegir un monstruo existente:
  - se crea una instancia dentro de la escena actual;
  - se copian nombre, contenido/notas, template/sistema e imagen si aplica;
  - se genera un id unico de escena para evitar colisiones.
- Al crear un monstruo nuevo:
  - se guarda primero en la biblioteca local;
  - se agrega inmediatamente como instancia en la escena actual;
  - queda disponible para futuras escenas.
- Persistir en la DB:
  - nombre de monstruo;
  - sistema al que pertenece;
  - `templateId` usado cuando aplique;
  - contenido Markdown del statblock/notas;
  - metadata minima de auditoria local.
- Mantener el `.ttrpgscene` como formato portable de escena: la escena guarda la instancia de monstruo, no depende de que la biblioteca exista.

## Fuera de alcance

- Sincronizacion cloud o multiusuario.
- Marketplace/descarga remota de monstruos.
- Compendios protegidos por copyright.
- Importacion masiva desde archivos externos.
- Versionado complejo de monstruos ya insertados en escenas.
- Actualizacion automatica de instancias existentes cuando cambia el monstruo en biblioteca.
- Busqueda full-text avanzada en esta primera iteracion.
- Imagen obligatoria del monstruo.

## Comportamiento

### Abrir biblioteca desde agregar monstruo

- En el aside DM, la accion `+ Agregar monstruo` deja de abrir directamente el formulario vacio.
- En su lugar abre un modal de biblioteca de monstruos.
- El modal debe ser tipo grilla/listado y tener buscador visible arriba.
- Cada item muestra:
  - imagen del monstruo a ancho completo de la card (aspect-ratio 16:9, placeholder si no hay imagen);
  - nombre;
  - sistema y template usado si existe.
- El listado debe permitir seleccionar un monstruo y agregarlo a la escena.

### Buscar y seleccionar

- El usuario puede escribir en el buscador.
- El listado filtra por nombre y, si es razonable en la implementacion, tambien por sistema.
- Si no hay resultados, se muestra estado vacio con accion `Crear monstruo nuevo`.
- Al seleccionar un monstruo existente:
  - se crea una instancia `SceneMonster`;
  - `visibleToPlayer` inicia en `false`;
  - `templateId` se copia si existe;
  - `notes` se inicializa con el contenido Markdown guardado;
  - `name` se copia desde la biblioteca;
  - `id` se slugifica y se hace unico dentro de la escena.

### Crear monstruo nuevo

- Desde el modal de biblioteca, el usuario puede elegir `Nuevo monstruo`.
- Se abre el formulario de monstruo actual, pero conectado a la biblioteca.
- El usuario captura:
  - nombre;
  - sistema;
  - template;
  - contenido Markdown;
  - imagen opcional si el flujo actual ya la soporta.
- Al guardar:
  - se valida que el nombre no este vacio;
  - se guarda el monstruo en SQLite;
  - se agrega inmediatamente una instancia a la escena actual;
  - el modal se cierra o vuelve al listado con feedback claro.

### Editar monstruo de escena vs biblioteca

- Editar un monstruo ya agregado a la escena modifica la instancia de escena, como hoy.
- En esta primera iteracion, editar una instancia de escena no actualiza automaticamente la biblioteca.
- Si se requiere guardar cambios de una instancia hacia biblioteca, quedara para un spec futuro como `Actualizar entrada de biblioteca`.

## Modelo de datos

### Entidad de biblioteca

```ts
type MonsterLibraryEntry = {
  id: string;
  name: string;
  system: string;
  templateId: string | null;
  contentMarkdown: string;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### Instancia en escena

`SceneMonster` mantiene su rol actual como copia/instancia dentro de una escena:

```ts
type SceneMonster = {
  id: string;
  name: string;
  imagePath: string | null;
  visibleToPlayer: boolean;
  notes: string;
  templateId?: string | null;
};
```

La escena no debe guardar solo una referencia a la biblioteca. Debe guardar los datos necesarios para abrirse de forma portable aunque la DB local no exista.

## Persistencia SQLite

La DB vive en `app.getPath("userData")`, por ejemplo:

```text
TTRPG Effects/ttrpg-effects.sqlite
```

Tabla inicial sugerida:

```sql
CREATE TABLE monster_library_entries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  system TEXT NOT NULL,
  template_id TEXT,
  content_markdown TEXT NOT NULL,
  image_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX monster_library_entries_name_idx
  ON monster_library_entries (name);

CREATE INDEX monster_library_entries_system_idx
  ON monster_library_entries (system);
```

Migraciones:

- Deben ser versionadas.
- Deben ejecutarse desde `main` al iniciar la app o al inicializar el repositorio.
- La version de migracion puede vivir en `PRAGMA user_version` o tabla `schema_migrations`.

## Arquitectura

- `domain` define `MonsterLibraryEntry`, validaciones y conversion de entrada de biblioteca a `SceneMonster`.
- `application` define casos de uso:
  - listar/buscar monstruos;
  - guardar monstruo nuevo;
  - obtener monstruo por id;
  - convertir entrada a instancia de escena.
- `infrastructure` implementa repositorio SQLite.
- `main` inicializa DB, migraciones y registra IPC.
- `preload` expone funciones especificas:
  - `searchMonsterLibrary(query)`
  - `saveMonsterLibraryEntry(entry)`
  - `getMonsterLibraryEntry(id)`
- `renderer` consume la API desde el modal de biblioteca.
- El renderer no accede directamente a SQLite, filesystem ni Electron internals.

## IPC

Canales sugeridos:

- `monster-library:search`
- `monster-library:save`
- `monster-library:get`

Los payloads deben validarse en `main` antes de tocar la DB.

## UI / UX

- Modal amplio, tipo grilla/listado, reutilizando el look del aside DM.
- Buscador arriba, siempre visible.
- Resultados escaneables en cards compactas.
- Acciones principales:
  - `Agregar a escena`;
  - `Nuevo monstruo`.
- Si no hay resultados:
  - mostrar estado vacio;
  - ofrecer `Crear monstruo nuevo`.
- El formulario de nuevo monstruo debe mantener el selector de template del spec 29.
- El sistema puede autocompletarse desde el template seleccionado si el template tiene `system`.

## Validacion

- `name` requerido, trim, longitud razonable.
- `system` requerido, trim, con default si viene vacio desde UI.
- `contentMarkdown` requerido o default vacio permitido solo si el usuario confirma.
- `templateId` debe ser string no vacio o `null`.
- `imagePath` debe ser string no vacio o `null`.
- Fechas en ISO string.
- Queries parametrizadas, nunca concatenar SQL con input de usuario.

## Criterios de aceptacion

- Al hacer `+ Agregar monstruo`, se abre el modal de biblioteca.
- El modal muestra una grilla/listado con buscador.
- El usuario puede buscar monstruos por nombre.
- El usuario puede seleccionar un monstruo existente y agregarlo a la escena.
- El monstruo agregado a escena conserva nombre, template, contenido Markdown e imagen si existe.
- El usuario puede crear un monstruo nuevo desde ese flujo.
- El monstruo nuevo se guarda en SQLite y queda disponible al volver a abrir el modal.
- El monstruo nuevo se agrega inmediatamente a la escena.
- Las escenas guardadas siguen siendo portables: incluyen los datos del monstruo insertado.
- La DB se maneja desde `main`/infraestructura, no desde renderer.
- Las consultas usan parametros SQL.
- Hay migracion inicial versionada.
- Tests relevantes cubren conversion de biblioteca a `SceneMonster` y validaciones basicas.
