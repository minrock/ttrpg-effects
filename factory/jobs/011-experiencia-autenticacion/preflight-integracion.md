# Preflight de integración y retorno al checkout habitual — 011

Fecha:2026-10-31. **Solo inspección y propuesta; no ejecuta integración ni corte.** Constructor011 sigue activo. La aceptación técnica, congelación y transferencia de011 todavía corresponden a su flujo de fábrica. Única escritura de este integrador:este informe en el checkout de integración. No se ejecutaron git add/commit/stash/switch/checkout/reset/clean,ni se tocó producto,PG,servicios o configuración privada.

Se leyeron solicitud,spec y coordinación011,AGENTS/skillfactory y perfiles de constructor/aprobador. Prevalece la autorización vigente de cierre local aprobada por usuario,pero este encargo permite únicamente preflight. Los comandos siguientes son un plan para después de cuatro revisiones y decisión APROBAR.

## Estado comprobado

| Checkout | Rama/HEAD actual | Condición |
| --- | --- | --- |
| /Users/minrock/Projects/ttrpg-effects | feature/configuracion-env,e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3 | Dos archivos tracked modificados y133no rastreados visibles; índice sin cambios preparados. |
| /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects | feature/factory-006-persistencia-multidb,e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3 | Constructor011 activo; no copiar,revertir,congelar ni cambiar su rama. |
| /Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects | main,73b8e6de21af74912d23399f1b99f3c1112ade91 | Limpio al comenzar preflight; main ocupado aquí. Este informe queda después como único documento nuevo. |

La referencia main sigue en73b8e6d. Al cerrar011 debe usarse el SHA final aceptado/integrado,que todavía no existe. No se puede cambiar el checkout habitual a main mientras main siga asignado al checkout de integración.

## Colisiones verificadas contra main actual

Hay132archivos no rastreados del checkout habitual cuyo nombre ya existe en main.126son idénticos byte a byte;6difieren:

| Ruta | Situación y conservación |
| --- | --- |
| .env.example | Plantilla histórica3.7,no archivo privado; copia del respaldo vigente coincide con la actual. Conservar como historial,no sustituir plantilla aprobada nueva. |
| scripts/setup-env.sh | Script histórico3.7; respaldo coincide. Preservar también modo ejecutable0755,que la copia privada0600 no conserva como permiso de ejecución. |
| src/server/environment-setup.test.ts | Test histórico3.7; respaldo coincide. No reaplicar sobre tests nuevos. |
| factory/jobs/010-moderacion-tiempo-real/integracion.md | Reflejo local diferente del cierre versionado. Conservar y comparar como evidencia; no sobrescribir cierre aprobado. |
| factory/jobs/011-experiencia-autenticacion/coordinacion.md | Documento vivo del orquestador más reciente que main. Incorporación futura solo por coordinación y revisión de su contenido final. |
| factory/jobs/011-experiencia-autenticacion/solicitud.md | Autorización/estado del orquestador más reciente que main. Mismo tratamiento que coordinación. |

El archivo no rastreado restante es factory/jobs/011-experiencia-autenticacion/base-archivos.json:su nombre aún no existe en main actual. Debe conservarse; probablemente será parte del expediente final011,pero no se infiere esa igualdad hasta comparar el SHA aprobado.

Tracked modificados:factory/board.json yfactory/backlog.md. Backlog actual ya coincide con main;board difiere y refleja estado posterior. Ambos pertenecen al orquestador. Los otros archivos tracked de producto diferentes de main están limpios respecto a HEAD antiguo:son actualizaciones esperadas al cambiar de rama,no modificaciones locales que deban reaplicarse.

**Caso ignorado adicional:** .env.electron.example existe,es idéntico al archivo de main y está ignorado por el .gitignore antiguo. No aparece entre los133untracked visibles. Debe incluirse en la conservación explícita; no confiar en la opción predeterminada de Git que puede sobrescribir archivos ignorados al cambiar de rama.

