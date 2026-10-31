# Integración local 010 — 3.12.0

Fecha:2026-10-31. Estado:producto incorporado en main y DMG verificado; cierre del tablero/commit documental a cargo de coordinación. Autorización en integracion-solicitud.md; usuario ordenó dejar las entregas aprobadas en main. Orquestador preparó board/backlog y autorizó la continuación antes del commit. Sin push ni despliegue.

## Identidad y aislamiento

Fuente:/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects, rama acumulativa feature/factory-006-persistencia-multidb. Destino:/Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects. Main base feef7120e0a3145ddd345eed714deef3542007d4,comprobado limpio y sin avances. Creada en destino feature/factory-010-moderacion-tiempo-real desde esa base.

Leídos AGENTS.md,skillfactory,solicitud010,autorización completa de integración,build y decisión final. Cuatro informes completos APROBADO en ciclo2/ronda3,decisión APROBAR; hashes de informes/build coinciden con decisión. Producto fuente638/638SHA correctos. Transferidos exactamente49archivos de producto:29modificados y20nuevos,cero bajas. Copiado expediente010 completo,incluidas rondas históricas y autorizaciones. Destino638/638SHA correctos después de transferencia. Corrección012 permanece íntegra;versión final3.12.0.

No se copiaron producto/expedientes011,env privados,datos,logs ni builds. No se modificó fuente ni checkout habitual ni servicio8787. Board/backlog son exclusivos del orquestador. No hubo reconstrucción ni modificación del producto aprobado.

## Evidencia y checks

Se inspeccionaron logs originales finales del constructor: typecheck ylint satisfactorios (lint conserva1warning cosmético de eslint-disable,0errores),suite131archivos/1213tests PASS,buildElectron/API y41contratos010 PASS enSQLite/PostgreSQL reales. Buildweb de ronda2 permanece vigente por identidad de su grafo. Logs /tmp/ttrpg-010-c2-*.log y /tmp/ttrpg-010-r2-build-web.log. Son ejecuciones del constructor inspeccionadas; no se presentan como checks propios del integrador. Los fallos iniciales por contención y correcciones anteriores permanecen documentados en build.md.

Typecheck propio en destino PASS,exit0;log /tmp/ttrpg-010-integration-typecheck.log. No se repiten suitesmultidriver aprobadas sin causa ni se utiliza PostgreSQL reservado. Empaquetado y hdiutil se ejecutaron después del merge autorizado; resultados al final.

## Manifiesto de transferencia

Las siguientes rutas son la lista explícita de producto a preparar; SHA256 después de copiar. El manifiesto completo de638rutas permanece inmutable en ronda-3/huellas.json. No incluye los registros del expediente/tablero.

SHA256 del manifiesto638: `df5df4ece192166d9d58a1d7c57effea17460b4819af7d96eae9760890b3a684`.

