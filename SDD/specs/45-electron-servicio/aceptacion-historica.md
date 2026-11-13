# Criterios de la entrega inicial — SDD 45

Rescatados el 2026-11-13 del expediente `005-electron-servicio` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. El acceso por claves globales fue sustituido por cuentas e invitaciones (SDD 47–51), las cámaras por SDD 56 y la recuperación por SDD 58.

## Criterios conservados

| Comprobación | Resultado observable requerido |
| --- | --- |
| Configuración | Sin variables sigue local; modo servicio exige URL válida; matriz de protocolos, credenciales, hostname engañoso, puertos, IPv4/IPv6 y HTTPS rechaza/acepta lo previsto sin fallback privilegiado. |
| Composición Electron | Pruebas de composición confirman ausencia de preload, IPC, almacenamiento y protocolo local en servicio; flags seguros y sesión aislada. Local conserva esos componentes solo para su renderer. |
| Navegación y permisos | Con ventana Electron real, un servidor de prueba intenta redirección externa, navegación a `file:`, popup y permisos; se bloquean. Inspección en renderer confirma ausencia del bridge/Node. Un mock de BrowserWindow no sustituye esta evidencia. |
| Electron local | Abrir mapa, editar, guardar/cargar `.ttrpgscene` temporal, recientes/biblioteca, abrir Player, cámara, puntero y tirada abierta/oculta funcionan sin servicio ni claves. |
| Web DM + jugador | Sesiones independientes contra API real: DM sube mapa, guarda/carga escena y publica; jugador ve solo publicación. Cámara/puntero/áreas/dados abiertos llegan, notas privadas, mapas inactivos, assets privados e historial/dados ocultos no llegan. Reconexión retoma estado sin duplicar efectos. |
| Electron servicio | Carga el build web real sin bridge; DM guarda/carga/importa/exporta y publica hacia jugador web. Repetir cliente Electron autenticado como jugador con DM web; no obtiene capacidades privadas. No compartir cookie DM entre contextos de prueba. |
| Fallos | Arranque con servicio caído permite reintento exitoso; fallo de red durante edición no elimina cambios; expiración/logout y reconexión respetan contrato y no dejan datos privados visibles al cambiar rol. |
| Operación | API y web compilados arrancan sin dev server/Electron, conservan datos al reiniciar y un backup restaurado recupera escena, imagen y entrada de biblioteca. API desconocida/asset ausente no reciben HTML del fallback. |
| Compatibilidad | Fixture v1/v2, múltiples mapas y enlaces mantienen datos; imágenes locales ausentes se informan y pueden reemplazarse. No hay nueva versión de formato. |
| Entrega | Comandos comunes y builds API/web pasan; guía y matriz coinciden con resultados; versión 3.6.0 y changelog correctos; sin Git write, despliegue ni DMG. |

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/005-electron-servicio/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/005-electron-servicio/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/005-electron-servicio/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
