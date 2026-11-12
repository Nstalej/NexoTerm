# Publicar una versión

1. Revisa `README.md`, `CHANGELOG.md` y los resultados de validación.
2. Configura el repositorio GitHub de destino y envía la rama principal. No subas datos de `%APPDATA%\NexoTerm`, claves, configuraciones MCP copiadas ni carpetas de pruebas con perfiles de usuario.
3. Actualiza la versión de `package.json` y el lockfile mediante `npm version` cuando corresponda.
4. Crea y envía un tag como `v0.1.0`.
5. El workflow crea un borrador de release con instalador, portable y checksums. Revisa el borrador antes de publicarlo.

## Texto sugerido para 0.1.0

NexoTerm mantiene abiertas la configuración y las sesiones al trabajar con terminales. Incluye conexiones SSH/Telnet/serial mediante Plink 0.85, PowerShell local, asistente LLM configurable por usuario y servidor MCP local de solo lectura generado automáticamente. Guarda bitácoras Markdown y crea informes PDF con evidencias validadas, excluyendo fragmentos fallidos y pendientes.

Descarga `NexoTerm-0.1.0-setup.exe` para instalar o `NexoTerm-0.1.0-portable.exe` para ejecutar sin instalación. Cada usuario configura su proveedor, modelo y clave. No incluye claves ni necesita un LLM para conectarse y generar informes.

Preview: ejecutables sin firma de editor propia, validación de comandos a cargo del operador y pruebas con dispositivos físicos pendientes según el entorno. Revisa las bitácoras antes de compartirlas; el filtro de credenciales no es una garantía de ausencia de cualquier secreto arbitrario.
