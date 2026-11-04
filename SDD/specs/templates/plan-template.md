# Plan — NN Nombre

**Spec fuente:** `spec.md` del mismo directorio. **Estado:** Propuesta. **Dependencias:** por definir.

## Base inspeccionada

Rama/SHA y cambios locales relevantes; módulos y contratos existentes que se reutilizan. No sobrescribir trabajo previo.

## Decisiones por capa

| Capa | Cambio previsto | Archivos / puertos |
| --- | --- | --- |
| Dominio y aplicación | Reglas puras y casos de uso | Por concretar |
| Infraestructura y servidor | Repositorios, transacciones, HTTP/SSE | Por concretar |
| Clientes y render | UI compartida, adaptadores, IPC o Pixi | Por concretar |

Incluir solo capas afectadas. Justificar dependencias nuevas. No permitir acceso privilegiado desde renderer.

## Datos y operación

Migraciones incrementales SQLite/PostgreSQL, compatibilidad, backup/retorno y configuración privada si aplica. Distinguir migración DB, intercambio .ttrpgscene y paquete funcional operativo.

## Secuencia de implementación

Pasos pequeños verificables, con dependencias y alcance de archivos. Separar una investigación necesaria de la implementación ya decidida.

## Validación

| Criterio | Prueba / recorrido | Entorno | Resultado y evidencia |
| --- | --- | --- | --- |
| CA-01 | Comando o pasos concretos | Aislado / navegador / Electron | Pendiente |

Seleccionar comandos reales de package.json: pnpm typecheck, lint, test y builds afectados. Contratos de DB/identidad/propiedad/invitación/moderación requieren motores reales y TLS; registrar entorno ausente como limitación, no como éxito. Evitar datos operativos.

## Cierre

Registrar documentación actualizada, criterios satisfechos o pendientes, versión de producto si aplica, expediente factory, decisión técnica y permisos Git vigentes. Implementado, revisado e integrado son estados distintos. No marcar completado un check que no se ejecutó.