```json
{
  "CHANGELOG.md": "d06d7eff7203a955cb846f16990a0d00451d6ca1909de4947428579066e07f97",
  "README.md": "beaaa14b4f7cd376cf7b66308bba2e051d3bef0844d671f7e7e8ba75bff49e39",
  "docs/moderation.md": "4ce693d29726c58fce649ea34892a6ad4c771bc2fd017c34e964d2e9b75c5588",
  "docs/private-api.md": "6cb7165a85c8811c8454a1874efbbb65bf17b6ae8db466a967ed71af120fbe69",
  "docs/service-operations.md": "45916bd5087cbb102d23bcb5daabc9eff8d137e7c14a32371a8ec544cc7d5e51",
  "docs/synchronized-table.md": "240881ac84078cec588cde6c901dca618006322707d9d647d7d18ab6243c3280",
  "package.json": "9d340b6995d33220543135367ceab6c831607d06ec23ad36188e4004239ed8bd",
  "src/application/services/game-runtime.test.ts": "bf7f661cb7146d8e26a6c2e2d07e2b548b8ad747449a61a15c37b207804d3212",
  "src/application/services/game-runtime.ts": "de9732989601a56062f6325570ad8958409eb0e241429a714f67deec1dcb8688",
  "src/application/services/host-invitations.ts": "c93f186fe884a86555bbace690d9e3cd59bc88f1631641db97f1b175888e0a5b",
  "src/application/services/invitations.ts": "3c2c8ea8149bf9bbf32b1e015f5d54ea93d4964984e459c2071b735a9fb36114",
  "src/application/services/moderation.ts": "c126ddbf6e7d142227503d05075bfcfd28cbe59e5aa01fae5fb8952730b38b6e",
  "src/application/services/public-table-projection.ts": "1ad07c2495b5caf36a2705b4b4c05795182ff826d2e5c0ab96d52437870e3146",
  "src/application/services/table-session.ts": "d2e769882734f071a8e8c4d38d06efa6da7cff5587a69184f9d005d2f2d9f43e",
  "src/infrastructure/browser/contextual-table-client.test.ts": "b45e95cd72920d925bf3e83f7afdeaeb4d8714b5a45ddce930ca02b95bd106a0",
  "src/infrastructure/browser/contextual-table-client.ts": "e2f7cf97c11c838026a90833d41818632a3f1f210022fb297d26d27bedfc5161",
  "src/infrastructure/browser/http.ts": "d90186ba9ee17c0610809ba4929102f795721d9807859e71da28d55d1b93b62d",
  "src/infrastructure/browser/table-client.ts": "6a2685138960118aa516e5246f00a36f592e8e2469bb945dbce80ef7c006efee",
  "src/infrastructure/server/database/catalog.contract.ts": "003e00a3c5df7e66b6a3803f794bd63b3c41bffb0f5030234cae2200df53425f",
  "src/infrastructure/server/database/migrations.ts": "42c22410e1f36f661867ad6bed7c854c7d1859e5eeb7642bb048589c73553132",
  "src/infrastructure/server/identity/identity.contract.ts": "6927718738c380bfe8b6f4c16987076623ca225b07cae5cec60dba5274031ff4",
  "src/infrastructure/server/identity/index.ts": "34c7bacfc1a84dde4d9339a41cb2659577adafefe21bb8c8c044b077c68360d7",
  "src/infrastructure/server/invitations/compiled.contract.ts": "3411f543322517b531b27fc44a46568ccd28c8d2e36b2fcea51107520bb15b0e",
  "src/infrastructure/server/invitations/guest-authority.ts": "dc70d6793884f5789fc6af5163a48804f28fdc06cd4efdf267c77b0020643284",
  "src/infrastructure/server/invitations/host-repository.ts": "672fb23d30f37c6bc2a83916eb8bda9be77d4a65715a7d552d6317a2837a600c",
  "src/infrastructure/server/invitations/index.ts": "eb866a94d8322632ad60fd74fd4f6670fca1e44b1575e67660261ee4c5b7396a",
  "src/infrastructure/server/invitations/invitations.contract.ts": "d0a2928c7fdba381736c24dc1198697c63d4c002f2118c8465b606f9de797e4a",
  "src/infrastructure/server/invitations/persistence.contract.ts": "f793874f02716e4f68c3be5567f0420a1b24deda3b19cc8012dbc05dd9754dc6",
  "src/infrastructure/server/moderation/compiled.contract.ts": "af1cccb3ea16f42c61fd7b5c78792650b4a0f5bf802d795fdffad5ae13a2a923",
  "src/infrastructure/server/moderation/corrections.contract.ts": "def727091ee39b57c0b4eab2c700149a7a33697e3b1aa72bfc535c64ef78e680",
  "src/infrastructure/server/moderation/exclusion.contract.ts": "6f6eb27f10b48416fff84481667a5c0e67baf085d564621e4d33e28987f84529",
  "src/infrastructure/server/moderation/fixtures.ts": "337b4726df7792d7b2503198a1bb15ff1f18a6aa328b8af3bd194975d81d3397",
  "src/infrastructure/server/moderation/moderation.contract.ts": "aa3df3e3bcca6bc48b0556954c085635c291148c38157dfe058c5c140cdb7fc3",
  "src/infrastructure/server/moderation/races.contract.ts": "e51d8792b0c3f84a5221d9b8adbf3c8cf30f65377aebd80f8d1bfa3d43cc82bb",
  "src/infrastructure/server/moderation/runtime-lease.ts": "51152634cbdd923a1267c5bf6e0ecae943b93bb5aed1f0fd232c16b083ed943a",
  "src/infrastructure/server/moderation/test-fixtures/compiled-smoke.mjs": "d2be5dd9f1b3c322baf24c8786fdbf6415242101ef394eb39f41ac23e2de0aa2",
  "src/infrastructure/server/moderation/test-fixtures/runtime-child.mjs": "3011fa9b722e4946a048236ada7d953b22c0f12ac82a6435e2205dee130a8e32",
  "src/infrastructure/server/moderation/transport.contract.ts": "bc3d5ccf58bfcee583933d1166d1aaa2fde108d6c2f0034cf2e3aececbaa2eb0",
  "src/infrastructure/server/moderation/vitest.config.ts": "e0deaa6327690dc79152ab87b3063bdcc9ceab910eade4efc3414431f63f309c",
  "src/infrastructure/server/owned/repository.ts": "1e963862a5d83ca0c291c3ebb5d9acb3ce63fd0b17877118b71c489c63e79d38",
  "src/infrastructure/server/owned/systems.contract.ts": "aa544a0ab327414b9fe65cc62c33cd63b39cdac86094cf8b42d25fa719a54e93",
  "src/server/invitation-backend.ts": "911fbd9148b0a4605be801044f58a8ab631a2e57e08b1e8437ce0d76a201f1d3",
  "src/server/invitation-http.ts": "41f7bc0b8aa7dacb528451766df26d05503ae4be123b306d763f6bb6e34dc7dd",
  "src/server/moderation-backend.ts": "837cc98e6715cc3c25916352a8a081484ecda85883342fe268fb33ec7ddec608",
  "src/server/moderation-http.ts": "eed94bbaf9ca4fb13b96552a07b35e8fb88c5e65402c2d2581b4beab3916a552",
  "src/server/request-body.ts": "ac49fae120d330c4f6cc728b5dba68f2dab1e19cb11b6a167f4c33c07d5649b8",
  "src/server/table-actions.ts": "d98c8955e6fe3aa197711a604bba3f82ce5880f9865a0cf8590abc9f3c745425",
  "src/server/table-http.ts": "6b4b74b45b91000eaa2d4614a0147d60c4b1e10018eb246fce7e737d95b819cf",
  "src/shared/contracts/moderation.ts": "1980ca6b69d762f8063eb877757737508511c8f59f50bd00afa5992d97bb26ec"
}
```

