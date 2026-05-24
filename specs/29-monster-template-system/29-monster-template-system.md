# Spec 29 - Sistema de Templates de Monstruos

## Objetivo

Permitir que el DM administre templates de Markdown para notas de monstruos, elija un template al crear o editar un monstruo, rellene datos con una estructura prehecha y visualice el resultado con estilos CSS propios del template.

## Contexto

Las notas de monstruos ya aceptan Markdown y tablas GFM. Para preparar encuentros mas rapido, el DM necesita templates por sistema de juego que funcionen como statblocks reutilizables. El primer template incluido sera D&D 5.5e, inspirado visualmente en statblocks de AideDD dentro de su contenedor `jaune`, pero traducido y estructurado con los campos definidos para esta aplicacion.

## Alcance

- Crear un sistema persistente de templates de monstruos dentro del software.
- Agregar una opcion en el menu de aplicacion: `File` / `Archivo` -> `Administrar templates de monstruos`.
- El administrador abre un modal con:
  - listado lateral de templates guardados;
  - editor de Markdown;
  - editor de CSS scoped;
  - previsualizacion del template;
  - boton para alternar entre editar y previsualizar;
  - boton guardar.
- Agregar selector de template en el formulario de monstruo:
  - `Sin template`;
  - templates guardados.
- Al elegir un template, las notas del monstruo se rellenan con el Markdown del template.
- Las notas de monstruo se editan como Markdown plano para preservar tablas GFM, pipes y placeholders sin que un editor rich text reserialice el contenido.
- Renderizar la vista de detalle del monstruo aplicando el CSS del template si el monstruo fue creado o marcado con ese template.
- Incluir un template semilla D&D 5.5e en espanol.
- Guardar templates de forma local para que persistan entre sesiones de la app.

## Fuera de alcance

- Marketplace o descarga remota de templates.
- Sincronizacion entre computadores.
- Variables interactivas con formularios por campo.
- Importar contenido protegido o copiar statblocks completos de terceros.
- Soporte completo de CSS arbitrario global.
- Editor visual avanzado de tablas o layout del template.
- Templates para NPCs o notas generales en esta iteracion.

## Comportamiento

### Administrar templates

- Desde el menu de aplicacion, el DM abre `Administrar templates de monstruos`.
- El modal muestra a la izquierda los templates existentes.
- La derecha muestra:
  - nombre del template;
  - sistema o etiqueta, por ejemplo `D&D 5.5e`;
  - textarea/editor para Markdown;
  - textarea/editor para CSS;
  - boton `Previsualizar` / `Editar`;
  - boton `Guardar`.
- En modo edicion se editan Markdown y CSS.
- En modo previsualizacion se renderiza el Markdown con el CSS scoped del template.
- El usuario puede crear un template nuevo duplicando uno existente o desde un template vacio.
- El usuario puede guardar cambios.
- El template semilla D&D 5.5e debe estar disponible aunque no existan templates del usuario.

### Usar un template en monstruos

- En el modal de crear/editar monstruo, sobre el editor de notas, se muestra un selector:
  - `Sin template`;
  - un item por template guardado.
- Si el usuario elige `Sin template`, las notas se comportan como hasta ahora.
- Si el usuario elige un template y las notas estan vacias, se rellena el Markdown del template.
- Si las notas ya tienen contenido y el usuario cambia de template, se debe pedir confirmacion antes de reemplazar las notas.
- El monstruo guarda el `templateId` usado.
- En la vista de detalle del monstruo, si `templateId` existe y el template esta disponible, el Markdown se renderiza dentro de un contenedor con el CSS scoped del template.
- El Markdown del monstruo no debe pasar por un editor rich text que agregue lineas vacias entre filas de tabla o transforme caracteres especiales.
- El Markdown visible/editable del usuario no debe incluir HTML estructural del card; el render del template agrega el wrapper HTML/clases necesarias segun el template seleccionado.
- Si el template fue eliminado o no se puede cargar, el monstruo se renderiza con el estilo Markdown normal y muestra un estado recuperable, sin romper la nota.

## Template semilla D&D 5.5e

El template debe capturar los siguientes campos en espanol y usar un estilo de card claro en blancos/grises con acentos rojos, borde redondeado, ancho amplio cercano a `672px` y tabla compacta de caracteristicas similar a un statblock moderno:

- Nombre.
- Descripcion corta, alineacion.
- Clase de Armadura usando `CA`.
- Iniciativa.
- Puntos de golpe usando `PG`.
- Velocidad.
- Tabla de caracteristicas:
  - `FUE` para STR.
  - `DES` para DEX.
  - `CON`.
  - `INT`.
  - `SAB` para WIS.
  - `CAR` para CHA.
- Habilidades.
- Inmunidades.
- Sentidos.
- Idiomas.
- Valor de Desafio usando `VD`.
- Bono de Competencia usando `Bonif.`.
- Rasgos.
- Acciones.
- Acciones Legendarias.
- Acciones de Guarida.
- Reacciones.

Markdown base sugerido:

