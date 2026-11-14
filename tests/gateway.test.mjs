import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/gateway.js';
import { Readable } from 'node:stream';

async function invoke(route, options = {}) {
  const req = Readable.from(options.raw === undefined ? [] : [options.raw]);
  Object.assign(req, { url: '/api/gateway?route='+route, method: options.method || 'POST', query: { route }, headers: {
    host: 'yoru-test.vercel.app', origin: 'https://yoru-test.vercel.app', 'content-type': 'application/json', ...options.headers,
  } });
  if (options.raw === undefined) req.body = options.body ?? { name: 'テスト' };
  const res = { headers: {}, setHeader(k,v) { this.headers[k]=v; }, end(body) { this.body=JSON.parse(body); } };
  await handler(req, res);
  return res;
}

test('forwards JSON without browser credentials; preserves upstream error and never caches', async t => {
  let seen;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    seen={url,options};
    return Response.json({error:'入力エラー', code:'invalid_input'},{status:400});
  });
  const res=await invoke('boards',{headers:{cookie:'private-cookie',authorization:'Bearer private-token'}});
  assert.equal(res.statusCode,400);
  assert.equal(res.headers['Cache-Control'],'no-store');
  assert.equal(seen.url,'https://yoru-birthday-notes.matsurio.chatgpt.site/api/boards');
  assert.equal(seen.options.headers.cookie,undefined);
  assert.equal(seen.options.headers.authorization,undefined);
  assert.equal(seen.options.headers.Origin,undefined);
  assert.equal(JSON.parse(seen.options.body).name,'テスト');
});

test('rejects foreign browser writes, arbitrary paths, methods, oversized bodies, and malformed JSON before fetching',async t=>{
  const stub=t.mock.method(globalThis,'fetch',async()=>{throw Error('Unexpected fetch');});
  assert.equal((await invoke('boards',{headers:{origin:'https://unrelated.example'}})).statusCode,403);
  assert.equal((await invoke('boards',{headers:{'sec-fetch-site':'cross-site'}})).statusCode,403);
  assert.equal((await invoke('https://unrelated.example')).statusCode,404);
  assert.equal((await invoke('boards/../../anything')).statusCode,404);
  assert.equal((await invoke('boards',{method:'DELETE'})).statusCode,405);
  assert.equal((await invoke('boards',{body:'x'.repeat(20001)})).statusCode,413);
  assert.equal((await invoke('boards',{raw:'not-json'})).statusCode,400);
  assert.equal(stub.mock.callCount(),0);
});

test('supports raw streamed request bodies and preserves idempotency keys', async t=>{
  let sent;
  t.mock.method(globalThis,'fetch',async(url,options)=>{sent=JSON.parse(options.body);return Response.json({gift:{id:'ok'}},{status:201});});
  const input={sender:'ゆい',message:'おめでとう',style:'blue',idempotencyKey:'same-submission-key'};
  const res=await invoke('boards/'+'a'.repeat(32)+'/gifts',{raw:JSON.stringify(input)});
  assert.equal(res.statusCode,201);assert.deepEqual(sent,input);
});

test('GET keeps locked payload unchanged and never follows upstream login redirects', async t=>{
  const locked={board:{unlocked:false,gifts:[{sender:'ゆい'}]},serverNow:123};
  t.mock.method(globalThis,'fetch',async()=>Response.json(locked));
  assert.deepEqual((await invoke('boards/'+'a'.repeat(32),{method:'GET'})).body,locked);
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'/signin'}});
  assert.equal((await invoke('boards/'+'a'.repeat(32),{method:'GET'})).statusCode,502);
  globalThis.fetch=async()=>{throw Error('timeout');};
  assert.equal((await invoke('boards/'+'a'.repeat(32),{method:'GET'})).statusCode,502);
});
