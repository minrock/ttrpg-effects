# Spec - Bootstrap de la Aplicacion

Este documento describe de forma unificada la funcionalidad de bootstrap de la aplicacion, consolidando el alcance funcional vigente en el proyecto.

## Electron Bootstrap

### Objetivo

Crear el codigo inicial de la aplicacion Electron con lo minimo necesario para ejecutar el proyecto y ver una ventana abierta en macOS, manteniendo compatibilidad futura con Windows y Linux.

Este entregable existe para validar el entorno tecnico antes de implementar mapa, grilla, luces o herramientas tacticas.

### Alcance

- Inicializar una app Electron.
- Mostrar una ventana principal.
- Cargar una interfaz minima.
- Mostrar un logo inicial generado para el proyecto.
- Agregar scripts basicos de desarrollo.
- Documentar como ejecutar la app localmente.

### Fuera de alcance

- Carga de mapas.
- Render del canvas principal.
- Persistencia de sesiones.
- Herramientas tacticas.
- Iluminacion.
- Empaquetado final para distribucion.

### Tecnologia propuesta

- Electron.
- Vite para desarrollo frontend rapido.
- TypeScript.
- React como UI base, salvo que se decida una alternativa antes de implementar.

### Estructura esperada

La estructura final puede ajustarse al scaffolding elegido, pero deberia separar claramente:

- Proceso main de Electron.
- Proceso renderer/frontend.
- Preload script si se necesita comunicacion segura.
- Assets estaticos.
- Documentacion de ejecucion.

Ejemplo tentativo:

```text
src/
  main/
    main.ts
    preload.ts
  renderer/
    App.tsx
    main.tsx
    styles.css
assets/
  logo/
    logo.png
package.json
```

### Logo inicial

Debe existir un logo inicial para validar carga de assets y primera identidad visual del proyecto.

Requerimientos del logo:

- Formato PNG.
- Fondo transparente si es posible.
- Debe representar una herramienta de mapas TTRPG con iluminacion o efectos.
- Debe funcionar en tamano pequeno dentro de una ventana inicial.
- Puede ser generado con IA o creado como placeholder propio.

El logo no es definitivo. Solo valida que el pipeline de assets funciona.

### Pantalla inicial

La ventana inicial debe mostrar:

- Logo del proyecto.
- Nombre tentativo: TTRPG Effects.
- Estado visible: "Bootstrap listo" o equivalente.
- Version inicial de la app, por ejemplo 0.0.0.

No debe convertirse en landing page. Es solo una pantalla tecnica de verificacion.

### Scripts requeridos

- `npm install`
- `npm run dev`

Opcionales para esta fase:

- `npm run build`
- `npm run lint`
- `npm run typecheck`

### Criterios de aceptacion

- Al ejecutar `npm run dev`, Electron abre una ventana.
- La ventana carga sin errores visibles.
- El logo inicial se ve correctamente.
- La app puede cerrarse normalmente.
- El repo contiene instrucciones basicas para correr el proyecto.
- El codigo inicial queda listo para implementar las specs siguientes.

### Riesgos

- Elegir un scaffolding que complique el empaquetado posterior.
- Mezclar demasiado pronto logica de producto con bootstrap tecnico.
- No configurar bien preload/IPC y tener que refactorizar al cargar archivos locales.

### Notas de implementacion

- Mantener el bootstrap pequeno.
- Evitar introducir librerias visuales pesadas antes de la motor visual.
- Preparar el proyecto para que PixiJS o el motor visual elegido pueda incorporarse sin reestructurar todo.
