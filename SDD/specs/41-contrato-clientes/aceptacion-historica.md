# Criterios de la entrega inicial — SDD 41

Rescatados el 2026-11-13 del expediente `001-contrato-clientes` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. El acceso por claves globales fue sustituido por cuentas e invitaciones (SDD 47–51), las cámaras por SDD 56 y la recuperación por SDD 58.

## Criterios conservados

1. Las APIs/resultados tienen una fuente común segura y las importaciones históricas siguen compilando, sin duplicar modelos de dominio.
2. App, PlayerApp, hooks y consumidores anidados operan con un cliente inyectado sin bridge. Si existe otro bridge, no recibe llamadas de esa raíz. Dos raíces no comparten llamadas/eventos.
3. Desmontar o cambiar cliente libera suscripciones anteriores; StrictMode no deja listeners extra. Renders ordinarios no reinician escena/canvas/dados.
4. En producción, la búsqueda de `window.ttrpg` solo encuentra la frontera de composición/compatibilidad; tests/labs pueden conservar sus accesos justificados.
5. Cliente/capacidades locales conservan operaciones existentes; ausencia de bridge mantiene UI/labs utilizables e indisponibilidad recuperable, sin operaciones simuladas o fallo al importar módulos.
6. `getAppInfo().version` coincide con `package.json` (`3.2.0` al cierre), incluido bundle preload; no queda `0.0.0` hardcodeado para esa información.
7. Cargar/guardar, selección/cancelación de imagen, bibliotecas, Player y dados siguen usando los canales reales; errores/cancelaciones y privacidad conservan su semántica.
8. Escenas existentes mantienen carga/guardado, mapas/enlaces y avisos de imágenes ausentes. No cambia la versión de formato.
9. Diseño, teclado (Escape, Delete/Backspace y escritura), drawers bajo 1100 px y proyección permanecen iguales. Player no recibe controles privados ni tiradas ocultas.
10. Labs siguen disponibles sin fixtures en producción. Matriz de paridad completa, versión/changelog y `build.md` registran resultados reales y limitaciones, sin operaciones Git ni DMG.

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/001-contrato-clientes/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/001-contrato-clientes/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/001-contrato-clientes/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
