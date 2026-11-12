# NexoTerm 0.1.0: instalación, proveedor LLM y MCP

Descargas oficiales del proyecto: [release v0.1.0](https://github.com/Nstalej/NexoTerm/releases/tag/v0.1.0).

## 1. Instalar o ejecutar

- **Instalador:** ejecuta `NexoTerm-0.1.0-setup.exe` y sigue el asistente de instalación por usuario.
- **Portable:** ejecuta `NexoTerm-0.1.0-portable.exe`. No requiere instalación ni tener PuTTY, Node.js o Python instalados.
- Ambas variantes guardan la configuración y las sesiones en `%APPDATA%\NexoTerm\`.
- Para comenzar sin un equipo remoto, pulsa **Probar con PowerShell local**.

La versión es una preview para Windows 10/11 x64 y sus ejecutables no tienen firma de editor propia.

## 2. Configurar el proveedor LLM

1. Abre la pestaña **Asistente** de la columna izquierda.
2. Selecciona el tipo de proveedor de la tabla siguiente.
3. Introduce la **URL base**, sin la ruta final indicada en la tabla.
4. Escribe el nombre exacto de un **modelo disponible en tu proveedor**.
5. Agrega tu propia **clave API**, si el proveedor la necesita. El proyecto no incluye claves.
6. Opcionalmente marca **Recordar clave cifrada en Windows**. Si está desmarcada, la clave queda solo en memoria y tendrás que introducirla al reabrir la aplicación.
7. Pulsa **Guardar proveedor**.

| Tipo | URL base de ejemplo | Ruta que agrega NexoTerm |
| --- | --- | --- |
| API compatible con OpenAI | `https://api.openai.com/v1` o la URL base de tu proveedor compatible | `/chat/completions` |
| Anthropic | `https://api.anthropic.com/v1` | `/messages` |
| Ollama local | `http://127.0.0.1:11434` | `/api/chat` |

Ollama debe estar ejecutándose y tener instalado el modelo seleccionado. Puede utilizarse sin clave. Para servicios remotos se exige HTTPS; HTTP solo está permitido en localhost. Los permisos, la cuota y los costos de la API dependen de tu cuenta en el proveedor.

Abre una terminal, escribe la pregunta en la barra inferior y pulsa **Enviar** o **Ctrl+Enter**. La conversación pertenece a la pestaña seleccionada y la terminal sigue activa.

**Compartir salida depurada con el LLM** está desactivado por defecto. Si lo habilitas, al preguntar se envían hasta los últimos 16 000 caracteres del registro depurado. Revisa qué información contiene la sesión antes de compartirla. El asistente propone instrucciones y no ejecuta comandos.

Para cambiar de proveedor, guarda la URL, el modelo y la clave correspondientes. La casilla **Eliminar la clave actual** permite eliminar una clave anterior.

## 3. Activar el servidor MCP

El servidor viene integrado. **NexoTerm lo genera y lo inicia automáticamente** cuando activas MCP por primera vez; no debes instalar ni programar un servidor adicional.

1. Abre o selecciona la terminal que quieras compartir.
2. En la barra superior, abre **Sesión → Activar / desactivar MCP**.
3. Abre **Asistente → Copiar configuración MCP**.
4. En tu cliente MCP externo, importa la configuración copiada. Debe admitir **Streamable HTTP** y el encabezado **Authorization**. La ubicación de la configuración depende de cada cliente.

Ejemplo ilustrativo; utiliza los valores reales copiados desde NexoTerm:

```json
{
  "mcpServers": {
    "nexoterm": {
      "url": "http://127.0.0.1:PUERTO/mcp",
      "headers": {
        "Authorization": "Bearer TOKEN_TEMPORAL"
      }
    }
  }
}
```

El puerto y el token cambian al reiniciar el servidor. Copia nuevamente la configuración después de apagarlo o reabrir NexoTerm. No publiques el token ni lo agregues a un repositorio.

El servidor escucha solo en la computadora local, exige autenticación y comparte exclusivamente las sesiones que actives. Ofrece estas herramientas de lectura:

| Herramienta | Qué permite |
| --- | --- |
| `list_sessions` | Listar sesiones compartidas |
| `read_session` | Leer salida de terminal depurada de una sesión compartida |
| `nexoterm_help` | Consultar la guía de funciones de NexoTerm |

Para dejar de compartir una pestaña, desactiva MCP desde **Sesión**. Para detener el servidor completo, usa **Asistente → Apagar servidor MCP**.

La clave del proveedor LLM y el token MCP son credenciales distintas. MCP expone contexto a un cliente; configurar el modelo y su clave habilita el asistente integrado. Esta preview no conecta servidores MCP arbitrarios ni ejecuta comandos mediante MCP.

## 4. Guardar el trabajo y generar un informe

La salida depurada se guarda automáticamente en `session.md` dentro de `%APPDATA%\NexoTerm\sessions\<id>\`. `exit` termina la conexión y conserva su pestaña, conversación y registro. El historial permite recuperarlos después de cerrar la aplicación.

Para producir un PDF:

1. Selecciona texto de la terminal y pulsa **＋ Evidencia**.
2. Revisa el texto y elige su lenguaje.
3. Marca **Validado por mí** cuando hayas comprobado el resultado. Las evidencias fallidas o pendientes quedan fuera del informe.
4. Usa **Sesión → Confirmar acceso al equipo** si verificaste que el acceso fue funcional.
5. Pulsa **Sesión → Generar informe PDF** y luego **Abrir carpeta de la sesión** para encontrar `report.pdf` y `report.md`.

La bitácora completa conserva los errores depurados; el informe incluye solo las evidencias validadas por el operador. No se determina automáticamente si un comando Cisco aplicó cambios correctamente. El filtro de credenciales es preventivo: pausa el registro antes de manejar secretos y revisa los archivos antes de compartirlos.

## 5. Resolver problemas comunes

| Problema | Revisión |
| --- | --- |
| El asistente no responde | Confirma URL base, nombre del modelo y acceso a internet o al servicio local |
| HTTP 401/403 del proveedor | Revisa clave, permisos de la cuenta y acceso al modelo |
| HTTP 429 | Revisa cuota y límites del proveedor |
| Ollama no conecta | Verifica que esté ejecutándose en la URL indicada y que el modelo esté disponible |
| No se puede copiar configuración MCP | Activa MCP primero desde una sesión |
| El cliente MCP no conecta después de reiniciar | Copia nuevamente el puerto y el token generados |
| Un cliente web no conecta a MCP | Esta preview rechaza solicitudes con Origin; utiliza un cliente local compatible |
| El PDF no muestra un comando | Agrégalo como evidencia y clasifícalo como validado |

Más detalles, compilación y límites en el [README](https://github.com/Nstalej/NexoTerm#readme).