Comprobación no modificadora ejecutada: `git read-tree --dry-run -m -u HEAD main`, salida128,primer bloqueo:archivo no rastreado .env.example sería sobrescrito. La ayuda local confirma que --dry-run no actualiza índice ni árbol. Esto prueba que el cambio directo no está listo; no es una simulación de haberlo realizado. Se comprobó después que ramas/índice/árbol seguían sin escrituras de este agente.

## Respaldo y privados:verificación sin contenido

Respaldo preventivo existente: `/Users/minrock/Projects/ttrpg-effects/.local/service/backups/pre-integracion-20261031-084641`. Se leyó únicamente su manifiesto de metadatos y se calcularon hashes,no se mostraron contenidos privados. Sus7copias coinciden con las7huellas registradas;directorios0700,archivos0600,sin enlaces simbólicos. No es respaldo de bases.

Comparación con originales actuales: .env,.env.electron,.env.example,setup-env.sh yenvironment-setup.test.ts siguen idénticos a sus copias. Board ybacklog han cambiado desde el respaldo:el respaldo no está corrupto,está desactualizado para esos dos documentos. Tampoco cubre los tres documentosfactory de las seis colisiones que llegaron después,el resto de reflejos no rastreados ni la provisión privada posterior.

.env,.env.electron y.local/service/provisioning.json son archivos regulares0600,ignorados y no rastreados. .local,.local/service ydata/backups/logs son directorios0700,sin symlinks. No se leyó email,contraseña,URLprivada,configuración de conexión ni contenido de datos. No se incorporan huellas privadas ni contenidos del respaldo a este informe.

Main actual no rastrea .env,.env.electron ni.local/. Antes del cierre011 verificar esto otra vez y confirmar la regla versionada /.local/ además de exclusionesenv. La exclusión local previa ya protege .local;no debe retirarse anticipadamente.

## Secuencia propuesta para el cierre autorizado

1. **Finalizar aceptación011 en su flujo.** Cuatro APROBADO,decisiónAPROBAR,huellas finales,checks y evidencia real. Integrar el producto exacto en checkout separado desde main actualizado conforme a skill. Si main avanzó,reconciliar y repetir revisiones exigidas. No copiar producto en construcción ni inferir aprobación de este preflight. Hacer commit/ffmain yDMG según contrato;registrar SHAfinal. Cerrar los documentos que deban quedar enmain antes de liberar ese checkout.

2. **Reinventariar el checkout habitual contra ese SHAfinal.** Repetir estado,índice,worktrees,tipos/permisos/hash y comparación de todas las rutas ocupadas del árbol objetivo,incluidas ignoradas. No reutilizar ciegamente los conteos6/132/133porque el orquestador sigue actualizando expedientes. Exigir ausencia de envprivados/.local enárbolobjetivo. Separar archivos idénticos,diferentes yprivados;comprobar symlinks yprefijos archivo/directorio. Si aparecen cambios locales ajenos,no descartarlos:resolver su conservación antes de continuar.

3. **Crear respaldo nuevo inmutable de cierre.** En directorio privado nuevo debajo de.local/service/backups,conservar las2modificacionestracked,los133untrackedactuales yla plantilla ignorada .env.electron.example,además de configuración privada necesaria por el responsableoperativo. Preservar estructura,contenido ymetadata de modo original enmanifiesto;copias privadas0600/directorios0700. Comprobar hashes contra cada original antes de retirar rutas. Conservar respaldoanterior sin sobrescribirlo. Registrar tambiénbranch,HEAD,mainfinal y lista exacta. No publicar contenido/huellasprivadas. Mantener provisión,destino preparado ytodo.local en su sitio,ignorados. Antes de recompilar encheckout habitual,conservar también el out anterior necesario para retorno del servicio;el respaldo preventivo7archivos no incluye ese artefacto niDB.

