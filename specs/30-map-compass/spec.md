# Spec 30 - Brujula de mapa y orientacion de Player View

## Estado

Aceptada para plan tecnico.

## Objetivo

Agregar una brujula visible en el canvas del DM para indicar la orientacion cardinal del mapa activo y permitir al DM definir el norte del mapa en pasos de 90 grados.

Cuando el norte del mapa se configure en una direccion distinta a la orientacion visual original, Player View debe compensar esa orientacion rotando la presentacion del mapa para que el norte elegido por el DM quede siempre hacia arriba en la pantalla de jugadores.

## Contexto

En mesa fisica o proyeccion, algunos mapas no estan dibujados con el norte hacia arriba o el DM puede querer orientar la experiencia de los jugadores segun la direccion real de avance. La app necesita un control simple, discreto y persistente que ayude a dirigir la orientacion cardinal sin obligar al DM a rotar manualmente imagenes o recalibrar mapas.

La imagen base de la brujula ya existe en `assets/compass/compass.png`.

## Definiciones

- **Brujula del mapa:** indicador visual superpuesto en el canvas del DM que muestra hacia donde apunta el norte configurado para el mapa activo.
- **Norte del mapa:** orientacion cardinal persistida para el mapa activo. Solo acepta valores en incrementos de 90 grados.
- **Orientacion original:** estado default del mapa, donde el norte apunta hacia arriba y la rotacion es 0 grados.
- **Rotacion de Player View:** transformacion visual aplicada a la presentacion del mapa en la ventana de jugadores para que el norte configurado quede arriba en pantalla.

## Alcance

### Incluido

- Mostrar una imagen de brujula en la parte superior derecha del canvas del DM.
- Usar `assets/compass/compass.png` como imagen visual de la brujula.
- Renderizar la brujula con transparencia ligera para que no tape informacion del mapa.
- Inicializar nuevos mapas con norte hacia arriba.
- Agregar un control en el panel derecho del DM para cambiar la orientacion del norte.
- Permitir solo cuatro orientaciones: norte hacia arriba, este hacia arriba, sur hacia arriba y oeste hacia arriba.
- Persistir la orientacion de brujula por mapa dentro del archivo `.ttrpgscene`.
- Mantener orientaciones independientes entre mapas dentro de una escena multi-mapa.
- Sincronizar Player View con la orientacion del mapa activo.
- Rotar la presentacion del mapa en Player View cuando cambie la orientacion.
- Aplicar la misma orientacion al abrir Player View, cambiar de mapa activo o cargar una escena guardada.
- Mantener la brujula visible solo en el canvas del DM.
- Mantener los controles de orientacion solo en la interfaz del DM.
- Mostrar opcionalmente la brujula en Player View mediante un control local muy discreto.
- Permitir al jugador o al DM frente a Player View alternar mostrar/no mostrar la brujula sin modificar la escena.

### Fuera de alcance

- Rotacion libre en grados arbitrarios.
- Edicion visual directa arrastrando la brujula sobre el canvas.
- Controlar la orientacion del mapa desde Player View.
- Rotar o modificar fisicamente la imagen original del mapa en disco.
- Recalibrar automaticamente grillas, mediciones o assets por analisis de imagen.
- Definir nortes magneticos, declinacion, inclinacion o orientaciones no cardinales.
- Animaciones cinematograficas de rotacion.
- Orientacion global de campaña, capitulo o escena completa.
- Cambios de networking, servidor o colaboracion remota.

## Modelo funcional

Cada mapa debe tener un campo persistente de orientacion cardinal:

- `0`: norte hacia arriba, valor default.
- `90`: norte hacia la derecha del mapa original.
- `180`: norte hacia abajo del mapa original.
- `270`: norte hacia la izquierda del mapa original.

El valor pertenece al mapa, no a la escena completa. En una escena multi-mapa, cada mapa puede tener una orientacion distinta.

Al cargar escenas antiguas o mapas sin este campo, la app debe asumir `0` sin requerir migracion manual del usuario.

## Reglas funcionales

### Inicializacion

1. Al crear un mapa nuevo, la orientacion inicial es `0`.
2. Al importar o migrar un mapa desde un archivo anterior que no tenga orientacion, la orientacion se inicializa en `0`.
3. Al cargar una escena, cada mapa restaura su orientacion guardada.
4. Al cambiar el mapa activo, la UI muestra la orientacion del nuevo mapa activo.

### Brujula en canvas del DM

1. La brujula aparece en la esquina superior derecha del canvas del DM.
2. La brujula permanece anclada a la pantalla, no a coordenadas de mundo.
3. La brujula no se mueve con pan, zoom o cambios de camara del DM.
4. La brujula rota visualmente para que su norte apunte segun la orientacion configurada del mapa activo.
5. La brujula debe tener opacidad reducida, suficiente para verla sin cubrir detalles tacticos importantes.
6. La brujula debe quedar por encima del mapa y capas visuales, pero no debe capturar eventos que impidan usar herramientas debajo salvo que luego se implemente interaccion directa.
7. Si no hay mapa activo, la brujula no se muestra o queda en estado deshabilitado segun el patron visual existente.

### Control de orientacion del DM

1. El panel derecho incluye un nuevo control de orientacion de brujula para el mapa activo.
2. El control permite escoger una de cuatro opciones cardinales.
3. Las opciones deben ser claras para el DM: `N`, `E`, `S`, `O` o labels equivalentes.
4. El control no permite escribir grados manualmente ni elegir valores intermedios.
5. Cambiar la orientacion actualiza inmediatamente la brujula en el canvas del DM.
6. Cambiar la orientacion marca la escena como modificada.
7. Si Player View esta abierta, cambiar la orientacion sincroniza la rotacion de Player View inmediatamente.
8. Si no hay mapa activo, el control queda oculto o deshabilitado.

