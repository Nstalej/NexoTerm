const crypto = require('node:crypto');
const {stripVTControlCharacters} = require('node:util');

const MAX_LOG = 8 * 1024 * 1024;
class Redactor {
  constructor() { this.secrets = new Set(); this.privateKey = false; }
  add(secret) { if (typeof secret === 'string' && secret.length >= 3) this.secrets.add(secret); }
  clean(value) {
    let text = stripVTControlCharacters(String(value)).replace(/\r/g, '');
    for (const secret of this.secrets) text = text.split(secret).join('[REDACTADO]');
    return text.split('\n').map(line => {
      if (/-----BEGIN .*PRIVATE KEY-----/i.test(line)) this.privateKey = true;
      if (this.privateKey) {
        if (/-----END .*PRIVATE KEY-----/i.test(line)) this.privateKey = false;
        return '[CLAVE PRIVADA OMITIDA]';
      }
      if (/(?:password|passwd|passphrase|contrase[nñ]a|secret|community|api[_ -]?key|access[_ -]?token|authorization|credential|username|login as\s*:|^\s*login\s*:)/i.test(line)) return '[LÍNEA CON CREDENCIALES OMITIDA]';
      return line.replace(/\b(?:sk-[\w-]{10,}|gh[pousr]_[\w]{10,}|github_pat_[\w]{10,})\b/g, '[TOKEN OMITIDO]')
        .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTADO]@');
    }).join('\n');
  }
}
function fence(text, language = 'text') {
  const runs = String(text).match(/`+/g) || [];
  const mark = '`'.repeat(Math.max(3, ...runs.map(r => r.length + 1)));
  return `${mark}${language}\n${text}\n${mark}`;
}
function escapeHtml(text) { return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function validateProfile(p) {
  if (!p || !['ssh', 'telnet', 'serial', 'local'].includes(p.protocol)) throw Error('Protocolo no válido.');
  const profile = {name: String(p.name || p.host || 'Terminal local').slice(0, 100), protocol: p.protocol, host: String(p.host || '').trim(), port: Number(p.port || (p.protocol === 'telnet' ? 23 : 22)), username: String(p.username || '').trim(), serial: String(p.serial || '9600,8,n,1,N')};
  if (p.protocol !== 'local' && (!profile.host || profile.host.startsWith('-') || /[\s\x00-\x1f]/.test(profile.host) || profile.host.length > 253)) throw Error('Introduce un host o puerto COM válido.');
  if (!Number.isInteger(profile.port) || profile.port < 1 || profile.port > 65535) throw Error('Puerto fuera de rango.');
  if (profile.username && !/^[\w.@\\-]{1,128}$/.test(profile.username)) throw Error('Usuario no válido.');
  if (p.protocol === 'serial' && (!/^COM\d+$/i.test(profile.host) || !/^\d{3,7},[5-8],[neo],[12],[NXRD]$/i.test(profile.serial))) throw Error('Usa COM1 y configuración como 9600,8,n,1,N.');
  return profile;
}
function connectionCommand(profile, plink) {
  const p = validateProfile(profile);
  if (p.protocol === 'local') return {file: `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`, args: ['-NoLogo', '-NoProfile']};
  if (p.protocol === 'serial') return {file: plink, args: ['-serial', p.host, '-sercfg', p.serial]};
  const args = [`-${p.protocol}`, '-P', String(p.port)];
  if (p.protocol === 'ssh') args.push('-t', '-no-antispoof');
  if (p.username) args.push('-l', p.username);
  args.push(p.host);
  return {file: plink, args};
}
class SessionRecord {
  constructor(profile, id = crypto.randomUUID()) {
    this.id = id; this.profile = validateProfile(profile); this.started = new Date().toISOString();
    this.ended = null; this.status = 'connecting'; this.recording = true; this.transcript = ''; this.pending = '';
    this.redactor = new Redactor(); this.blocks = []; this.messages = []; this.authPrompts = 0; this.authFailures = 0; this.authenticated = false;
  }
  input(data) {
    // Input is never written to disk; collect secrets only while an authentication prompt is active.
    if (this.authInput !== undefined) {
      for (const c of data) {
        if (c === '\r' || c === '\n') { this.redactor.add(this.authInput); this.authInput = undefined; break; }
        else if (c === '\x7f' || c === '\b') this.authInput = this.authInput.slice(0, -1);
        else if (c >= ' ') this.authInput += c;
      }
      this.redactor.add(this.authInput);
    }
  }
  output(data) {
    // Keep unfinished lines in memory so chunk boundaries cannot bypass redaction.
    this.promptTail = ((this.promptTail || '') + stripVTControlCharacters(data)).slice(-2048);
    if (/(?:password|passphrase|contrase[nñ]a|login as|username)\s*(?:for [^\r\n]+)?\s*:\s*$/i.test(this.promptTail) && this.authInput === undefined) {
      this.authInput = ''; this.authPrompts++; this.promptTail = '';
    }
    if (/access denied|authentication failed|login incorrect/i.test(this.promptTail)) { this.authFailures++; this.promptTail = ''; }
    if (!this.recording) return;
    this.pending += data;
    const last = this.pending.lastIndexOf('\n');
    if (last >= 0) { this.append(this.redactor.clean(this.pending.slice(0, last + 1))); this.pending = this.pending.slice(last + 1); }
    if (this.pending.length > 65536) { this.pending = ''; this.append('\n[LÍNEA EXCESIVA OMITIDA]\n'); }
  }
  append(text) {
    if (this.transcript.length + text.length > MAX_LOG) { this.recording = false; this.pending = ''; this.transcript += '\n[Registro pausado: límite de 8 MiB alcanzado.]\n'; return; }
    this.transcript += text;
  }
  flush() { if (this.recording && this.pending) this.append(this.redactor.clean(this.pending)); this.pending = ''; }
  snapshot() {
    return {id: this.id, profile: {...this.profile, username: ''}, started: this.started, ended: this.ended, status: this.status, recording: this.recording, transcript: this.transcript, blocks: this.blocks, messages: this.messages, authPrompts: this.authPrompts, authFailures: this.authFailures, authenticated: this.authenticated};
  }
  addBlock(text, status, language = 'text') {
    if (!['verified', 'failed', 'pending'].includes(status)) throw Error('Estado no válido.');
    if (typeof text !== 'string' || !text.trim() || text.length > 100000) throw Error('Selecciona un fragmento de hasta 100 000 caracteres.');
    if (!/^[a-zA-Z0-9+-]{1,24}$/.test(language)) throw Error('Lenguaje no válido.');
    const block = {id: crypto.randomUUID(), text: this.redactor.clean(text), status, language, time: new Date().toISOString()};
    this.blocks.push(block); return block;
  }
}
function reportMarkdown(s, full = false) {
  const verified = s.blocks.filter(b => b.status === 'verified');
  let text = `# NexoTerm · ${s.profile.name}\n\nInicio: ${s.started}\n\nProtocolo: ${s.profile.protocol}\n\nEstado: ${s.status}\n\n`;
  text += `## Acceso\n\nSolicitudes de autenticación observadas: ${s.authPrompts}. Rechazos observados: ${s.authFailures}.\n\n${s.authenticated ? 'El operador confirmó el acceso con credenciales funcionales.' : 'Acceso pendiente de confirmación por el operador.'}\n\n`;
  text += '## Trabajo validado por el operador\n\n';
  text += verified.length ? verified.map((b, i) => `### Evidencia ${i+1}\n\n${fence(b.text, b.language)}\n`).join('\n') : 'Aún no hay evidencias validadas.\n';
  text += `\nFragmentos fallidos excluidos: ${s.blocks.filter(b => b.status === 'failed').length}. Fragmentos pendientes excluidos: ${s.blocks.filter(b => b.status === 'pending').length}.\n`;
  if (full) {
    text += `\n## Bitácora de terminal depurada\n\nLa bitácora conserva errores; el informe solo incluye evidencias validadas.\n\n${fence(s.transcript)}\n\n## Asistente\n\n`;
    text += s.messages.map(m => `### ${m.role === 'user' ? 'Usuario' : 'Asistente'}\n\n${fence(m.content)}\n`).join('\n');
  }
  return text;
}
function reportHtml(s) {
  const blocks = s.blocks.filter(b => b.status === 'verified');
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Informe NexoTerm</title><style>@page{margin:18mm}body{font:12px Arial;color:#172334}h1{font-size:27px;color:#146d65}h2{font-size:17px;margin-top:28px}header{border-bottom:2px solid #168477;padding-bottom:14px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef3f6;border-left:3px solid #168477;padding:12px;font:10px Consolas,monospace}p{line-height:1.6}.meta{color:#536577}footer{margin-top:25px;color:#536577}</style><header><h1>NexoTerm · Informe de sesión</h1><p>${escapeHtml(s.profile.name)}</p></header><p class="meta">Inicio: ${escapeHtml(s.started)}<br>Protocolo: ${escapeHtml(s.profile.protocol)} · Estado: ${escapeHtml(s.status)}</p><h2>Acceso al equipo</h2><p>Solicitudes observadas: ${s.authPrompts}. Rechazos observados: ${s.authFailures}.<br>${s.authenticated ? 'Acceso con credenciales funcionales confirmado por el operador.' : 'Acceso pendiente de confirmación del operador.'}</p><h2>Trabajo validado</h2>${blocks.length ? blocks.map((b,i) => `<h3>Evidencia ${i+1} · ${escapeHtml(b.language)}</h3><pre>${escapeHtml(b.text)}</pre>`).join('') : '<p>Aún no hay evidencias validadas.</p>'}<footer>Se excluyen fragmentos fallidos y pendientes. La validación representa la confirmación del operador; no demuestra por sí sola que un equipo remoto aplicó cambios.</footer></html>`;
}
module.exports = {Redactor, SessionRecord, validateProfile, connectionCommand, fence, reportMarkdown, reportHtml, escapeHtml};