4. **Apartar reversiblemente solo archivos locales inventariados.** Propuesta:stash acotado de2tracked+133untracked visibles mediante `git stash push --include-untracked -m <etiqueta-de-cierre> -- <lista-explícita-revalidada>`. No usar --all,git add general,reset/clean ni rutas privadas. Verificar primero que la lista contiene únicamente documentos/código permitido,no.envprivado ni.local. Guardar el OID real de refs/stash y comprobar que sus objetos conservan las rutas/hash esperados. Mantener ese stash;no pop/apply/drop automático sobremain. La plantilla ignorada .env.electron.example no entra en-u:tras respaldo verificado,apartarla por renombrado a una ubicación privada nueva conservando su original;no mover.env ni.env.electron. Este paso solo se hará con autorización de cierre vigente y después de confirmar que orquestador dejó de escribir los reflejos locales durante la transición.

5. **Liberar main sin moverlo.** Con el checkout de integración limpio y suHEAD igual alSHAfinal,ejecutar allí `git switch --detach <SHAfinal>`;confirmar con git worktree list que main ya no está asignado. Esto conserva main y la referencia de la rama feature;no usa update-ref,force,worktree remove ni cambios del checkout constructor.

6. **Cambiar el checkout habitual de forma protegida.** Repetir el dry-run contraSHAfinal después de apartar colisiones y confirmar cero bloqueos;usar `git switch --no-overwrite-ignore main` en la carpeta habitual. Si Git detecta una ruta ignorada o cambio inesperado,detener ese paso y conservar los respaldos,no usar-f. Verificar branchmain,HEADequalSHAfinal,índice/árboltrackedlimpios yhuellas de producto aprobadas. Comprobar porhash ymetadata que.env,.env.electron,provisión ydatos privados siguen intactos. No reaplicar el stash antiguo sobremain:los cambios históricos3.7ya están superados y los registros actuales deben entrar por el orquestador. Conservar respaldo/stash para recuperación selectiva ytrazabilidad.

7. **Preparación operativa posterior y separada.** Instalar conpnpmfrozen ycompilar enproductoaceptado,usando los comandos reales finales011. No usar setup para regenerar secretos ni convertir datos automáticamente. Coordinar con responsableoperativo el corte de8787:detener solo proceso propio verificado cuando corresponda a copia consistente,respaldarDB ysidecars conCLIreal,conservarfuente,prepararcuentas/propietarioDMdestino,migrar/adoptar/verificar antes de apuntar.env. La aceptación011,la configuración preparada yel respaldo actual no acreditan que ese corte haya ocurrido. MantenerPGyservicios ajenos fuera del alcance. Salud,HTML,recorrido real yretorno pertenecen al cierre operativo,con evidencia separada.

## Retorno y límites

Si stash/renombrado/dry-run/switch falla,conservar OID ycopias,no ejecutar limpieza automática. Antes del switch seguir en feature/configuracion-env y reponer únicamente las rutas propias desde el respaldo verificado si es necesario. Después del switch,un retorno de código exige coordinación:liberar main si corresponde,cambiar limpiamente a la rama anterior yrestaurar selectivamente su estado usando el stash/copia,no sobreescribir producto nuevo por encima. Los envprivados siguen fuera de Git. El retorno del servicio además requiere versióncompilada/configuración/datosanteriores verificados ydebe considerar escriturasposteriores;no equivale a cambiar rama.

Este plan está comprobado contra el estado actual ymarca las verificaciones obligatorias que dependen delSHAfinal011. No garantiza deantemano un árbol todavía en construcción ni un corte sin reinspección. No se tocóPG,API8787,dashboard ni procesos deQA. El trabajo del constructor continúa sin congelación.

## Comprobación final del preflight

El inventario que deberá conservarse suma **136 rutas**: 133 no rastreadas visibles, dos tracked modificadas y la plantilla ignorada adicional. Todas son archivos regulares según lstat; no hay symlinks en ese conjunto. Se volvió a confirmar HEAD habitual e1fd3ee y main 73b8e6d. La ayuda del Git instalado confirma `--no-overwrite-ignore` y que sobrescribir ignorados es la conducta predeterminada; por eso el plan exige la opción protectora. Solo se consultó la ayuda, no se cambió ninguna rama.

Al terminar, el checkout de integración conserva main 73b8e6d y únicamente este informe nuevo sin preparar. El checkout habitual, los archivos privados, servicios y constructor no recibieron escrituras de este agente.