### Player View

1. Player View recibe la orientacion del mapa activo desde el estado compartido que ya sincroniza mapa, camara y capas visibles.
2. Player View rota la presentacion del mapa para que el norte configurado quede hacia arriba de la pantalla de jugadores.
3. Ejemplo: si el DM configura que el norte del mapa original apunta hacia la derecha, Player View rota la presentacion 90 grados para que ese norte quede arriba en pantalla.
4. La rotacion aplica al mapa y a su contenido tactico visible de forma coherente: grilla, fog, oscuridad, luces, efectos, formas, mediciones, tokens, labels, areas y pines deben conservar su alineacion relativa con el mapa.
5. La rotacion no debe modificar los datos persistidos de posiciones, formas, tokens o anotaciones; solo cambia la transformacion visual presentada en Player View.
6. La camara de Player View debe seguir apuntando al area esperada despues de aplicar la rotacion.
7. Las ordenes existentes de recentrado o navegacion entre mapas deben considerar la orientacion para no dejar al jugador viendo una zona inesperada.
8. Player View puede mostrar la misma brujula del mapa activo como overlay discreto.
9. La brujula de Player View esta oculta por defecto para no ensuciar la proyeccion.
10. Player View incluye un control local muy discreto para alternar mostrar/no mostrar la brujula.
11. El toggle de Player View no modifica la escena ni la orientacion persistida del mapa.
12. La brujula de Player View siempre queda con el norte hacia arriba cuando esta visible, porque la rotacion ya se aplica al mundo visual proyectado.

### Persistencia

1. La orientacion se guarda dentro del mapa activo al guardar la escena.
2. El archivo `.ttrpgscene` conserva compatibilidad hacia adelante con el modelo multi-mapa actual.
3. Escenas antiguas sin orientacion cargan con `0`.
4. Al guardar una escena migrada o antigua, el campo de orientacion queda escrito en el nuevo formato.
5. La orientacion no se guarda como estado temporal de UI.

## Interfaz esperada

### Canvas del DM

- Imagen de brujula en la esquina superior derecha.
- Tamano estable en pantalla.
- Margen suficiente respecto a toolbar, borde de ventana y paneles.
- Opacidad ligera, por ejemplo entre 60% y 80%, ajustable por implementacion visual.
- Rotacion inmediata al cambiar el control cardinal.

### Player View

- La brujula puede mostrarse como overlay discreto cuando el toggle local esta activo.
- El toggle debe ocupar poco espacio visual y no competir con el mapa proyectado.
- La preferencia de mostrar/no mostrar puede ser estado local de Player View y no necesita persistirse en `.ttrpgscene`.
- La brujula debe usar el mismo asset que la del DM, pero en Player View siempre debe apuntar al norte de pantalla.

### Panel derecho

- Nuevo grupo compacto para orientacion de mapa.
- Control discreto con cuatro estados cardinales.
- Debe respetar el estilo de controles existentes del panel derecho.
- Debe usar controles familiares como segmented control, botones con icono/texto corto o select compacto.
- Debe evitar sliders, porque solo existen cuatro valores validos.

## Casos de uso

### Configurar norte de un mapa

1. El DM abre una escena con al menos un mapa.
2. El DM ve la brujula en el canvas.
3. El DM abre o usa el panel derecho.
4. El DM selecciona la orientacion deseada.
5. La brujula rota en el canvas del DM.
6. La escena queda marcada como modificada.
7. Si Player View esta abierta, la vista del jugador rota para que el norte seleccionado quede arriba.

### Cambiar entre mapas con orientaciones distintas

1. El DM carga una escena con varios mapas.
2. El mapa A tiene norte hacia arriba.
3. El mapa B tiene norte hacia la derecha.
4. Al cambiar del mapa A al B, la brujula del DM rota segun el mapa B.
5. Player View cambia al mapa B y aplica la rotacion correspondiente.
6. Al volver al mapa A, se restaura la orientacion del mapa A.

### Cargar escena antigua

1. El DM abre una escena guardada antes de existir la brujula.
2. La app carga correctamente la escena.
3. Cada mapa queda con orientacion `0`.
4. El DM puede modificar la orientacion y guardar la escena en el formato vigente.

### Mostrar brujula en Player View

1. Player View esta abierta con una escena cargada.
2. La brujula no aparece inicialmente.
3. El usuario activa el toggle discreto de brujula.
4. Player View muestra la brujula con el norte hacia arriba.
5. Al desactivar el toggle, la brujula desaparece sin cambiar la escena.

## Criterios de aceptacion

- La brujula aparece en el canvas del DM cuando hay mapa activo.
- La brujula usa la imagen existente en `assets/compass/compass.png`.
- El norte default es hacia arriba.
- El DM puede cambiar la orientacion solo entre cuatro valores cardinales.
- La orientacion se persiste por mapa.
- Cambiar de mapa restaura la orientacion propia de ese mapa.
- Player View rota el mapa activo para mantener el norte elegido hacia arriba.
- La rotacion de Player View conserva la alineacion visual de grilla, fog, tokens, luces, efectos y anotaciones con el mapa.
- La brujula puede mostrarse en Player View mediante un toggle discreto y local.
- Player View no permite editar la orientacion del mapa.
- Escenas antiguas cargan sin errores y asumen orientacion `0`.
