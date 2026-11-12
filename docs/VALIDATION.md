# Validación de NexoTerm 0.1.0

Ejecutada el 12 de noviembre de 2026 en Windows 11 x64, con Node.js 24.15.0 y Electron 45.3.1.

## Resultados

- `npm test`: **15 pruebas aprobadas**, cero fallos.
- `npm run test:e2e`: **aprobado** con la aplicación de desarrollo.
- `NEXOTERM_TEST_EXE=release\win-unpacked\NexoTerm.exe npm run test:e2e`: **aprobado** con la aplicación empaquetada.
- Ejecutable final `NexoTerm-0.1.0-portable.exe`: **prueba de arranque aprobada** con perfil nuevo, PowerShell real, salida de prueba persistida en Markdown y `exit` conservando la sesión. Se verificó el portable autoextraíble, además del ejecutable extraído.
- `npm audit`: **cero vulnerabilidades reportadas** al terminar la instalación de dependencias; también cero con `--omit=dev`.
- Plink incluido en `app.asar`: SHA-256 verificado y coincidente con el binario oficial 0.85. Módulos nativos ConPTY presentes fuera del ASAR.
- PDF generado: archivo válido, una página en el caso de prueba; renderizado y revisado visualmente, con título, metadatos, evidencia de PowerShell en bloque de código y pie de página. Se verificó por separado la exclusión del fragmento fallido.
- Capturas de la interfaz revisadas: configuración persistente, dos pestañas, panel de asistente a la izquierda de la terminal y entrada inferior de ancho completo.

## Integración comprobada

La prueba abre dos PowerShell reales mediante ConPTY. Envía comandos de prueba, consulta un proveedor HTTP simulado, verifica que el contexto está ausente por defecto y presente al habilitarlo, registra evidencias, genera Markdown y PDF, ejecuta `exit` mediante la interfaz, conserva pestañas y conversaciones, inicia y detiene MCP, cierra y reabre la aplicación y recupera sesiones históricas. La clave simulada se guarda cifrada y vuelve a cargarse tras el reinicio sin aparecer en texto plano en settings.

El protocolo MCP se comprobó con el SDK cliente real, incluyendo initialize, listado y llamada de herramientas, rechazo de peticiones sin autenticación, rechazo de Origin externo y revocación de acceso al dejar de compartir una sesión.

## Alcance pendiente

No se usaron credenciales reales ni servicios LLM de pago. Los tres adaptadores se probaron con respuestas simuladas; la integración completa utilizó la API compatible. No se conectaron equipos Cisco, servidores SSH remotos, dispositivos Telnet o puertos seriales físicos. La configuración universal de PuTTY no se replica: esta preview implementa el conjunto documentado en README.

La integración completa corresponde al ejecutable extraído de la distribución; el portable final pasó adicionalmente la prueba de arranque y terminal descrita arriba. La instalación del instalador en otros equipos y el comportamiento frente a políticas empresariales de Windows requieren pruebas adicionales. Los ejecutables no llevan firma de editor propia.
