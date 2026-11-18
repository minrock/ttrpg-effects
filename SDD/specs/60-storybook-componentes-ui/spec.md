# 60 — Storybook de componentes UI

**Estado:** Implementación y validación local completadas; pendiente de integración Git. **Revisión:** 0.1. **Fecha:** 2026-11-14. **Tipo:** funcionalidad de desarrollo.
**Dependencias:** catálogo UI/UX y componentes existentes de navegador/editor, incluidos los controles compartidos de SDD 59 revisión 0.4.
**Evidencia:** [Validación](validacion.md) y [cobertura](evidencia/catalogo.json): 54 historias, 29 páginas autodocs. **Versión de entrega:** 3.29.0; fuente oficial `package.json`.

## Problema y objetivo

El usuario necesita identificar por nombre, revisar y mejorar individualmente los controles actuales de la aplicación: botones, switches, sliders y demás UI React, y conocer cómo se combinan en componentes mayores. Hoy existen controles compartidos y patrones inline dependientes del contexto CSS, sin catálogo ejecutable. El laboratorio anterior monta motores visuales y no sustituye este inventario.

Se solicita explícitamente usar [Storybook](https://storybook.js.org/) y recorrer el código vigente, excluyendo PixiJS. La petición autoriza generar el catálogo y validarlo en esta sesión. La rama específica se autorizó por respuesta humana el 2026-11-14; conserva los cambios locales anteriores. Commit, push y merge no están autorizados.

## Alcance y exclusiones

- Storybook local para React/Vite, separado de las entradas Electron y web, con comando de desarrollo y build estático reproducible mediante pnpm.
- Inventario de familias UI y componentes de composición, con nombre estable, ruta fuente, condición de reutilización y enlace a su historia o razón concreta de exclusión/aplazamiento.
- Historias de controles básicos: botón, botón con icono, switch, slider, número, texto/contraseña, textarea, select, checkbox, radio y color. Historias de composiciones representativas: pestañas, acordeón, menús, diálogos, feedback, herramientas, listas/tarjetas y formularios existentes.
- Reutilizar componentes reales. Cuando un control esté inline, permitir extracción pequeña que preserve su comportamiento y tenga un consumidor productivo; identificar honestamente los patrones que siguen sin API reutilizable. No crear una biblioteca duplicada solo para las demos.
- Datos sintéticos y estado local interactivo, documentación de uso, propiedades/estados y revisión de accesibilidad. Incluir vacío/error/deshabilitado/seleccionado donde proceda, teclado y etiquetas extensas.
- Fuera: PixiJS/canvas del mapa, Three y simulación de dados, App/ServiceApp completos, API/DB/archivos reales, publicación externa, rediseño general o migración masiva de controles. Los componentes React de dados sin motor pueden catalogarse.
- Navegador y Electron comparten los mismos componentes; el catálogo corre en navegador. Las extracciones deben conservar los clientes conectados y autónomos, sin privilegios nativos en Storybook.

## Reglas y contratos

1. Los títulos de familia y componente son estables y legibles; los nombres visibles enlazan con símbolos/rutas reales. Se distingue componente reusable, patrón actual y composición.
2. Las demos conservan el tema, estilos y contexto de producción, incluidos portales. Los ejemplos interactivos responden a cambios y permiten reiniciar sin modificar datos de usuarios.
3. Los clientes de ejemplo son explícitos, tipados y en memoria; el proveedor por defecto no obtiene implícitamente `window.ttrpg`. No se requieren inicio de sesión, API ni Electron para abrir una historia.
4. El catálogo muestra el comportamiento vigente y documenta limitaciones, sin declarar accesibilidad completa solo por compilar o pasar un análisis automatizado.
5. Storybook y sus dependencias son herramientas de desarrollo. El build del producto no debe importar historias ni incluir Storybook. No se modifica el formato `.ttrpgscene`, API ni persistencia.

## Criterios de aceptación

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-01 | Storybook inicia localmente y genera salida estática independiente con pnpm | Comandos, URL y build verificables |
| CA-02 | Inventario de UI actual con nombres, fuentes, cobertura y exclusiones explícitas, sin Pixi | Documento reconciliado con índice de historias y código |
| CA-03 | Todas las familias básicas enumeradas tienen ejemplos aislados e interactivos de controles reales o extracción adoptada en producto | Historias, consumidor productivo y recorrido de switch/slider/botón/formulario |
| CA-04 | Composiciones muestran reutilización y estados representativos (navegación, diálogo, feedback, listas y formularios) | Historias y recorrido con datos sintéticos |
| CA-05 | Tema y contexto CSS fieles, tamaños pequeño/grande, controles con nombres accesibles y revisión de teclado/foco | Inspección visual y comprobaciones de accesibilidad con límites registrados |
| CA-06 | Catálogo funciona sin API/DB/Electron y no carga motores Pixi/Three ni entradas de aplicación | Guardas de imports/build y revisión de fixtures/recursos |
| CA-07 | Documentación permite localizar, ejecutar y añadir historias; versión/changelog, typecheck/lint y regresiones afectadas verificados | README, catálogo UI/UX, comandos y evidencia local |

## Reutilización y compatibilidad

`SharedSwitch` es el switch productivo común. Se reutilizan componentes exportados y estilos del editor y servicio, con decoradores de contexto. La arquitectura actual de clientes/capacidades no cambia. No se instalan frameworks de estilos ni servicios externos. Las extracciones necesarias mantienen DOM/props/semántica y se prueban según su riesgo.

## Riesgos y decisiones

- CSS global/contextual puede distorsionar demos: aislar el iframe y replicar los contenedores reales.
- Imports transitivos pueden incorporar canvas o infraestructura: limitar el grafo y verificar el build.
- Componentes acoplados requieren fixtures o extracción; inventario explícito evita presentar cobertura inexistente.
- Storybook React/Vite se elige por solicitud humana y stack existente; documentación oficial consultada el 2026-11-14. Puerto local previsto 6006, adaptable si está ocupado.
- Los cambios previos de SDD59 siguen en el checkout; su presencia no equivale a integración Git.

## Entrega y evidencia

Plan y tareas técnicos se conservan en [plan.md](plan.md) y [tareas.md](tareas.md). El [inventario](inventario.md) enlaza nombres del catálogo ejecutable y las fichas UI/UX. La validación distingue implementación local, pruebas, revisión manual y estado de integración, con hallazgos de accesibilidad y superficies aún sin historia explícitos.
