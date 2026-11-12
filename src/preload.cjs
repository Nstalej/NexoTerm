const {contextBridge,ipcRenderer}=require('electron');
const channels=new Set(['app:initial','app:guide','settings:draft','profile:save','profile:delete','provider:save','session:new','terminal:input','terminal:resize','session:disconnect','session:record','session:access','session:evidence','session:block','session:save','session:pdf','session:folder','session:history','session:restore','assistant:ask','mcp:toggleSession','mcp:copy','mcp:stop']);
contextBridge.exposeInMainWorld('nexo',{
  call:async(channel,...args)=>{if(!channels.has(channel))throw Error('Operación no disponible.');const r=await ipcRenderer.invoke(channel,...args);if(!r.ok)throw Error(r.error);return r.value;},
  on:(channel,callback)=>{if(!['session:state','terminal:data'].includes(channel))throw Error('Evento no válido.');const listener=(_event,data)=>callback(data);ipcRenderer.on(channel,listener);return ()=>ipcRenderer.removeListener(channel,listener);}
});