## Preparación del commit

Orquestador copió board/backlog y autorizó continuar. Comprobados de nuevo638/638SHA tanto en fuente como destino,mainbasefeef712 intacta. Índice preparado mediante80rutas explícitas:49producto,29archivos de expediente010 y2registros del orquestador. Ningún011 ni privado. git diff --cached --check identifica1754avisos de espacios exclusivamente dentro de los diffs archivados de ronda1/ronda2/ronda3 revision.md; se conservan como evidencia inmutable. La comprobación excluyendo esos revision.md pasa, sin errores de formato en producto.

## Resultado final de producto y empaquetado

Commit de producto:`ae5c654f74962b1f6c8de18055d87f9192d1f9ce`. Incorporación local mediante `git switch main` y `git merge --ff-only feature/factory-010-moderacion-tiempo-real`, sin conflictos.79archivos cambiados; se seleccionaron80rutas y backlog no tenía diferencia. Main conserva producto exacto aprobado:638/638SHA después del commit y del empaquetado, igual que la fuente al finalizar. Sin producto011,privados ni buildoutputs en el historial. No push.

- `./scripts/build-dmg.sh`:exit0;typecheck,compilaciónElectron y electron-builder correctos. Log:`/tmp/ttrpg-3.12.0-dmg.log`.
- DMGarm64:`/Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects/dist/TTRPG Effects-3.12.0-arm64.dmg`.
- Tamaño:152632930bytes.
- SHA256:`a72ad49dd6db8b35bd1adefa117bd6fc36d5ba1a6715c76e25afe58d341d6c23`.
- `hdiutil verify`:exit0,checksumVALID. Log:`/tmp/ttrpg-3.12.0-dmg-verify.log`.
- Info.plist confirma CFBundleShortVersionString y CFBundleVersion3.12.0.

Se preservan los warnings existentes del empaquetador (author ausente,dependencias opcionales para otrasplataformas,DEP0190) y configuración sinfirmaDeveloperID; no impidieron construir. No se instaló ni ejecutó el DMG con perfilpersonal,no se afirma QAvisual nuevo ni despliegue. El servicio8787 y checkout habitual no se tocaron.

El orquestador preparó el estado integrado de board/backlog y coordinación010 y autorizó el cierre documental:se incluyen este informe y cuatro documentos preparatorios011 (solicitud,coordinación,spec y propuesta histórica),sin producto011. Se comprobaron exactamente8rutas documentales y638/638huellas de producto intactas antes del commit de cierre. El integrador no modificó board/backlog ni la fuente. No se requiere otro DMG para este cierre documental del mismo producto3.12.0.