```md
# {{Nombre}}

*{{Descripcion corta}}, {{alineacion}}*

---

**CA** {{CA}}  
**Iniciativa** {{Iniciativa}}  
**PG** {{PG}}  
**Velocidad** {{Velocidad}}

| | MOD | SALV. | | MOD | SALV. | | MOD | SALV. |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |
| **FUE** {{FUE}} | {{FUE_MOD}} | {{FUE_SALV}} | **DES** {{DES}} | {{DES_MOD}} | {{DES_SALV}} | **CON** {{CON}} | {{CON_MOD}} | {{CON_SALV}} |
| **INT** {{INT}} | {{INT_MOD}} | {{INT_SALV}} | **SAB** {{SAB}} | {{SAB_MOD}} | {{SAB_SALV}} | **CAR** {{CAR}} | {{CAR_MOD}} | {{CAR_SALV}} |

**Habilidades** {{Habilidades}}  
**Inmunidades** {{Inmunidades}}  
**Sentidos** {{Sentidos}}  
**Idiomas** {{Idiomas}}  
**VD** {{VD}}  
**Bonif.** {{Bonif}}

## Rasgos

**{{Rasgo 1}}.** {{Descripcion del rasgo.}}

## Acciones

**{{Accion 1}}.** {{Descripcion de la accion.}}

## Reacciones

**{{Reaccion 1}}.** {{Descripcion de la reaccion.}}

## Acciones Legendarias

**{{Accion legendaria 1}}.** {{Descripcion de la accion legendaria.}}

## Acciones de Guarida

**{{Accion de guarida 1}}.** {{Descripcion de la accion de guarida.}}
```

CSS base sugerido:

```css
.monster-card.dnd-55e {
  max-width: 760px;
  margin: 0 auto;
  border: 1px solid #d1a843;
  border-radius: 8px;
  padding: 18px 20px;
  color: #2b1a0b;
  background: #f7e7b6;
  box-shadow: inset 0 0 0 3px rgb(255 255 255 / 34%), 0 12px 24px rgb(0 0 0 / 24%);
}

.monster-card.dnd-55e h1 {
  margin: 0 0 4px;
  color: #7b1d12;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 2rem;
  letter-spacing: 0;
}

.monster-card.dnd-55e h2 {
  margin: 18px 0 8px;
  border-bottom: 2px solid #b73121;
  color: #7b1d12;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.25rem;
}

.monster-card.dnd-55e table {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
}

.monster-card.dnd-55e th,
.monster-card.dnd-55e td {
  border: 1px solid rgb(123 29 18 / 24%);
  padding: 6px 8px;
}

.monster-card.dnd-55e th {
  color: #fff7d8;
  background: #7b1d12;
}

.monster-card.dnd-55e strong {
  color: #7b1d12;
}
```

## Modelo de datos

Template:

```ts
type MonsterTemplate = {
  id: string;
  name: string;
  system: string;
  markdown: string;
  css: string;
  builtIn: boolean;
  updatedAt: string;
};
```

Monstruo:

```ts
type SceneMonster = {
  templateId?: string | null;
};
```

Persistencia local de templates:

- Los templates se guardan en almacenamiento local de la app, por ejemplo `userData/monster-templates.json`.
- El archivo debe incluir version de formato.
- Los templates built-in pueden declararse en codigo o en un asset local; si el usuario los edita, se guarda una copia editable.

## Seguridad y CSS

- El CSS de templates debe estar scoped al contenedor del template.
- El renderer no debe inyectar CSS global sin prefijo o id de alcance.
- El HTML renderizado desde Markdown debe mantenerse dentro del contenedor de preview/detalle.
- No se debe permitir que el CSS del template afecte la app completa, modales externos o controles del sistema.
- Si se decide sanitizar Markdown/HTML en una spec futura, este flujo debe integrarse con esa sanitizacion.

## Arquitectura

- `domain` define tipos y validaciones de `MonsterTemplate`.
- `infrastructure` maneja lectura/escritura del archivo local de templates.
- `main` registra IPC especifico para listar, guardar y eliminar templates.
- `preload` expone funciones pequenas y tipadas para templates.
- `renderer` muestra el administrador de templates y consume la lista en el formulario de monstruo.
- El detalle del monstruo aplica el render Markdown existente con CSS scoped.
- No debe haber acceso directo desde renderer a filesystem o Electron internals.

## Criterios de aceptacion

- Existe un menu de aplicacion para abrir `Administrar templates de monstruos`.
- El administrador permite ver, editar, previsualizar y guardar templates.
- El template D&D 5.5e existe por defecto.
- Al crear/editar monstruo se puede elegir `Sin template` o un template guardado.
- Elegir un template rellena las notas cuando estan vacias.
- Si las notas tienen contenido, cambiar de template pide confirmacion antes de reemplazar.
- La vista de detalle renderiza tablas Markdown como tablas.
- La vista de detalle aplica CSS scoped del template seleccionado.
- El CSS del template no afecta el resto de la app.
- El `templateId` del monstruo se guarda y carga dentro de `.ttrpgscene`.
- Si un template falta, el monstruo sigue siendo visible con Markdown normal.
