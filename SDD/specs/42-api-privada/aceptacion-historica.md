# Criterios de la entrega inicial — SDD 42

Rescatados el 2026-11-13 del expediente `002-api-privada` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. El acceso por claves globales fue sustituido por cuentas e invitaciones (SDD 47–51), las cámaras por SDD 56 y la recuperación por SDD 58.

## Criterios conservados

1. API compilada arranca con Node 24 sin proceso ni import runtime de Electron. Salud muestra la versión real; configuración insegura/incompleta falla de forma útil sin secretos.
2. Login DM y jugador crea sesiones de rol correcto; cambiar `role` en payload/cookie no eleva privilegios. Expiración y logout invalidan peticiones posteriores. Rotación, cookie y límites verificados.
3. Matriz HTTP real de anónimo/DM/jugador para cada familia: 401 anónimo, 403 jugador, éxito DM; salud/login y sesión/logout son excepciones explícitas. Rechazo de origen ausente/inesperado en mutaciones, de Host inesperado y de credenciales inválidas.
4. CRUD de escenas y búsqueda/guardado de las tres bibliotecas y plantillas funciona y sobrevive a reinicio. La eliminación de escena es observable y no elimina imágenes compartidas.
5. Importar fixtures v1/v2 preserva datos y migración existente. Exportación parsea con `parseSceneJson`; escenas sin mapas/JSON inválido/versión futura fallan sin escritura parcial. Documentos multi-mapa conservan referencias e imágenes de todos sus mapas.
6. Una referencia a un archivo real externo, una URL remota o un enlace legacy no provoca lectura ni fetch del host. Se informa ausencia; upload + PUT la resuelve sin cambiar geometría, calibración ni IDs.
7. Imágenes válidas se sirven con MIME verificado y bytes idénticos; SVG/HTML, MIME falso, truncados, tamaño excesivo y upload interrumpido son rechazados sin publicar recurso. Jugador no obtiene asset privado por ID conocido.
8. Traversal simple, codificado y doblemente codificado, separadores, IDs inválidos, symlinks y nombre sugerido malicioso no permiten leer/escribir fuera del directorio. Se comprueba con archivo centinela externo.
9. Pruebas de cuerpos con y sin Content-Length, límites, consultas inválidas, SQL como texto, escrituras concurrentes y fallo de persistencia prueban errores útiles y estado anterior válido. Tras reinicio se recuperan todos los recursos confirmados.
10. Guía del servidor contiene variables, comandos, proxy/HTTPS, sesión/expiración, almacenamiento/respaldo, límites, todas las rutas/DTO/errores y ejemplos redactados sin claves reales. 003 puede implementar adaptador sin inferir endpoints; 004 identifica dónde extender autorización de assets.
11. Electron local conserva contratos y comportamiento; no se expone fs/Electron en tipos compartidos ni se agrega credencial al renderer. CI local común y build/start API pasan con evidencia real.

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/002-api-privada/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/002-api-privada/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/002-api-privada/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
