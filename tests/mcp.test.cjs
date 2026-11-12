const {test}=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const {Client}=require('@modelcontextprotocol/sdk/client/index.js');const {StreamableHTTPClientTransport}=require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const {startMcp}=require('../src/mcp.cjs');
test('real MCP handshake, tools, session isolation and authentication',async()=>{
  const id=crypto.randomUUID();let shared=[{id,profile:{name:'lab',protocol:'ssh'},status:'active',transcript:'sanitized terminal data'}];
  const server=await startMcp(()=>shared);const config=server.config.mcpServers.nexoterm;const client=new Client({name:'test',version:'1.0.0'});
  try{
    assert.equal((await fetch(config.url)).status,401);
    assert.equal((await fetch(config.url,{headers:{...config.headers,Origin:'https://evil.test'}})).status,403);
    await client.connect(new StreamableHTTPClientTransport(new URL(config.url),{requestInit:{headers:config.headers}}));
    const tools=await client.listTools();assert.deepEqual(tools.tools.map(t=>t.name).sort(),['list_sessions','nexoterm_help','read_session']);
    const listed=await client.callTool({name:'list_sessions',arguments:{}});assert.ok(listed.content[0].text.includes('lab'));
    const read=await client.callTool({name:'read_session',arguments:{sessionId:id,limit:100}});assert.equal(read.content[0].text,'sanitized terminal data');
    shared=[];const denied=await client.callTool({name:'read_session',arguments:{sessionId:id,limit:100}});assert.equal(denied.isError,true);
  }finally{await client.close();await server.stop();}
});
