# Componentes de terceros

NexoTerm es un proyecto independiente. No es una versión oficial de PuTTY ni está afiliado con sus autores.

- **PuTTY / Plink 0.85** — Simon Tatham y colaboradores, licencia MIT. Se distribuye el ejecutable original `vendor/plink.exe`, sin modificar. El texto íntegro de su licencia está en `vendor/putty-LICENCE.txt` y se incluye en la aplicación. Fuente y descargas: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html
- **node-pty** — Microsoft y colaboradores, MIT; incluye componentes ConPTY con sus avisos en el paquete.
- **xterm.js y addon-fit** — The xterm.js authors, MIT.
- **MCP TypeScript SDK** — Model Context Protocol contributors, MIT.
- **Zod** — Colin McDonnell y colaboradores, MIT.
- **Electron** — Electron contributors, MIT; Chromium y otros componentes conservan sus licencias en `LICENSES.chromium.html` junto al ejecutable instalado o extraído.

Los paquetes conservan sus archivos de licencia dentro de la distribución. Las herramientas de desarrollo y sus versiones exactas están en `package-lock.json`.
