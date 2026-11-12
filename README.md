# NexoTerm

Terminal para Windows con configuración persistente, conexiones basadas en PuTTY/Plink, asistente LLM configurable por usuario, servidor MCP local y bitácoras Markdown con informes PDF.

**Estado: 0.1.0 preview.** Primera versión funcional. Proyecto independiente de PuTTY; no modifica la instalación existente. Windows 10/11 de 64 bits.

## Descargas

- [Instalador Windows x64](https://github.com/Nstalej/NexoTerm/releases/download/v0.1.0/NexoTerm-0.1.0-setup.exe)
- [Ejecutable portable Windows x64](https://github.com/Nstalej/NexoTerm/releases/download/v0.1.0/NexoTerm-0.1.0-portable.exe)
- [Release, archivos y checksums](https://github.com/Nstalej/NexoTerm/releases/tag/v0.1.0)
- [Guía rápida: configurar proveedor LLM y servidor MCP](docs/CONFIGURACION.md)

## Funciones

- Configuración a la izquierda que permanece abierta al iniciar o terminar conexiones.
- Terminales por pestañas con emulación xterm y conexiones SSH, Telnet, serial o PowerShell local.
- Motor Plink 0.85 incluido y verificado mediante SHA-256.
- Perfiles de conexión sin contraseñas. Las credenciales SSH se escriben directamente en la terminal; se pueden usar las claves gestionadas por Pageant.
- Asistente a la izquierda de la terminal, con conversación independiente por sesión. La entrada de texto ocupa todo el ancho inferior de la ventana. La terminal sigue funcionando durante las consultas.
- Proveedor configurable: API compatible con OpenAI, Anthropic u Ollama local. Cada usuario agrega su modelo, URL y clave. No se distribuyen claves. Se puede conservar la clave solo en memoria o cifrarla con Windows DPAPI.
- Contexto de terminal para el LLM desactivado por defecto; se habilita por pestaña y solo se envía al preguntar.
- Servidor MCP generado por la aplicación, autenticado y de solo lectura. Se activa por sesión y permite integrar clientes MCP externos.
- Guardado automático de bitácoras depuradas en `.md` cada dos segundos y al terminar la conexión. El informe PDF y su Markdown incluyen únicamente las evidencias que el operador ha validado.
- Historial recuperable después de cerrar la aplicación. `exit` termina la conexión y conserva la pestaña, conversación y registros. Reconectar crea una sesión nueva y conserva la anterior.

## Instalar y comenzar

1. Ejecuta `NexoTerm-0.1.0-setup.exe` para instalar por usuario, o `NexoTerm-0.1.0-portable.exe` sin instalación.
2. En **Conexión**, indica nombre, protocolo, host, puerto y usuario opcional. Para serial, usa un puerto como `COM3` y parámetros como `115200,8,n,1,N`.
3. Pulsa **Abrir terminal**. Para probar sin equipos remotos, usa **PowerShell local**.
4. En una conexión SSH nueva, verifica la huella que muestra Plink antes de aceptarla. NexoTerm no acepta claves de host automáticamente. Plink utiliza la caché de claves de host de PuTTY del usuario.
5. Puedes guardar el perfil y abrir otras terminales. Las configuraciones y pestañas permanecen visibles.

## Configurar el LLM

Abre **Asistente**, selecciona tipo, URL base y nombre del modelo que ofrece tu proveedor. Agrega tu propia clave; Ollama puede funcionar sin clave.

| Tipo | Ejemplo de URL base | Ruta utilizada |
| --- | --- | --- |
| Compatible con OpenAI | `https://api.openai.com/v1` o la URL de tu proveedor | `/chat/completions` |
| Anthropic | `https://api.anthropic.com/v1` | `/messages` |
| Ollama | `http://127.0.0.1:11434` | `/api/chat` |

No incluyas la ruta final en la URL base. HTTPS es obligatorio salvo en localhost. Las redirecciones no se siguen para evitar reenviar claves a otro destino. El nombre de modelo lo define el usuario; no se presume que una cuenta tenga acceso a un modelo específico.

Marca **Recordar clave cifrada en Windows** si quieres conservarla entre aperturas. Si lo desmarcas y guardas, la clave queda solo en memoria. **Eliminar la clave actual** la elimina. Ninguna clave se incluye en el repositorio, los informes ni las herramientas MCP. Los costos de uso pertenecen al proveedor y a la cuenta del usuario.

Selecciona una pestaña, escribe en la barra inferior y pulsa **Enviar** o **Ctrl+Enter**. Marca **Compartir salida depurada con el LLM** solo si quieres enviar las últimas 16 000 posiciones de la bitácora. El asistente propone pasos; los comandos se escriben en la terminal por el operador.

## MCP automático

**La aplicación crea y configura su servidor MCP automáticamente al activar MCP por primera vez desde Sesión.** No hay que programar un servidor ni instalar Node.js para el ejecutable distribuido.

1. En una terminal, abre **Sesión → Activar / desactivar MCP**.
2. En **Asistente**, pulsa **Copiar configuración MCP**.
3. Pega la configuración generada en un cliente que admita MCP Streamable HTTP y encabezado `Authorization`. El formato concreto de importación depende del cliente.

La configuración copiada tiene esta estructura, con puerto y token reales generados por la aplicación:

```json
{
  "mcpServers": {
    "nexoterm": {
      "url": "http://127.0.0.1:PUERTO/mcp",
      "headers": { "Authorization": "Bearer TOKEN_TEMPORAL" }
    }
  }
}
```

El token y el puerto cambian cuando se reinicia el servidor; copia nuevamente la configuración. No publiques el token. El servidor escucha únicamente en `127.0.0.1`, rechaza peticiones con `Origin` y valida el host. Una sesión no activada queda fuera de las herramientas. Apaga todo el servidor desde **Asistente → Apagar servidor MCP**.

Herramientas disponibles:

| Herramienta | Función |
| --- | --- |
| `list_sessions` | Lista solamente sesiones compartidas |
| `read_session` | Lee hasta 16 000 caracteres de salida depurada de una sesión compartida |
| `nexoterm_help` | Explica las funciones de la aplicación |

MCP es un protocolo de acceso a contexto y herramientas; la conexión al modelo se configura por separado. El asistente integrado usa el mismo registro depurado mediante su casilla de contexto. Esta versión no conecta servidores MCP arbitrarios ni permite ejecutar comandos a través de MCP.

## Bitácoras e informes

Los datos se crean en `%APPDATA%\NexoTerm\`. La versión portable también utiliza esta carpeta del usuario.

```text
NexoTerm/
  settings.json             # perfiles y clave LLM cifrada, si se solicitó
  sessions/
    <id-de-sesion>/
      session.json          # estado y datos depurados
      session.md            # bitácora completa depurada y conversación
      report.md             # informe con evidencias validadas
      report.pdf            # mismo informe para compartir
```

La bitácora puede contener errores para mantener el contexto. **El informe excluye fragmentos fallidos y pendientes**. Para documentar un resultado:

1. Selecciona el comando y su salida en la terminal.
2. Pulsa **＋ Evidencia**, revisa y depura el texto.
3. Indica lenguaje y resultado. Marca **Validado por mí** solo cuando hayas confirmado el efecto del comando. También puedes marcar un fragmento como fallido o pendiente.
4. Si comprobaste que ingresaste al equipo, usa **Sesión → Confirmar acceso al equipo**.
5. Usa **Sesión → Generar informe PDF**. Los archivos se generan desde la instantánea persistida de la sesión. Abre la carpeta desde el mismo menú.

Los comandos se muestran en bloques de código con el lenguaje elegido. El PDF utiliza texto de terminal, no capturas de pantalla. No requiere un LLM para producir el informe.

No se deduce automáticamente que un comando Cisco tuvo éxito por no mostrar un error: los equipos no ofrecen un código de salida uniforme. La validación corresponde al operador. Los contadores de autenticación reflejan prompts y rechazos reconocidos, no una auditoría exhaustiva de intentos. Solo se afirma acceso funcional cuando el operador lo confirma.

## Privacidad del registro

- No se registra directamente lo que escribes. Se registra la salida mostrada por el equipo, depurada por líneas completas.
- Se omiten líneas con indicadores de contraseña, secretos, comunidades SNMP, usuarios, tokens, claves API y claves privadas. Se ocultan también secretos conocidos ingresados en prompts de autenticación y la clave LLM configurada.
- Las líneas incompletas permanecen en memoria hasta completarse; guardar manualmente una conexión activa no fuerza su escritura. Al salir de la aplicación pueden omitirse fragmentos incompletos para no guardar secretos partidos.
- **El filtro es preventivo y no garantiza reconocer cualquier secreto arbitrario mostrado por un equipo.** Pausa el registro desde Sesión antes de manejar datos sensibles y revisa las evidencias antes de compartir informes. La salida original permanece visible en la terminal de esa ejecución.
- Una bitácora alcanza como máximo 8 MiB de texto por sesión; al alcanzar el límite, el registro se pausa. El historial visual conserva 10 000 líneas. Los perfiles, conversaciones y bitácoras permanecen en el disco local hasta que el usuario los elimine.
- La contraseña de un equipo no se envía como argumento de proceso ni se guarda en un archivo de acceso. DPAPI protege claves LLM entre usuarios de Windows, pero no frente a otros procesos del mismo usuario.

## Desarrollar y compilar

Requisitos: Windows x64, Node.js 24 y npm. El ejecutable final no requiere Node.js, Python ni PuTTY preinstalados.

```powershell
npm ci
npm run vendor
npm test
npm run build
npm run test:e2e
npm start
npm run dist
```

`npm run vendor` descarga Plink 0.85 del sitio oficial y verifica el SHA-256 fijado en el código. No utiliza una copia de PuTTY que se encuentre casualmente en el equipo de compilación. Los binarios se escriben en `release/`. `node-pty` utiliza sus binarios precompilados de Windows; `npmRebuild` está desactivado para conservarlos.

Las pruebas unitarias cubren filtrado de credenciales con límites de fragmentos, claves privadas, validación de conexiones, construcción de peticiones LLM, exclusión de errores del informe y un cliente MCP real. La integración abre dos PowerShell reales, prueba el proveedor con un servidor HTTP simulado sin usar servicios de pago, genera PDF, verifica el cifrado y recarga de la clave, cierra conexiones y recupera el historial.

## GitHub y releases

Repositorio preparado con licencia MIT, README, notas de versión y GitHub Actions. El flujo Windows compila y verifica el proyecto. Al publicar un tag `v*`, construye instalador y portable, genera checksums y crea un **borrador de release** con ambos ejecutables. Consulta `docs/RELEASE.md` antes de publicar.

Los ejecutables de esta preview no tienen firma de editor propia. La firma de Plink se conserva en su archivo original.

## Límites de la preview

Probado localmente con PowerShell y pruebas automatizadas. Las conexiones con equipos SSH/Cisco, Telnet y serial físicos necesitan validación en tu entorno. No incluye SFTP, túneles SSH configurables, macros, importación de todos los parámetros del registro PuTTY, streaming del LLM ni clasificación automática universal de comandos. No se han realizado llamadas a proveedores LLM de pago durante la construcción.

## Referencias

- [PuTTY y descargas oficiales](https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html)
- [Licencia de PuTTY](https://www.chiark.greenend.org.uk/~sgtatham/putty/licence.html)
- [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/)
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
- `docs/REA-REVIEW.md`: identidad del PuTTY instalado, evidencia REA y límites de la revisión.

Licencia del proyecto: MIT. Avisos de componentes en `THIRD_PARTY_NOTICES.md`.
