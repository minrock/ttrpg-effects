# Identidad de la revisión

Rama autorizada: `feature/fabrica-software`. Sin commits ni merge.

Base Git: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. HEAD actual: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`.

Se revisa el código de esta spec sobre cambios anteriores no integrados; base-archivos.json identifica su punto de partida. huellas.json congela el contenido de código/config/docs al abrir esta ronda. Los informes de fábrica quedan fuera de las huellas.

## Archivos cambiados por esta spec

- `CHANGELOG.md`
- `README.md`
- `docs/client-architecture.md`
- `docs/private-api.md`
- `package.json`
- `pnpm-lock.yaml`
- `src/infrastructure/server/image-validation.ts`
- `src/infrastructure/server/persisted-records.ts`
- `src/infrastructure/server/service-store.ts`
- `src/server/auth.test.ts`
- `src/server/auth.ts`
- `src/server/config.ts`
- `src/server/errors.ts`
- `src/server/fixtures/README.md`
- `src/server/fixtures/animated.webp`
- `src/server/fixtures/interlaced.png`
- `src/server/fixtures/pixel-lossless.webp`
- `src/server/fixtures/pixel.jpg`
- `src/server/fixtures/pixel.webp`
- `src/server/http.test.ts`
- `src/server/http.ts`
- `src/server/image-validation.test.ts`
- `src/server/index.ts`
- `src/server/scene-service.ts`
- `src/server/schemas.ts`
- `src/server/vite.config.ts`
- `src/shared/contracts/http-api.ts`

## Diff de archivos rastreados contra HEAD

Los archivos nuevos se inspeccionan directamente; sus huellas están registradas.

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index e01fd96..474db3c 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -10,6 +10,34 @@ El proyecto sigue versionado semantico:
 
 La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.
 
+## [3.3.0] - 2026-10-28
+
+### Agregado
+
+- Servicio privado Node.js 24 con sesiones DM/jugador, validación de origen/host, límites y contratos HTTP documentados.
+- Escenas CRUD e importación/exportación v1/v2; assets privados con referencias opacas, recuperación de imágenes y almacenamiento SQLite consistente.
+- Bibliotecas y plantillas remotas, comandos de API y pruebas HTTP reales de autorización, persistencia y errores. Electron local conserva su funcionamiento.
+- Validación de escenas/plantillas al leer SQLite y decodificación acotada de imágenes antes de publicar assets; variantes no admitidas explican su conversión.
+
+## [3.2.0] - 2026-10-28
+
+### Agregado
+
+- Contratos compartidos de clientes y composición por raíz React con capacidades explícitas; DM, Player, bibliotecas, imágenes y dados aceptan clientes inyectados.
+- Mapa de paridad documentado para la futura migración al servicio privado, sin implementar transporte HTTP ni cambiar el formato de escenas.
+
+### Corregido
+
+- La información de versión del preload se deriva de `package.json`, también en el bundle sandboxed.
+
+## [3.1.0] - 2026-10-28
+
+### Agregado
+
+- Fábrica de software local para Codex: skill `factory`, siete roles en español, cola y expedientes Markdown; cuatro revisiones completas por ronda, correcciones con el mismo constructor y aprobación técnica separada de la autorización de Git.
+- Tablero HTML autónomo con sondeo del estado, tarjetas por etapa, historial de rondas y lector seguro de informes. Incluye una demostración explícita sin modificar el estado real.
+- Flujo integrado con las specs, pruebas pnpm, versionado y empaquetado DMG existentes. Sin cambios en el formato `.ttrpgscene` ni dependencias adicionales.
+
 ## [3.0.0] - 2026-10-28
 
 ### Changed
diff --git a/README.md b/README.md
index 9e00e27..a946b93 100644
--- a/README.md
+++ b/README.md
@@ -10,6 +10,16 @@ Player View mantiene la escena del DM protegida y agrega mediciones de linea/cam
 
 El salto mayor es una decision de lanzamiento; las escenas `.ttrpgscene` existentes siguen siendo compatibles. Alcance y verificaciones en [spec 39](specs/39-vtt-interface/spec.md) y su [plan](specs/39-vtt-interface/plan.md).
 
+## Fábrica de software con Codex
+
+Usa `$factory <funcionalidad>` para especificar, construir y revisar un cambio con subagentes. `$factory siguiente` toma un elemento de la cola; `$factory aprobar <id>` autoriza integrar un trabajo preparado y `$factory rehacer <id> <nota>` abre otro ciclo de correcciones. Commits y merge respetan la autorización explícita indicada en `AGENTS.md`.
+
+Para ver el tablero, ejecuta `python3 -m http.server 8765 --bind 127.0.0.1 --directory factory` y abre [el visor local](http://127.0.0.1:8765/dashboard.html). El botón «Ver ejemplo» permite explorar el flujo con datos ficticios. Instrucciones y estructura en [factory/README.md](factory/README.md); alcance en [spec 40](specs/40-fabrica-software/spec.md).
+
+## Arquitectura de clientes
+
+El [contrato común y mapa de paridad](docs/client-architecture.md) documenta la composición por raíz React, las capacidades locales y la futura adaptación al servicio privado. El transporte implementado sigue siendo Electron local.
+
 ## Requisitos
 
 - Node.js compatible con el toolchain actual.
@@ -134,3 +144,7 @@ Detalle funcional y tecnico en [spec 37](specs/37-dm-dice-rolls/spec.md) y su [p
 ## Laboratorios de interfaz
 
 Durante desarrollo, `/ui-lab.html` ofrece la propuesta de interfaz con datos en memoria y `/player-lab.html` monta Player View con un adaptador local. En este ultimo, `?north=90`, `180` o `270` permite comprobar herramientas con el mapa rotado. Son entradas de desarrollo, sin persistencia ni inclusion en el instalador.
+
+## Servicio privado API
+
+`pnpm build:api` y `pnpm start:api` ejecutan la API independiente en Node.js 24. Requiere configurar claves DM/jugador, origen y directorio exclusivo. Consulta [configuración, rutas, límites y respaldo](docs/private-api.md). La API 3.3.0 conserva el formato de escena 2 y el modo local Electron; el cliente navegador y la sincronización de mesa corresponden a las siguientes entregas.
diff --git a/package.json b/package.json
index b79a0fa..6bd8e03 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "ttrpg-effects",
-  "version": "3.0.0",
+  "version": "3.3.0",
   "description": "Desktop tool for TTRPG map effects and session projection.",
   "private": true,
   "type": "module",
@@ -11,7 +11,10 @@
     "dist:mac": "pnpm build && electron-builder --mac dmg",
     "lint": "eslint .",
     "test": "vitest run",
-    "typecheck": "tsc --noEmit"
+    "typecheck": "tsc --noEmit",
+    "build:api": "pnpm typecheck && vite build --config src/server/vite.config.ts",
+    "start:api": "node out/api/index.mjs",
+    "dev:api": "pnpm build:api && pnpm start:api"
   },
   "build": {
     "appId": "com.luismoncaris.ttrpg-effects",
@@ -100,6 +103,7 @@
     "pixi.js": "^8.18.1",
     "react": "^19.0.0",
     "react-dom": "^19.0.0",
+    "sharp": "0.35.5",
     "three": "0.143.0",
     "tiptap-markdown": "^0.9.0",
     "zod": "^4.4.3"
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index 83ce473..96dd614 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -68,6 +68,9 @@ importers:
       react-dom:
         specifier: ^19.0.0
         version: 19.2.6(react@19.2.6)
+      sharp:
+        specifier: 0.35.5
+        version: 0.35.5(@types/node@24.12.4)
       three:
         specifier: 0.143.0
         version: 0.143.0
@@ -292,6 +295,9 @@ packages:
     engines: {node: '>=14.14'}
     hasBin: true
 
+  '@emnapi/runtime@1.11.3':
+    resolution: {integrity: sha512-Xz4Tpyki7XyrpbUK1jR1AhdAdaXyhhY4lZ3neLodmhpuWfy2PAQN5B46sAiU4liOXGLkHypn/qU+jvfWSCYYLA==}
+
   '@esbuild/aix-ppc64@0.25.12':
     resolution: {integrity: sha512-Hhmwd6CInZ3dwpuGTF8fJG6yoWmsToE+vYgD4nytZVxcu1ulHpUQRAB1UJ8+N1Am3Mz4+xOByoQoSZf4D+CpkA==}
     engines: {node: '>=18'}
@@ -680,6 +686,168 @@ packages:
     resolution: {integrity: sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==}
     engines: {node: '>=18.18'}
 
+  '@img/colour@1.1.0':
+    resolution: {integrity: sha512-Td76q7j57o/tLVdgS746cYARfSyxk8iEfRxewL9h4OMzYhbW4TAcppl0mT4eyqXddh6L/jwoM75mo7ixa/pCeQ==}
+    engines: {node: '>=18'}
+
+  '@img/sharp-darwin-arm64@0.35.5':
+    resolution: {integrity: sha512-QRUlFQ0WxvdWyqqG/WtI3iupfD5rBzmCHXSdPsY91sAtVtTo7Q4cb6zOccZ3gqEqkr0f1As1ehLqmEpDsRf+lg==}
+    engines: {node: '>=20.9.0'}
+    cpu: [arm64]
+    os: [darwin]
+
+  '@img/sharp-darwin-x64@0.35.5':
+    resolution: {integrity: sha512-+BR255RhDlpygUpOc/Jdt1nT6DQ3XG/ERo5wbcdOf5Q320dKtPCKPLR1LJs9VGXRaMa8l1uUa0tkCNOXiAxZUw==}
+    engines: {node: '>=20.9.0'}
+    cpu: [x64]
+    os: [darwin]
+
+  '@img/sharp-freebsd-wasm32@0.35.5':
+    resolution: {integrity: sha512-Y/z91nEZ4uIBX5X3nfTovjU9lHNKFYbL2lpHCLVNmXQK03VIZvXBBt0KxbPGp2SdGSF+2mQU4e+hQaWOt86iAw==}
+    engines: {node: '>=20.9.0'}
+    os: [freebsd]
+
+  '@img/sharp-libvips-darwin-arm64@1.3.4':
+    resolution: {integrity: sha512-5R89nBYiRdUlSWJxPhO+GVtaXzXSxKnRu/xqMn3KTA3L9EB9Oy/P+Nn2f2vlhPuUdy/Zusb2DarbyTpGCfEDuw==}
+    cpu: [arm64]
+    os: [darwin]
+
+  '@img/sharp-libvips-darwin-x64@1.3.4':
+    resolution: {integrity: sha512-iR2OKH80yi0U+dUplyh3/xdpFvps6YkCwsXenIJxqxR1v9o+xtKTGbS9H7cps+2Vxjc8B1j96p75NmTGjIhtpQ==}
+    cpu: [x64]
+    os: [darwin]
+
+  '@img/sharp-libvips-linux-arm64@1.3.4':
+    resolution: {integrity: sha512-Y3dgX/6lE2QhQb+Gxy0WZxfg9MEm/JBjamZpS2IklP7xIQoKN4hzAm7KcMVGtaVDt3neE9OKBC7vAfonA/Lr1A==}
+    cpu: [arm64]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-libvips-linux-arm@1.3.4':
+    resolution: {integrity: sha512-LmRtTsOHuvM2+wlO2Db37dx5MiZhB0FvSunciw48YjdOkZz9KAiRbm8ujeMOA1INqmei5NapFxYEK1D1ZSidmw==}
+    cpu: [arm]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-libvips-linux-ppc64@1.3.4':
+    resolution: {integrity: sha512-Le6boB8Tai0Nis+gIxIpKx68UDVVIqdR8Tin5Yf1z2LJJQLDJvCDRqRu+jC2qCoD+eIomonmOwB4smBRxfVpYQ==}
+    cpu: [ppc64]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-libvips-linux-riscv64@1.3.4':
+    resolution: {integrity: sha512-aHkkIEHPRdQEegJN20MLmGtxYD9R2wQr3Cwpddnu5+YKMt6Uzax7S9h5gpZTo8wyrGuZSlfQ63OevL5mTyOC7Q==}
+    cpu: [riscv64]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-libvips-linux-s390x@1.3.4':
+    resolution: {integrity: sha512-ra/mB6MikESDUO7Yg+Mi95bFBb9GsObURuhnOv3OqknjGe9sZrG8tCe9q0xSIGrtLgvgw0gKnFWcK4blSgQOuQ==}
+    cpu: [s390x]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-libvips-linux-x64@1.3.4':
+    resolution: {integrity: sha512-GJ//SSXbnwSDes02umB3nDJLFcQzw8a18V8fyhqr6tV515tOEMdImjjxj1AoafMRz56F3PHgftnj1QEKSU1zkw==}
+    cpu: [x64]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-libvips-linuxmusl-arm64@1.3.4':
+    resolution: {integrity: sha512-hvulFwtjUcagsis6BBxHwGFwWoNZjgYmULGVrZcyfNbjA8hKILbRxGg15/7w5HDyXHXUos/j6baAWqnCyQ2DWA==}
+    cpu: [arm64]
+    os: [linux]
+    libc: [musl]
+
+  '@img/sharp-libvips-linuxmusl-x64@1.3.4':
+    resolution: {integrity: sha512-6zXKeE/p39I1AmA3cJG35eyBGNqNddLnUXjhwBnsGjFPWqf5VKkDBEqaEkPDoTEtkxwi2vv8Tcr2mDyP4So7Fg==}
+    cpu: [x64]
+    os: [linux]
+    libc: [musl]
+
+  '@img/sharp-linux-arm64@0.35.5':
+    resolution: {integrity: sha512-LYVx5JTsOM2CBzmxreh+nl64/3H6Xb09iSLknqH47z2T2DFFxDeFLP5y4dJwe6H7uGQlHPyEEtIqyo3DYsRwdQ==}
+    engines: {node: '>=20.9.0'}
+    cpu: [arm64]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-linux-arm@0.35.5':
+    resolution: {integrity: sha512-LEaXK2WdXVK5ykcw0buWyPMsmLLL2vpHLD6yrNSW+JGEL3BZPA4tpKN6iaMc4AxTTAoaX/sU1rOL51lcIz48ZQ==}
+    engines: {node: '>=20.9.0'}
+    cpu: [arm]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-linux-ppc64@0.35.5':
+    resolution: {integrity: sha512-QVxAAq8evVRI9ia2vqgwrmWucn5Dfv+JdWzj75pD8omHLPSP7f8p20O8jxzjCcuCEQEOtYOZUmX1hkiZ0kdevA==}
+    engines: {node: '>=20.9.0'}
+    cpu: [ppc64]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-linux-riscv64@0.35.5':
+    resolution: {integrity: sha512-LtdreXguaavKODPIfzJ4kffx7UNt1omwtK0rch4EBbbSTXPnxWmYSayXdLJw0fJzQ97kHt1gL/yh4tvU+nCyRQ==}
+    engines: {node: '>=20.9.0'}
+    cpu: [riscv64]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-linux-s390x@0.35.5':
+    resolution: {integrity: sha512-UZasTOFiYzotTsGOCu42BfUzP6Tu6Do/947iRm1RsLKvlllxwGcn4RN27LibGWceix4Y+Pmw3jsnTcCQIgWjqA==}
+    engines: {node: '>=20.9.0'}
+    cpu: [s390x]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-linux-x64@0.35.5':
+    resolution: {integrity: sha512-SxFtLTeJInhAA9Q836kux2vZNeOBQEx658qvbboZScr0wIARym3IcGmW7KpVD5sbVg0Ojy+udFQdayYIZyoNog==}
+    engines: {node: '>=20.9.0'}
+    cpu: [x64]
+    os: [linux]
+    libc: [glibc]
+
+  '@img/sharp-linuxmusl-arm64@0.35.5':
+    resolution: {integrity: sha512-9HbMclmI1zlNkFRs3z9/eBtDjfD0sGlrX1z6b1qwmiFY5ElDLh4BC0LPBdVp7z1DXFiKlIcznf+ZlsuZzLxQqg==}
+    engines: {node: '>=20.9.0'}
+    cpu: [arm64]
+    os: [linux]
+    libc: [musl]
+
+  '@img/sharp-linuxmusl-x64@0.35.5':
+    resolution: {integrity: sha512-4KOphqB035HrVdqLZfCgMzzERrQkkzOwRhl4OAkRO1YCldbaFjySXMaK534Mo0V+LndnlJk+sbUyLeU0ULyD1A==}
+    engines: {node: '>=20.9.0'}
+    cpu: [x64]
+    os: [linux]
+    libc: [musl]
+
+  '@img/sharp-wasm32@0.35.5':
+    resolution: {integrity: sha512-Ptsga1su4tQx+LLF1ECS9U6nz5kmrXKo6XVbtR48Ke3ZRxxgaWBu7IDtEe1quo8hiupwm6WFqxVlXaSf7IINGQ==}
+    engines: {node: '>=20.9.0'}
+
+  '@img/sharp-webcontainers-wasm32@0.35.5':
+    resolution: {integrity: sha512-hfhF/FmoQyTUkA0bIKFOtw536BQSeBMe6BF6QyWlrPxT754+TFLaZ7sKKTfvvM0yJgKgaYTwnFCIZ/GuDw5SUA==}
+    engines: {node: '>=20.9.0'}
+    cpu: [wasm32]
+
+  '@img/sharp-win32-arm64@0.35.5':
+    resolution: {integrity: sha512-X4t7g+7ZA5DKblCBEXGjUqqemj4vczING/5viFwAL8h4N3qYeyjwdCvRLHi4EdOUI+2Z7UFlp1VM+p/AuEtm6Q==}
+    engines: {node: '>=20.9.0'}
+    cpu: [arm64]
+    os: [win32]
+
+  '@img/sharp-win32-ia32@0.35.5':
+    resolution: {integrity: sha512-5Zm82LoBc43nhwNybZlG7Y1KO//Zhsn306fQl29ZOuStHLGTo3BWL83q3cznX0poxSAMuYL1On/BHBxkBeKr6A==}
+    engines: {node: ^20.9.0}
+    cpu: [ia32]
+    os: [win32]
+
+  '@img/sharp-win32-x64@0.35.5':
+    resolution: {integrity: sha512-x76eH0vEiHlcMQu8Y8IenntaACtddpT6W0wmXtWrnKcnKI7ME5DdgqhAD6SEWOEl1v2zDvkZDhFA9KnURwpfqg==}
+    engines: {node: '>=20.9.0'}
+    cpu: [x64]
+    os: [win32]
+
   '@isaacs/fs-minipass@4.0.1':
     resolution: {integrity: sha512-wgm9Ehl2jpeqP3zw/7mo3kRHFp5MEDhqAdwy1fTGkHAwnkGOVsgpvQhL8B5n1qlb01jV3n/bI0ZfZp5lWA1k4w==}
     engines: {node: '>=18.0.0'}
@@ -1586,6 +1754,10 @@ packages:
     resolution: {integrity: sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ==}
     engines: {node: '>=0.4.0'}
 
+  detect-libc@2.1.2:
+    resolution: {integrity: sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==}
+    engines: {node: '>=8'}
+
   detect-node@2.1.0:
     resolution: {integrity: sha512-T0NIuQpnTvFDATNuHN5roPwSBG83rFsuO+MXXH9/3N1eFbn4wcPjttvjMLEPWJ0RGUYgQE7cGgS3tNxbqCGM7g==}
 
@@ -2513,10 +2685,24 @@ packages:
     engines: {node: '>=10'}
     hasBin: true
 
+  semver@7.8.5:
+    resolution: {integrity: sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==}
+    engines: {node: '>=10'}
+    hasBin: true
+
   serialize-error@7.0.1:
     resolution: {integrity: sha512-8I8TjW5KMOKsZQTvoxjuSIa7foAwPWGOts+6o7sgjz41/qMD9VQHEDxi6PBvK2l0MXUmqZyNpUK+T2tQaaElvw==}
     engines: {node: '>=10'}
 
+  sharp@0.35.5:
+    resolution: {integrity: sha512-Ywn4OnzGukp7CDMrp08RQ50YKmuwG47brZgIVPTvBaaAfQlRlygrRqSrxdCiL9M+LlzLBiJ68IR1QqvzHyjC7g==}
+    engines: {node: '>=20.9.0'}
+    peerDependencies:
+      '@types/node': '*'
+    peerDependenciesMeta:
+      '@types/node':
+        optional: true
+
   shebang-command@2.0.0:
     resolution: {integrity: sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==}
     engines: {node: '>=8'}
@@ -2662,6 +2848,9 @@ packages:
     peerDependencies:
       typescript: '>=4.8.4'
 
+  tslib@2.8.1:
+    resolution: {integrity: sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==}
+
   type-check@0.4.0:
     resolution: {integrity: sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==}
     engines: {node: '>= 0.8.0'}
@@ -3160,6 +3349,11 @@ snapshots:
       - supports-color
     optional: true
 
+  '@emnapi/runtime@1.11.3':
+    dependencies:
+      tslib: 2.8.1
+    optional: true
+
   '@esbuild/aix-ppc64@0.25.12':
     optional: true
 
@@ -3394,6 +3588,112 @@ snapshots:
 
   '@humanwhocodes/retry@0.4.3': {}
 
+  '@img/colour@1.1.0': {}
+
+  '@img/sharp-darwin-arm64@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-darwin-arm64': 1.3.4
+    optional: true
+
+  '@img/sharp-darwin-x64@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-darwin-x64': 1.3.4
+    optional: true
+
+  '@img/sharp-freebsd-wasm32@0.35.5':
+    dependencies:
+      '@img/sharp-wasm32': 0.35.5
+    optional: true
+
+  '@img/sharp-libvips-darwin-arm64@1.3.4':
+    optional: true
+
+  '@img/sharp-libvips-darwin-x64@1.3.4':
+    optional: true
+
+  '@img/sharp-libvips-linux-arm64@1.3.4':
+    optional: true
+
+  '@img/sharp-libvips-linux-arm@1.3.4':
+    optional: true
+
+  '@img/sharp-libvips-linux-ppc64@1.3.4':
+    optional: true
+
+  '@img/sharp-libvips-linux-riscv64@1.3.4':
+    optional: true
+
+  '@img/sharp-libvips-linux-s390x@1.3.4':
+    optional: true
+
+  '@img/sharp-libvips-linux-x64@1.3.4':
+    optional: true
+
+  '@img/sharp-libvips-linuxmusl-arm64@1.3.4':
+    optional: true
+
+  '@img/sharp-libvips-linuxmusl-x64@1.3.4':
+    optional: true
+
+  '@img/sharp-linux-arm64@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-linux-arm64': 1.3.4
+    optional: true
+
+  '@img/sharp-linux-arm@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-linux-arm': 1.3.4
+    optional: true
+
+  '@img/sharp-linux-ppc64@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-linux-ppc64': 1.3.4
+    optional: true
+
+  '@img/sharp-linux-riscv64@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-linux-riscv64': 1.3.4
+    optional: true
+
+  '@img/sharp-linux-s390x@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-linux-s390x': 1.3.4
+    optional: true
+
+  '@img/sharp-linux-x64@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-linux-x64': 1.3.4
+    optional: true
+
+  '@img/sharp-linuxmusl-arm64@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-linuxmusl-arm64': 1.3.4
+    optional: true
+
+  '@img/sharp-linuxmusl-x64@0.35.5':
+    optionalDependencies:
+      '@img/sharp-libvips-linuxmusl-x64': 1.3.4
+    optional: true
+
+  '@img/sharp-wasm32@0.35.5':
+    dependencies:
+      '@emnapi/runtime': 1.11.3
+    optional: true
+
+  '@img/sharp-webcontainers-wasm32@0.35.5':
+    dependencies:
+      '@img/sharp-wasm32': 0.35.5
+    optional: true
+
+  '@img/sharp-win32-arm64@0.35.5':
+    optional: true
+
+  '@img/sharp-win32-ia32@0.35.5':
+    optional: true
+
+  '@img/sharp-win32-x64@0.35.5':
+    optional: true
+
   '@isaacs/fs-minipass@4.0.1':
     dependencies:
       minipass: 7.1.3
@@ -4316,6 +4616,8 @@ snapshots:
 
   delayed-stream@1.0.0: {}
 
+  detect-libc@2.1.2: {}
+
   detect-node@2.1.0:
     optional: true
 
@@ -5407,11 +5709,46 @@ snapshots:
 
   semver@7.8.0: {}
 
+  semver@7.8.5: {}
+
   serialize-error@7.0.1:
     dependencies:
       type-fest: 0.13.1
     optional: true
 
+  sharp@0.35.5(@types/node@24.12.4):
+    dependencies:
+      '@img/colour': 1.1.0
+      detect-libc: 2.1.2
+      semver: 7.8.5
+    optionalDependencies:
+      '@img/sharp-darwin-arm64': 0.35.5
+      '@img/sharp-darwin-x64': 0.35.5
+      '@img/sharp-freebsd-wasm32': 0.35.5
+      '@img/sharp-libvips-darwin-arm64': 1.3.4
+      '@img/sharp-libvips-darwin-x64': 1.3.4
+      '@img/sharp-libvips-linux-arm': 1.3.4
+      '@img/sharp-libvips-linux-arm64': 1.3.4
+      '@img/sharp-libvips-linux-ppc64': 1.3.4
+      '@img/sharp-libvips-linux-riscv64': 1.3.4
+      '@img/sharp-libvips-linux-s390x': 1.3.4
+      '@img/sharp-libvips-linux-x64': 1.3.4
+      '@img/sharp-libvips-linuxmusl-arm64': 1.3.4
+      '@img/sharp-libvips-linuxmusl-x64': 1.3.4
+      '@img/sharp-linux-arm': 0.35.5
+      '@img/sharp-linux-arm64': 0.35.5
+      '@img/sharp-linux-ppc64': 0.35.5
+      '@img/sharp-linux-riscv64': 0.35.5
+      '@img/sharp-linux-s390x': 0.35.5
+      '@img/sharp-linux-x64': 0.35.5
+      '@img/sharp-linuxmusl-arm64': 0.35.5
+      '@img/sharp-linuxmusl-x64': 0.35.5
+      '@img/sharp-webcontainers-wasm32': 0.35.5
+      '@img/sharp-win32-arm64': 0.35.5
+      '@img/sharp-win32-ia32': 0.35.5
+      '@img/sharp-win32-x64': 0.35.5
+      '@types/node': 24.12.4
+
   shebang-command@2.0.0:
     dependencies:
       shebang-regex: 3.0.0
@@ -5551,6 +5888,9 @@ snapshots:
     dependencies:
       typescript: 5.9.3
 
+  tslib@2.8.1:
+    optional: true
+
   type-check@0.4.0:
     dependencies:
       prelude-ls: 1.2.1

```
