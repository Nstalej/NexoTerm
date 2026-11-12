# Revisión del PuTTY instalado y decisiones de reconstrucción

Fecha: 12 de noviembre de 2026.

## Observaciones del artefacto

- Ubicación: `C:\Program Files\PuTTY\putty.exe`.
- Versión obtenida de metadatos Windows: Release 0.83, sin ayuda incrustada.
- SHA-256: `12498d4e4bf07747a9a52d6803d3211fd731ded6473b41cf4795ac56947d0366`.
- REA `inspect_pe_resources`: PE32+, x86-64; 1 342 056 bytes, 23 recursos inspeccionados con cobertura completa del árbol de recursos.
- Evidence ID: `ev_03dd5ff2a7e22aee98aafd781df89a8bf42c1ac9a202a80e926550d729e95ffb`.
- Se observaron recursos de diálogo, iconos, versión y manifest. Este análisis no ejecutó PuTTY ni estableció por sí solo el flujo de las ventanas.
- El `plink.exe` instalado informa Release 0.83 y commit fuente `d2c178c49a0ae6fa9ef75ca84fb3c9d0d675ea85`. Su ayuda declara conexiones SSH, Telnet y serial, carga de perfiles y parámetros seriales.

## Corroboración en código fuente oficial 0.83

Se descargó el ZIP de fuentes oficial `https://the.earth.li/~sgtatham/putty/0.83/putty-src.zip` para revisar el flujo sin decompilar código abierto disponible.

- `windows/dialog.c:713`: `do_config` crea el cuadro de configuración mediante `ShinyDialogBox`, después libera su estructura y devuelve el resultado.
- `windows/dialog.c:112` y `:124`: al finalizar el diálogo se invoca `ShinyEndDialog`.
- `windows/putty.c:137` y `:150`: la preparación del lanzamiento llama a `do_config` y continúa según su resultado.

Conclusión derivada: el cuadro de configuración se implementa como un diálogo del flujo de lanzamiento, lo que explica por qué no funciona como un panel persistente de un espacio con varias terminales. No se parcheó el binario instalado.

## Diseño adoptado

NexoTerm es una aplicación independiente con Electron, xterm.js y ConPTY. Los procesos de conexión son independientes de la ventana y de los datos de sesión. El cierre de un proceso cambia el estado de una pestaña, conservando la ventana y la conversación.

Se incluye Plink **0.85** oficial sin modificar para el transporte, con su licencia MIT. Su SHA-256 coincide con la entrada `w64/plink.exe` del archivo oficial de checksums y la verificación Authenticode local indicó `Valid`:

`969f36879d5716aa1a9811f43a6a6510e8f08372dbeb9695b810b9c776f39c75`

## Cobertura y preguntas restantes

| Pregunta | Estado |
| --- | --- |
| Identidad y recursos del PuTTY instalado | Respondida con evidencia estática REA |
| Separación entre configuración y lanzamiento | Corroborada en fuentes oficiales 0.83; no observación de ejecución |
| Nuevo ciclo de ventana y terminales | Implementado; verificación con PowerShell real |
| MCP autenticado y aislamiento entre sesiones | Implementado; probado con SDK cliente real |
| Redacción y exclusión de errores del informe | Implementada; casos automatizados; secretos arbitrarios siguen requiriendo revisión |
| Funcionamiento en equipos Cisco/serial físicos | Pendiente de disponer de equipos y conexiones autorizadas |
| Compatibilidad con cuentas LLM comerciales | Adaptadores y pruebas simuladas; sin claves ni llamadas de pago |

No se hizo una auditoría completa de seguridad del PuTTY instalado ni una decompilación exhaustiva. La inspección REA utilizada es independiente del estado de una sesión de disassembler, por lo que no se abrió ni quedó pendiente cerrar un binario activo.
