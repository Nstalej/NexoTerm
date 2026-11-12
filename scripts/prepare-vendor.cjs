const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const expected='969f36879d5716aa1a9811f43a6a6510e8f08372dbeb9695b810b9c776f39c75';
const file=path.join(__dirname,'..','vendor','plink.exe');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
(async()=>{if(fs.existsSync(file)&&hash(fs.readFileSync(file))===expected){console.log('Plink 0.85 SHA-256 verificado.');return;}
const res=await fetch('https://the.earth.li/~sgtatham/putty/0.85/w64/plink.exe',{signal:AbortSignal.timeout(60000),redirect:'error'});if(!res.ok)throw Error(`Descarga de Plink: HTTP ${res.status}`);const bytes=Buffer.from(await res.arrayBuffer());if(hash(bytes)!==expected)throw Error('SHA-256 de Plink incorrecto. No se guardó el archivo.');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);console.log('Plink 0.85 descargado y SHA-256 verificado.');})().catch(e=>{console.error(e.message);process.exitCode=1;});
