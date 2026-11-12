const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const http=require('node:http');const {_electron}=require('playwright-core');
const project=path.resolve(__dirname,'..');const artifacts=path.resolve(process.env.NEXOTERM_TEST_ARTIFACTS||path.join(project,'test-results'));
fs.mkdirSync(artifacts,{recursive:true});const dataRoot=path.join(artifacts,'profile-'+Date.now());
const observed=[];const server=http.createServer(async(req,res)=>{let body='';for await(const part of req)body+=part;observed.push(JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({choices:[{message:{content:'Respuesta de prueba del proveedor simulado. La terminal sigue activa. Para documentar el trabajo: selecciona la salida, agrégala como evidencia validada y genera el informe PDF desde Sesión.'}}]}));});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(await fn())return;await wait(150);}throw Error('Condition timed out');}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const env={...process.env,NEXOTERM_TEST_DATA:dataRoot};delete env.ELECTRON_RUN_AS_NODE;const executablePath=process.env.NEXOTERM_TEST_EXE||require('electron');const args=process.env.NEXOTERM_TEST_EXE?[]:[project];let desktop;
try{
  desktop=await _electron.launch({executablePath,args,env,timeout:45000});const page=await desktop.firstWindow();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForSelector('#local-welcome');await page.screenshot({path:path.join(artifacts,'01-inicio.png')});
  await page.click('#local-welcome');await page.waitForSelector('.tab.active');assert.equal(await page.locator('#connection').isVisible(),true);
  const initial=await page.evaluate(()=>window.nexo.call('app:initial'));assert.equal(initial.hasKey,false);
  const getSessions=()=>fs.readdirSync(path.join(dataRoot,'sessions'));
  await until(()=>getSessions().length===1);const first=getSessions()[0];
  await page.evaluate(id=>window.nexo.call('terminal:input',id,"Write-Output 'NEXOTERM_SESSION_ONE'\r"),first);
  await until(()=>fs.readFileSync(path.join(dataRoot,'sessions',first,'session.md'),'utf8').includes('NEXOTERM_SESSION_ONE'));
  await page.selectOption('#protocol','local');await page.fill('#profile-name','Laboratorio local · sesión 2');await page.click('#connect');await until(()=>getSessions().length===2);
  const second=getSessions().find(id=>id!==first);await page.evaluate(id=>window.nexo.call('terminal:input',id,"Write-Output 'NEXOTERM_SESSION_TWO'\r"),second);
  await page.waitForFunction(()=>document.querySelectorAll('.tab').length===2 && document.querySelector('.tab.active')?.textContent.includes('sesión 2'));
  await until(()=>fs.readFileSync(path.join(dataRoot,'sessions',second,'session.md'),'utf8').includes('NEXOTERM_SESSION_TWO'));
  const provider={kind:'compatible',baseUrl:`http://127.0.0.1:${server.address().port}/v1`,model:'modelo-simulado',key:'test-only-credential',remember:true};
  await page.evaluate(p=>window.nexo.call('provider:save',p),provider);
  const stored=JSON.parse(fs.readFileSync(path.join(dataRoot,'settings.json'),'utf8'));assert.ok(stored.encryptedKey);assert.ok(!JSON.stringify(stored).includes('test-only-credential'));
  // Exercise the actual renderer submit flow, including the full-width composer.
  await page.fill('#chat-input','¿Cómo documento esta prueba local?');await page.click('#send-chat');await page.waitForSelector('.message.assistant');assert.equal(observed.length,1);assert.ok(!JSON.stringify(observed[0]).includes('NEXOTERM_SESSION_TWO'));
  await page.check('#share-context');await page.fill('#chat-input','Revisa el contexto compartido.');await page.click('#send-chat');await until(()=>observed.length===2);await page.waitForFunction(()=>!document.getElementById('send-chat').disabled);assert.ok(JSON.stringify(observed[1]).includes('NEXOTERM_SESSION_TWO'));
  await page.click('#capture-evidence');await page.fill('#evidence-text','PS> Write-Output NEXOTERM_SESSION_TWO\nNEXOTERM_SESSION_TWO');await page.selectOption('#evidence-status','verified');await page.selectOption('#evidence-language','powershell');await page.click('#save-evidence');await page.waitForSelector('.evidence-item');await page.click('#close-evidence');
  await page.evaluate(id=>window.nexo.call('session:evidence',id,'THIS_FAILED_EXAMPLE_MUST_NOT_APPEAR','failed','text'),second);
  const pdf=await page.evaluate(id=>window.nexo.call('session:pdf',id),second);assert.equal(fs.readFileSync(pdf).subarray(0,4).toString(),'%PDF');const report=fs.readFileSync(pdf.replace('.pdf','.md'),'utf8');assert.ok(report.includes('NEXOTERM_SESSION_TWO'));assert.ok(!report.includes('THIS_FAILED_EXAMPLE_MUST_NOT_APPEAR'));
  await page.evaluate(id=>window.nexo.call('session:access',id),second);
  await page.screenshot({path:path.join(artifacts,'02-terminal-asistente.png')});
  await page.locator('.terminal-container:not([hidden]) .xterm-helper-textarea').focus();await page.keyboard.type('exit');await page.keyboard.press('Enter');await until(()=>JSON.parse(fs.readFileSync(path.join(dataRoot,'sessions',second,'session.json'),'utf8')).status.startsWith('closed'));
  assert.equal(await page.locator('.tab').count(),2);assert.equal(await page.locator('#connection').isVisible(),true);assert.equal(await page.locator('.message.assistant').count(),2);
  const mcp=await page.evaluate(id=>window.nexo.call('mcp:toggleSession',id,true),first);assert.equal(mcp.enabled,true);await page.evaluate(()=>window.nexo.call('mcp:stop'));
  await page.evaluate(id=>window.nexo.call('terminal:input',id,'exit\r'),first);await until(()=>JSON.parse(fs.readFileSync(path.join(dataRoot,'sessions',first,'session.json'),'utf8')).status.startsWith('closed'));
  assert.deepEqual(errors,[]);await desktop.close();desktop=null;
  // Relaunch to verify saved configuration, DPAPI decryption, history and report recovery.
  desktop=await _electron.launch({executablePath,args,env,timeout:45000});const restored=await desktop.firstWindow();await restored.waitForSelector('#local-welcome');const init2=await restored.evaluate(()=>window.nexo.call('app:initial'));assert.equal(init2.hasKey,true);assert.equal(init2.settings.draft.name,'Laboratorio local · sesión 2');
  await restored.click('[data-panel="history"]');await restored.waitForSelector('.history-item');assert.equal(await restored.locator('.history-item').count(),2);await restored.locator('.history-item').first().click();await restored.waitForSelector('.tab.active');await restored.waitForSelector('.message.assistant');
  fs.copyFileSync(pdf,path.join(artifacts,'informe-prueba.pdf'));fs.copyFileSync(pdf.replace('.pdf','.md'),path.join(artifacts,'informe-prueba.md'));
  fs.writeFileSync(path.join(artifacts,'result.json'),JSON.stringify({passed:true,checks:['2 real PowerShell PTYs','persistent configuration','exit preserves session and conversation','provider HTTP mock with context opt-in','DPAPI key encrypt and reload','Markdown autosave','PDF generation excluding failed evidence','MCP lifecycle','history restore'],consoleErrors:errors},null,2));
  console.log('PASS: Electron integration, terminal lifecycle, provider, encrypted key reload, Markdown/PDF, MCP and history.');
}catch(e){console.error('E2E FAILURE:',e);if(desktop){try{const p=await desktop.firstWindow();await p.screenshot({path:path.join(artifacts,'failure.png')});}catch{}}throw e;}
finally{if(desktop){try{await desktop.evaluate(({app})=>app.exit(0));}catch{}}server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
