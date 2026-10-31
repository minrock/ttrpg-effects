# Coordinación de 008

007 finalizó con cuatro aprobaciones en ronda 1 y decisión APROBAR. Se conserva evidencia histórica congelada007; sus huellas identifican esa entrega y no deben compararse como si008 no añadiese cambios. La base de008 se capturó antes de su constructor.

Constructor: `/root/constructor_008`. Rama efectiva `feature/factory-006-persistencia-multidb`, mismo checkout aislado autorizado en solicitud. Sin commits ni merge. Prerrequisitos originales: diez archivos comprobados sin alteraciones al terminar revisión007; no se leyeron env privados.

PostgreSQL temporal compartido preparado, con clientes oficiales de dump/restore; acceso privado indicado en solicitud. El constructor solo elimina sus fixtures. El orquestador mantiene infraestructura hasta terminar011 o un bloqueo que cierre la ejecución.

El timeout aislado de un gate007 quedó registrado en revisión de seguridad; dos ejecuciones independientes posteriores pasaron25/25. Para evitar competencia innecesaria de KDF, coordinar gates costosos entre revisores.

## Cierre de ronda1 y corrección autorizada

2026-10-30: terminaron los cuatro revisores; seguridad CAMBIOS (catálogo prestado sin owner cerrado; publicación observable antes de commit), UX CAMBIOS (revisión obsoleta, presupuesto de idempotencia, diagnóstico CLI), código CAMBIOS (plantilla referenciada borrable y transferencia incoherente), UI APROBADO. Huellas intactas antes de reanudar. Mismo constructor realiza la corrección prevista del ciclo1; no se inicia ciclo nuevo ni tercera ronda.

El gate de identidad del revisor código falló una vez al conectar TLS para limpieza, después pasó25/25. El orquestador encontró una única base residual `ttrpg_test_72295d4f0579493f8865bdf9ea0dfadf` sin conexiones; contrastó el inventario cero al cierre de construcción y ausencia de gates activos y retiró exclusivamente esa fixture. No se cambió configuración ni se detuvo PostgreSQL.

## Ronda 2

Constructor terminó, build actualizado y huellas nuevas congeladas. Se crearon seguridad_008_r2 y ux_008_r2. La herramienta rechazó crear ui_008_r2 y reactivar ui_008_r1 con «agent thread limit reached». Se reactivó correctamente codigo_008_r1 para una revisión nueva de código en ronda2; UI se reintentará cuando termine una tanda. No se omite ningún rol ni se convierte el límite en aprobado.

## Cierre de la segunda ronda — 2026-10-30

Los cuatro revisores finalizaron y publicaron informes válidos. UI pudo reactivarse después de terminar UX; el límite temporal de agentes quedó resuelto. Seguridad, UX y UI: APROBADO. Código: CAMBIOS por carrera entre borrar una plantilla y crear un monstruo que la referencia dentro de una misma transacción autorizada con Promise.all. La reproducción independiente usa SQLite físico, BetterAuth y DM real; ambos métodos confirman y exportOwned posteriormente rechaza TEMPLATE_MISSING. No se atribuye reproducción PostgreSQL no realizada.

El orquestador leyó los cuatro informes, verificó las 586 huellas sin cambios y actualizó los chips. La ejecución independiente de Seguridad pasó 32/32 contratos en ambos motores; ese resultado no invalida la reproducción adicional de Código. No hay decisión técnica APROBAR de 008 ni autorización para construir sus dependencias 009–011 antes de resolver esta condición.

Se registró necesita-persona y se solicitó explícitamente rehacer 008 para corregir la invariante transaccional, añadir regresión en ambos motores y repetir el ciclo. Motivo de la consulta: límite de dos rondas por ciclo de la skill factory. Hasta recibir respuesta no se reanuda el constructor ni se modifica código. Continúa vigente la prohibición de commits y merge.

Al cerrar esta ejecución pendiente de respuesta, se detuvo exclusivamente PostgreSQL temporal propio y se eliminaron su runtime, socket, configuración privada y herramientas temporales de respaldo. Se conservan logs y recetas. Reaprovisionar un clúster temporal nuevo antes de nuevos contratos PostgreSQL; las rutas previas ya no están activas. No se detuvieron API8787 ni dashboard8765 originales.

## Reanudación autorizada — ciclo 2

2026-10-30. Usuario autoriza nueva política: administrador publica versiones y solo deshabilita, no borra plantillas; existentes conservan lectura y reglas. Solicitud y retrabajo-ciclo-2.md registran alcance, spec/build-ciclo-1.md preservan historia. Nuevo especificador reconcilia antes de construir.

