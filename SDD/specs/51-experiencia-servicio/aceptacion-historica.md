# Criterios de la entrega inicial — SDD 51

Rescatados el 2026-11-13 del expediente `011-experiencia-autenticacion` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. La recuperación de estado y la retención de una copia por escena se definen actualmente en SDD 58.

## Criterios conservados

| ID | Evidencia requerida |
| --- | --- |
| A1 — Cuentas | Admin crea dos DMs/cambio obligatorio, login sin selector, reset/disable/revocación; anónimo/DM no administran ni hay alta pública. Secretos ausentes de salida/storage. |
| A2 — Catálogo | Admin crea borrador/publica otra versión, cambia disponibilidad de versión/plantilla y observa retención/hash; DM no escribe ni borra. No acción de borrado. Nueva publicación no cambia partidas previas. |
| A3 — Sistema/viewport | Selección explícita e inmutable; A1/A2 con versiones distintas. Configuración y fichas exactas, edición retenida posible y copia/nuevo vínculo deshabilitado rechazados; privadas coincidentes no se sustituyen. Escena guardada no cambia calibración/diagonal; Player solo recibe manifest público. |
| A4 — Propiedad y datos | Dos DMsA/B con A1/A2/B1; UI/API/HEAD/resolve/export/bibliotecas/enlaces no filtran bytes/IDs privados. Admin no obtiene recursos. Cliente conserva CAS/bindings/idempotencia y conflictos no sobrescriben. |
| A5 — Aperturas | Continuar/reload/resume conservan generación; reabrir explícito cambia enlace/apertura. Frescura/gracia/deadline, pestañas, restart y republicación sin apertura automática. |
| A6 — Invitación | Fragmento eliminado antes de peticiones/opcionales, alias Unicode/repetidos y cookie por path; recarga mantiene ID. Entrada pegada Electron mismo origen; enlace inválido/ausente/caducado/host en gracia y copia denegada tienen acciones reales. |
| A7 — Moderación | Tres invitados, dos con mismo alias: confirmar objetivo correcto, revocarHTTP/SSE/assets/dados/limpiar UI; sobrevivientes conservan IDs/cookies/cámara. Viejo enlace falla/nuevo admite; presencia/roster no revelan lista a invitados. |
| A8 — Incertidumbre/terminales | Respuesta perdida/replay de admission/rotate/kick sin efectos duplicados ni URL inventada. OPENING_CHANGED/access-ended/replaced/unavailable limpian/detienen según contrato; respuesta tardía no repuebla y otra partida no se limpia. |
| A9 — Borradores/teclado | 401/red/cambio cuenta o partida/guardar fallido/cierre nativo protegen estado solo del mismo ID. Portales/atajos no eluden guard. Escape/foco/clipboard/modales/200% y tamaños especificados verificados visualmente. |
| A10 — Corte y setup | Artefacto start:api carga.env sin claves globales, antiguas rutas/cookies nunca autorizan. Setup real conserva valores/secretos, crea estructura interna privada ignorada y no cuenta automática. Rutas inválidas/env privado no se sirven/empaquetan. |
| A11 — Motores/operación | Servicio final compilado en SQLite local y PostgreSQL production/TLS reales, sin SQLite auxiliar/skip. Segundo runtime rechazado y pérdida de lock cerrada; backup/restore integral con cookies antiguas rechazadas antes de servir y contenidos/owners conservados. |
| A12 — Clientes/compatibilidad | Navegador y Electron servicio completan DM/invitado contra API real; Electron local conserva mapas/bibliotecas/plantillas/Player sin servidor. Formato v1/v2 y builds independientes, sin Node/DB/secretos en grafo web. |
| A13 — Entrega/cierre | Versión/changelog/docs vigentes, cuatro revisiones y decisión; después main habitual/servicio preparado/salud+HTML/recorrido, datos fuente preservados y DMG postmerge. Distinguir build aceptado de cierre operativo efectivamente terminado. |

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `5a074b5209bc8a978f69ad7f5660643ec794ec6c`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/011-experiencia-autenticacion/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/011-experiencia-autenticacion/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/011-experiencia-autenticacion/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
