const {app,BrowserWindow,ipcMain,Menu,dialog,shell,safeStorage,clipboard} = require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {fileURLToPath}=require('node:url');
const {SessionRecord,validateProfile,connectionCommand,reportMarkdown,reportHtml,Redactor}=require('./core.cjs');
const {askProvider,validateProvider}=require('./providers.cjs');
const {startMcp,GUIDE}=require('./mcp.cjs');
app.setName('NexoTerm');
if(process.env.NEXOTERM_TEST_DATA) app.setPath('userData',process.env.NEXOTERM_TEST_DATA);
let win,root,settings,providerKey='',mcp=null,closing=false;
const sessions=new Map();
const uiPath=path.join(__dirname,'..','ui','index.html');
const settingsDefault={profiles:[],draft:{name:'Nueva conexión',protocol:'ssh',host:'',port:22,username:'',serial:'9600,8,n,1,N'},provider:{kind:'compatible',baseUrl:'https://api.openai.com/v1',model:'',shareContext:false},encryptedKey:''};
function atomicWrite(file,data){const temp=file+'.tmp';fs.writeFileSync(temp,data,{mode:0o600});fs.renameSync(temp,file);}
function saveSettings(){atomicWrite(path.join(root,'settings.json'),JSON.stringify(settings,null,2));}
function persist(s){
  const folder=path.join(root,'sessions',s.id);fs.mkdirSync(folder,{recursive:true});
  const snap=s.snapshot();atomicWrite(path.join(folder,'session.json'),JSON.stringify(snap,null,2));atomicWrite(path.join(folder,'session.md'),reportMarkdown(snap,true));s.dirty=false;
}
function session(id){const s=sessions.get(id);if(!s)throw Error('Sesión inexistente.');return s;}
function info(s){return {id:s.id,name:s.profile.name,profile:s.profile,status:s.status,recording:s.recording,mcpEnabled:!!s.mcpEnabled,authenticated:s.authenticated,blocks:s.blocks,messages:s.messages};}
function emit(name,data){if(win&&!win.isDestroyed())win.webContents.send(name,data);}
function notify(s){emit('session:state',info(s));}
function plinkPath(){const bundled=path.join(__dirname,'..','vendor','plink.exe');return fs.existsSync(bundled)?bundled:path.join(process.env.ProgramFiles||'C:\\Program Files','PuTTY','plink.exe');}
function openSession(profile){
  if([...sessions.values()].filter(s=>s.pty).length>=16)throw Error('Máximo 16 conexiones simultáneas.');
  const s=new SessionRecord(profile);s.redactor.add(profile.username);s.redactor.add(providerKey);sessions.set(s.id,s);
  const command=connectionCommand(s.profile,plinkPath());
  if(!fs.existsSync(command.file)) {sessions.delete(s.id);throw Error('No se encontró Plink. Reinstala NexoTerm o instala PuTTY.');}
  let proc;
  try{
    const env={...process.env,TERM:'xterm-256color'};
    // Child shells must not inherit API credentials from the application environment.
    for(const name of Object.keys(env)){if(/(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(name)) delete env[name];}
    proc=require('node-pty').spawn(command.file,command.args,{name:'xterm-256color',cols:100,rows:30,cwd:root,env,useConpty:true});
  }catch{sessions.delete(s.id);throw Error('No se pudo iniciar la terminal. Revisa Plink y los permisos.');}
  s.pty=proc;s.status='active';s.dirty=true;
  proc.onData(data=>{s.output(data);s.dirty=true;emit('terminal:data',{id:s.id,data});});
  proc.onExit(({exitCode})=>{s.pty=null;s.flush();s.status=`closed (${exitCode})`;s.ended=new Date().toISOString();persist(s);emit('terminal:data',{id:s.id,data:`\r\n\x1b[90m[Conexión finalizada · código ${exitCode}. La sesión permanece abierta.]\x1b[0m\r\n`});notify(s);});
  persist(s);return info(s);
}
function secureHandle(channel,handler){ipcMain.handle(channel,async(event,...args)=>{
  try{
    if(event.sender!==win?.webContents || !event.senderFrame || fileURLToPath(event.senderFrame.url)!==uiPath)throw Error('Origen no válido.');
    return {ok:true,value:await handler(...args)};
  }catch(error){return {ok:false,error:error.message};}
});}
async function pdfFor(id){
  const s=session(id);if(!s.pty)s.flush();persist(s);
  const snapshot=JSON.parse(fs.readFileSync(path.join(root,'sessions',s.id,'session.json'),'utf8'));
  const folder=path.join(root,'sessions',s.id);atomicWrite(path.join(folder,'report.md'),reportMarkdown(snapshot));
  const pdfWin=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  pdfWin.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  try{
    await pdfWin.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(reportHtml(snapshot)));
    const pdf=await pdfWin.webContents.printToPDF({printBackground:true,pageSize:'A4',displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-size:8px;text-align:center;width:100%">NexoTerm · <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
    const file=path.join(folder,'report.pdf');atomicWrite(file,pdf);return file;
  }finally{pdfWin.destroy();}
}
function handlers(){
  secureHandle('app:initial',()=>({settings:{...settings,encryptedKey:undefined},hasKey:!!providerKey,guide:GUIDE,dataRoot:root,version:app.getVersion(),mcpRunning:!!mcp}));
  secureHandle('settings:draft',p=>{settings.draft={name:String(p.name||'').slice(0,100),protocol:String(p.protocol),host:String(p.host||'').slice(0,253),port:Number(p.port),username:String(p.username||'').slice(0,128),serial:String(p.serial||'').slice(0,50)};saveSettings();});
  secureHandle('profile:save',p=>{const profile=validateProfile(p);if(settings.profiles.length>=100&&!settings.profiles.some(x=>x.name===profile.name))throw Error('Límite de 100 perfiles.');settings.profiles=settings.profiles.filter(x=>x.name!==profile.name);settings.profiles.push(profile);saveSettings();return settings.profiles;});
  secureHandle('profile:delete',name=>{settings.profiles=settings.profiles.filter(x=>x.name!==name);saveSettings();return settings.profiles;});
  secureHandle('provider:save',async p=>{
    const config=validateProvider(p);if(p.key&&typeof p.key!=='string')throw Error('Clave no válida.');if(p.key?.length>4096)throw Error('Clave demasiado larga.');
    let nextKey=p.clearKey?'':(p.key||providerKey),encrypted='';
    if(p.remember&&nextKey){if(!await safeStorage.isAsyncEncryptionAvailable())throw Error('El cifrado de Windows no está disponible. Usa la clave solo en memoria.');encrypted=(await safeStorage.encryptStringAsync(nextKey)).toString('base64');}
    providerKey=nextKey;settings.provider=config;settings.encryptedKey=encrypted;saveSettings();for(const s of sessions.values())s.redactor.add(providerKey);return {hasKey:!!providerKey};
  });
  secureHandle('session:new',openSession);
  secureHandle('terminal:input',(id,data)=>{const s=session(id);if(typeof data!=='string'||data.length>65536)throw Error('Entrada demasiado grande.');if(s.pty){s.input(data);s.pty.write(data);}});
  secureHandle('terminal:resize',(id,cols,rows)=>{if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<2||cols>500||rows<2||rows>250)return;session(id).pty?.resize(cols,rows);});
  secureHandle('session:disconnect',id=>{session(id).pty?.kill();});
  secureHandle('session:record',(id,enabled)=>{const s=session(id);s.recording=!!enabled;s.pending='';s.append(`\n[Registro ${enabled?'reanudado':'pausado'}]\n`);persist(s);notify(s);return info(s);});
  secureHandle('session:access',id=>{const s=session(id);s.authenticated=true;persist(s);notify(s);return info(s);});
  secureHandle('session:evidence',(id,text,status,language)=>{const s=session(id);s.addBlock(text,status,language);persist(s);notify(s);return info(s);});
  secureHandle('session:block',(id,blockId,status)=>{const s=session(id);if(!['verified','failed','pending'].includes(status))throw Error('Estado no válido.');const b=s.blocks.find(b=>b.id===blockId);if(!b)throw Error('Evidencia inexistente.');b.status=status;persist(s);notify(s);return info(s);});
  secureHandle('session:save',id=>{const s=session(id);if(!s.pty)s.flush();persist(s);return path.join(root,'sessions',s.id,'session.md');});
  secureHandle('session:pdf',pdfFor);
  secureHandle('session:folder',id=>shell.openPath(path.join(root,'sessions',session(id).id)));
  secureHandle('session:history',()=>fs.readdirSync(path.join(root,'sessions'),{withFileTypes:true}).filter(d=>d.isDirectory()&&/^[a-f0-9-]{36}$/.test(d.name)).map(d=>{try{const s=JSON.parse(fs.readFileSync(path.join(root,'sessions',d.name,'session.json'),'utf8'));return {id:s.id,name:s.profile.name,started:s.started,status:s.status};}catch{return null;}}).filter(Boolean).sort((a,b)=>b.started.localeCompare(a.started)));
  secureHandle('session:restore',id=>{
    if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Identificador no válido.');
    if(sessions.has(id))return {...info(session(id)),transcript:session(id).transcript};
    const snap=JSON.parse(fs.readFileSync(path.join(root,'sessions',id,'session.json'),'utf8'));const s=new SessionRecord(snap.profile,id);
    Object.assign(s,{started:snap.started,ended:snap.ended,transcript:snap.transcript,blocks:snap.blocks,messages:snap.messages,authPrompts:snap.authPrompts,authFailures:snap.authFailures,authenticated:snap.authenticated,status:'archived',recording:false});s.redactor.add(providerKey);sessions.set(id,s);return {...info(s),transcript:s.transcript};
  });
  secureHandle('assistant:ask',async(id,text,shareContext)=>{
    const s=session(id);if(s.asking)throw Error('Espera la respuesta anterior de esta sesión.');if(typeof text!=='string'||!text.trim()||text.length>12000)throw Error('Escribe hasta 12 000 caracteres.');
    if(!settings.provider.model)throw Error('Configura el proveedor y modelo en Asistente.');
    const user={role:'user',content:s.redactor.clean(text)};s.asking=true;
    try{
      const messages=[...s.messages,user];const answer=await askProvider(settings.provider,providerKey,messages,shareContext?s.transcript.slice(-16000):'');
      s.messages.push(user,{role:'assistant',content:s.redactor.clean(answer)});if(s.messages.length>200)s.messages=s.messages.slice(-200);persist(s);return s.messages;
    }finally{s.asking=false;}
  });
  secureHandle('mcp:toggleSession',async(id,enabled)=>{const s=session(id);if(enabled&&!mcp)mcp=await startMcp(()=>[...sessions.values()].filter(x=>x.mcpEnabled).map(x=>x.snapshot()));s.mcpEnabled=!!enabled;notify(s);return {enabled:s.mcpEnabled,running:!!mcp};});
  secureHandle('mcp:copy',()=>{if(!mcp)throw Error('Activa MCP en una sesión primero.');clipboard.writeText(JSON.stringify(mcp.config,null,2));return true;});
  secureHandle('mcp:stop',async()=>{if(mcp)await mcp.stop();mcp=null;for(const s of sessions.values()){s.mcpEnabled=false;notify(s);}return true;});
  secureHandle('app:guide',()=>GUIDE);
}
app.whenReady().then(async()=>{
  root=app.getPath('userData');fs.mkdirSync(path.join(root,'sessions'),{recursive:true});
  try{settings={...settingsDefault,...JSON.parse(fs.readFileSync(path.join(root,'settings.json'),'utf8'))};}catch{settings=structuredClone(settingsDefault);}
  if(settings.encryptedKey){try{const result=await safeStorage.decryptStringAsync(Buffer.from(settings.encryptedKey,'base64'));providerKey=typeof result==='string'?result:result.result;}catch{providerKey='';}}
  handlers();Menu.setApplicationMenu(null);
  win=new BrowserWindow({width:1450,height:920,minWidth:1050,minHeight:680,backgroundColor:'#0c141f',title:'NexoTerm',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.on('close',event=>{if(closing)return;const active=[...sessions.values()].filter(s=>s.pty).length;if(active){const answer=dialog.showMessageBoxSync(win,{type:'question',buttons:['Seguir trabajando','Cerrar conexiones y salir'],defaultId:0,cancelId:0,message:`Hay ${active} conexiones activas. ¿Cerrar NexoTerm?`,detail:'Las bitácoras depuradas se guardarán antes de salir.'});if(answer===0){event.preventDefault();return;}}closing=true;for(const s of sessions.values()){if(s.pty)s.pending='';else s.flush();s.status=s.pty?'closed (app exit)':s.status;persist(s);s.pty?.kill();}});
  await win.loadFile(uiPath);
  setInterval(()=>{for(const s of sessions.values())if(s.dirty)persist(s);},2000).unref();
});
app.on('window-all-closed',async()=>{if(mcp)await mcp.stop();app.quit();});
