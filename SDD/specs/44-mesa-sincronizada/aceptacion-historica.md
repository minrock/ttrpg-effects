# Criterios de la entrega inicial — SDD 44

Rescatados el 2026-11-13 del expediente `004-mesa-sincronizada` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. El acceso por claves globales fue sustituido por cuentas e invitaciones (SDD 47–51), las cámaras por SDD 56 y la recuperación por SDD 58.

## Criterios conservados

1. **Proyección pura:** fixture con dos mapas, secretos únicos en cada campo privado, token/luz/efecto ocultos, notas HTML/Markdown, fichas completas, enlaces, contadores y diccionarios URL. Serializar salida y comprobar ausencia de cada secreto; campos públicos/turnero/tarjetas sobreviven; entrada DM inmutable. Verificar raíz y `maps` coherentes y caso sin mapa.
2. **HTTP real con cookies separadas:** iniciar servicio temporal, login DM/jugador, abrir dos streams y publicar. Jugador recibe bootstrap y actualizaciones, no puede mutar escena/cámara principal/puntero/áreas/dados ni leer historial/bibliotecas aunque falsifique rol/query/contexto. Sesión anónima denegada. Inspeccionar bytes HTTP/SSE, no solo DOM.
3. **Assets reales:** subir distintas imágenes para mapa activo/inactivo, token visible/oculto, NPC publicado/privado y personaje en turnero. Jugador descarga únicamente conjunto vigente; resolver/GET/HEAD condicional no lo eluden. Cambiar mapa, ocultar y terminar combate revoca referencias, conserva las compartidas aún públicas. Incluir imagen de nota privada y datos originales de ruta/URL externa: nunca acceso implícito ni descarga del host.
4. **Orden y recuperación:** cortar stream después de una publicación mientras ocurre otra; reconectar obtiene último estado sin pérdida final. Duplicar IDs/eventos y entregar reportes fuera de orden; no retroceder escena/cámara ni ejecutar dos veces acciones. Repetir con cursor vencido y reinicio de servicio/época. Navegar mientras llegan ready/reportes antiguos no afecta contexto nuevo.
5. **Tiempo y dados:** reloj controlado prueba puntero/highlight vencido y restante, reanudación de replay/pose final y crítico sin reinicio, incluidos relojes cliente desplazados. HTTP begin/complete con respuesta perdida y reintento produce una única entrada/evento. Oculta no deja payload, aviso ni cambios públicos. Abierta sin/con resumen, show/hide posterior y dismiss respetan último contexto y rollId.
6. **Presencia y límites:** dos jugadores, principal desconecta/reconecta, promoción determinista, preview sin alternancia por reportes secundarios; logout/expiración cierra stream y revoca assets. Abrir/cerrar repetidamente no incrementa listeners, conexiones ni timers retenidos. Comprobar payload enorme, rate limit y consumidor lento con límites declarados.
7. **UI/adaptador:** todos los métodos en alcance mapean acciones/eventos reales, cleanup StrictMode, red caída/caducidad sin `unhandledrejection`, enlace sin credenciales, errores de imagen y publicación recuperables. Verificar teclado, foco, tamaño de ventana y herramientas locales Player conservadas en snapshot ordinario.
8. **Humo navegador real/API real:** contextos DM y jugador separados; publicar mapa, editar objeto, navegar a segundo mapa, cámara independiente/recentrado, puntero/área, tarjeta NPC y turnero con retrato, tirada abierta/oculta, cortar/restaurar conexión, recargar jugador, ocultar asset y cerrar sesión. Registrar navegador, runtime, pasos, resultados, capturas relevantes y consola/red. Mocks y labs no sustituyen este recorrido.
9. **Regresión y entrega:** mantener escenas/enlaces/importación/bibliotecas de 003 y modo Electron local. Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`, `pnpm build:web`; arrancar API/web con comandos entregados y comprobar build servido en producción local. Humo Electron con Player y dados cuando viable; registrar impedimento concreto si no se pudo ejecutar. Sin DMG.

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/004-mesa-sincronizada/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/004-mesa-sincronizada/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/004-mesa-sincronizada/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
