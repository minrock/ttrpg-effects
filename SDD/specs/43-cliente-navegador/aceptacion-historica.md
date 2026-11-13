# Criterios de la entrega inicial — SDD 43

Rescatados el 2026-11-13 del expediente `003-cliente-navegador` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. El acceso por claves globales fue sustituido por cuentas e invitaciones (SDD 47–51), las cámaras por SDD 56 y la recuperación por SDD 58.

## Criterios conservados

1. **Adaptador:** pruebas de rutas/payloads/resultados contra contrato real; cookies de mismo origen; JSON inválido, 401/403/404/413/5xx y fallo de red; cancelación de selector; respuesta obsoleta; ausencia de éxito en funciones pendientes. Verificar URLs/referencias maliciosas y que rutas locales no provocan lectura del servidor.
2. **Integración HTTP real:** servidor temporal y almacenamiento aislado; login DM, guardar/cargar/exportar/importar, subida/lectura de imagen, bibliotecas/plantillas, enlaces, sesión jugador denegada y logout. Reiniciar servidor y volver a abrir una escena con sus assets para demostrar persistencia. No usar solo mocks para afirmar funcionamiento del servicio.
3. **UI automatizada:** acceso válido/fallido, carga inicial de sesión sin destello privado, permisos por rol, selector vacío/error/confirmación/cancelación, cambios sin guardar, sesión expirada, estado de capacidades pendientes y logout. Cubrir selección/reemplazo de imagen con conservación del mapa ante fallo/cancelación y foco/teclado de los nuevos diálogos.
4. **Regresión existente:** mantener pruebas de App/PlayerApp, reemplazo de imágenes, herramientas locales, bibliotecas y labs. La matriz de documentación cita pruebas para cada capacidad y marca limitaciones verificadas, especialmente los métodos reservados a 004.
5. **Navegador real contra API real:** registrar navegador/runtime y tamaños usados; acceder DM, subir un mapa, editar una medida/luz y nota con imagen, guardar, recargar y cargar desde selector; importar/exportar escena, probar imagen ausente y reemplazo de un mapa inactivo; abrir sesión jugador en contexto independiente y comprobar ausencia de datos DM; verificar logout y fallo de red recuperable. Registrar capturas/evidencias de los estados importantes y errores de consola/red. No sustituir esta comprobación por screenshots de un lab o DOM simulado.
6. **Electron local/labs:** humo viable con abrir mapa, guardar/cargar, Player View y al menos un lab; registrar limitación concreta si el entorno impide una comprobación. No declarar realizada una prueba que no se ejecutó.
7. **Comandos:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`, `pnpm build:web`, y arranque verificable mediante `pnpm dev:api`/`pnpm dev:web` y el servidor de producción de 002 sirviendo el build. Ajustar solo los nombres API a los efectivamente entregados por 002 y documentarlos. No generar DMG.

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/003-cliente-navegador/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/003-cliente-navegador/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/003-cliente-navegador/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
