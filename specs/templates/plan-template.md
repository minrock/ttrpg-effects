# Plan de implementacion tecnica - [NN - Nombre del spec]

## 1. Resumen

- **Spec fuente:** `./specs/[NN-nombre-del-spec]/[NN-nombre-del-spec].md`
- **Objetivo:** [Resultado tecnico y funcional que debe quedar implementado.]
- **Estado:** [Draft | En progreso | Implementado | Bloqueado]
- **Prioridad:** [Alta | Media | Baja]
- **Dependencias:** [Specs, decisiones tecnicas, assets, librerias o tareas previas.]

## 2. Alcance

### Incluido

- [Comportamiento, modulo o flujo que se implementara.]
- [Cambios visibles para usuario.]
- [Cambios internos necesarios.]

### Fuera de alcance

- [Trabajo relacionado que no se hara en este plan.]
- [Futuras mejoras o decisiones aplazadas.]

## 3. Decisiones tecnicas

- **Arquitectura:** [Como se preservan las fronteras entre domain, application, infrastructure, renderer, main, preload y render.]
- **Persistencia:** [Si aplica: repositorios, SQLite, archivos `.ttrpgscene`, migraciones.]
- **IPC / Electron:** [Canales, validaciones, preload API, restricciones de seguridad.]
- **Render / PixiJS:** [Adapters, capas, coordenadas, limpieza de recursos.]
- **Validacion:** [Schemas, errores recuperables, datos externos.]
- **Dependencias nuevas:** [Ninguna o justificacion concreta.]

## 4. Diseno de dominio

- **Entidades / tipos:** [Tipos centrales nuevos o modificados.]
- **Reglas puras:** [Calculos, validaciones o invariantes testeables sin React/Electron/PixiJS.]
- **Coordenadas / unidades:** [Mundo, pantalla, mapa, grilla, escala, zoom, pies/metros.]
- **Errores de dominio:** [Casos invalidos y mensajes esperados.]

## 5. Cambios por capa

### `domain`

- [Archivos o modulos a crear/modificar.]
- [Reglas y tests unitarios esperados.]

### `application`

- [Casos de uso o servicios.]
- [Interfaces/puertos requeridos.]

### `infrastructure`

- [Repositorios, DB, filesystem, assets, migraciones.]
- [Validaciones contra datos externos.]

### `main`

- [Ventanas, IPC handlers, dialogos, servicios nativos.]
- [Controles de seguridad Electron.]

### `preload`

- [API expuesta al renderer.]
- [Tipos compartidos y funciones por accion.]

### `renderer`

- [Componentes, hooks, estado visual local, paneles, menus.]
- [Integracion con casos de uso o preload API.]

### `render`

- [Adapters PixiJS, capas, herramientas, conversiones pantalla/mundo.]
- [Limpieza de texturas, sprites y listeners.]

## 6. Plan de trabajo

1. [Paso tecnico verificable.]
2. [Paso tecnico verificable.]
3. [Paso tecnico verificable.]
4. [Paso tecnico verificable.]

## 7. Testing y verificacion

- **Unit tests:** [Dominio, calculos, serializacion, validaciones.]
- **Integration tests:** [Casos de uso, repositorios, IPC si aplica.]
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** [Flujo a probar en `pnpm dev`, Electron o UI.]

## 8. Riesgos y mitigaciones

- **Riesgo:** [Descripcion.]
  **Mitigacion:** [Como se reducira o verificara.]
- **Riesgo:** [Descripcion.]
  **Mitigacion:** [Como se reducira o verificara.]

## 9. Criterios de aceptacion

- [Criterio observable y verificable.]
- [Criterio observable y verificable.]
- [Criterio tecnico: tests, typecheck, lint o build.]

## 10. Documentacion afectada

- [Specs o docs que deben actualizarse.]
- [Decisiones tecnicas que deben quedar registradas.]

## 11. Checklist de cierre

- [ ] Implementacion completada dentro del alcance.
- [ ] Tests relevantes agregados o actualizados.
- [ ] `pnpm typecheck` ejecutado.
- [ ] `pnpm lint` ejecutado.
- [ ] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [ ] Documentacion actualizada si cambio una decision.
- [ ] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [ ] Sin dependencias nuevas no justificadas.