PostgreSQL temporal nuevo: 17.10, loopback 55813, runtime `/private/tmp/ttrpg-auth-pg-dsjc6ze6`, socket `/tmp/pgs-j__fvjqk`. Paquete verificado SHA512; bibliotecas rehidratadas según manifiesto del paquete después de detectar enlaces ausentes. initdb/start correctos; conexión real pg con CA y rejectUnauthorized confirmó TLSv1.3. Configuración privada0600 en /tmp/ttrpg-auth-pg-env.json, wrapper vigente /tmp/ttrpg-auth-pg-run.py. No imprimir credenciales. Clientes pg_dump/restore del ciclo anterior fueron eliminados; no atribuirlos a esta preparación.

## Ronda global 3 — ciclo 2

Constructor original terminó y publicó build.md final. Se abrió ronda3 con identidad/diff/huellas; código congelado. Revisores independientes reactivados: seguridad_008_r2 (Seguridad, ventana inicial de gates PostgreSQL), codigo_008_r1 (Código, inspección/SQLite propios hasta liberar PG) y ux_008_r2 (UX). UI se ejecutará al liberar cupo. No se reanuda constructor hasta cuatro informes válidos y cuatro agentes terminados.

Resultados de construcción atribuidos al constructor: propiedad40/40, DB32/32, identidad25/25, general1201/1201; typecheck/lint/builds API/web/Electron correctos. Resultado final dirigido de presupuesto2/2 complementa suite completa y no sustituye motores. Fallos y correcciones intermedios preservados en build. Auditoría PG final0bases/0conexionesfixtures; servidor de pruebas activo.

## Corrección de ronda 3 dentro de ciclo 2

Finalizaron los cuatro revisores: Seguridad/Código CAMBIOS; UX/UI APROBADO. Se leyeron los cuatro informes y comprobaron591huellas intactas. Tres hallazgos únicos: validación de exportación ignora presentaciones nuevas válidas del catálogo; rechazo falsy capturado no marca irrevocablemente fallo de la unidad; catálogo aceptado puede superar el límite agregado de1MiB del manifiesto de transferencia. Seguridad reprodujo los dos primeros en SQLite y PostgreSQL; Código los dos problemas de transferencia en SQLite. No se atribuye explotación HTTP o fuga de datos no demostrada.

Se reanuda el constructor original para la corrección prevista de este ciclo, sin autorización adicional, misma rama y sin commits/merge. Debe leer los CUATRO informes completos, resolver las causas y agregar regresiones en ambos motores. La corrección de tamaño debe contemplar crecimiento acumulado y definiciones ya admitidas, no solo elevar arbitrariamente el límite para pasar un ejemplo. Mantener lectores v1/paquetes anteriores válidos, referencias exactas, privacidad, cancelación/rollback y límites físicos. El manejo de rechazo necesita estado independiente del valor, primer motivo preservado o normalizado, y ninguna excepción posterior puede borrar el fallo.

build-ronda-3.md conserva la construcción revisada. Próxima ronda global4 es la segunda del ciclo2. No alterar spec ni rondas cerradas. PG libre y activo; solo constructor usa gates hasta finalizar.

## Ronda global 4 — segunda del ciclo 2

Constructor finalizó la corrección y publicó build.md: propiedad46/46, identidad25/25, DB32/32, general1201/1201 y builds/typecheck/lint correctos, evidencia atribuida al constructor. Código congelado con nuevas huellas. Se reactivaron Seguridad, Código y UX independientes; UI se activa al liberar cupo. Seguridad tiene ventana inicial exclusiva PostgreSQL, los demás no compiten con gates de identidad. No reanudar construcción durante esta ronda ni abrir una tercera automática. Los diez prerrequisitos del checkout original siguen intactos. Sin commits/merge.

Los cuatro revisores de ronda4 terminaron y publicaron APROBADO. El orquestador leyó los cuatro informes y verificó las593huellas intactas. Seguridad repitió6/6 regresiones en ambos motores; Código hizo probes SQLite propios y UX cinco inspecciones CLI; UI verificó ausencia de impacto visual por huellas/consumidores. Ventana PG liberada. Se creó aprobador_008_c2 para decisión técnica independiente; no hay integración autorizada.

## Cierre técnico de 008 — 2026-10-30

Aprobador independiente publicó APROBAR para ciclo 2/ronda 4. El orquestador leyó la decisión y comprobó de nuevo las 593 huellas intactas. Sin hallazgos pendientes. Etapa necesita-persona únicamente por la instrucción vigente de no hacer commits ni merge; no se solicita levantar esa restricción. Versión 3.10.0, misma rama/HEAD. Backlog permanece sin marcar integrado. Las dependencias 009–011 conservan sus expedientes pendientes; esta ejecución cierra el alcance 008 solicitado.

Auditoría propia final: PostgreSQL 17.10, cero bases y conexiones de fixtures. Tras terminar todos los agentes se detuvo y retiró exclusivamente el clúster temporal /private/tmp/ttrpg-auth-pg-dsjc6ze6, su socket y configuración privada. Las rutas privadas anteriores ya no están activas; reaprovisionar antes de otros contratos PostgreSQL. Se conservan recetas y logs. Dashboard original sigue disponible; no se tocaron API, env ni datos originales.
