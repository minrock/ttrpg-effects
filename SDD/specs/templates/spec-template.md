# NN — Nombre de la especificación

**Estado:** Propuesta. **Fecha:** AAAA-MM-DD. **Tipo:** funcionalidad / corrección / documentación.
**Dependencias:** specs SDD y decisiones relacionadas.
**Trabajo factory:** sin asignar o enlace al expediente. **Versión de entrega:** por determinar; fuente oficial en package.json.

## Problema y objetivo

Quién necesita el cambio, qué sucede hoy y qué resultado observable espera. Distinguir código existente de comportamiento propuesto.

## Alcance y exclusiones

Describir el delta respecto a las specs vigentes. Indicar efectos en navegador, Electron servicio y Electron local, y lo que se aplaza deliberadamente.

## Reglas y contratos

Roles/autorización, datos y ciclo de vida, errores/recuperación, concurrencia e idempotencia cuando aplique. Para UI: teclado, foco, tamaños, proyección y pérdida de acceso. Para sistemas: versión/bindings y retención. Para persistencia: ambos motores y migraciones.

## Criterios de aceptación

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-01 | Escribir resultado concreto ante un caso definido | Prueba o recorrido y evidencia esperada |

## Reutilización y compatibilidad

Puertos, módulos y specs que se reutilizan. Aclarar impacto en .ttrpgscene, paquete operativo, API, DB y clientes; no asumir que actualizar una versión reinterpreta datos existentes.

## Riesgos y decisiones pendientes

Separar bloqueo real de mejora futura. Registrar decisiones aceptadas con procedencia; no inventar autorizaciones.

## Entrega y evidencia

Enlazar `plan.md` del mismo directorio, guías afectadas y expediente cuando exista. Tras implementar, registrar criterio → resultado, límites de verificación y estado de Git. Conservar evidencia anterior cuando el contrato evolucione.
