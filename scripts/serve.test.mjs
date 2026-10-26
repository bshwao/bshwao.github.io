import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { createPreviewServer, parseByteRange } from './serve.mjs';

const audio=Buffer.from('0123456789abcdefghijklmnopqrstuvwxyz');
const audioTypes={wav:'audio/wav',mp3:'audio/mpeg',ogg:'audio/ogg',m4a:'audio/mp4',flac:'audio/flac',aac:'audio/aac',webm:'audio/webm'};

async function fixture(t) {
  const temporaryRoot=resolve(tmpdir()),root=await mkdtemp(join(temporaryRoot,'portfolio-serve-'));
  await Promise.all([
    writeFile(join(root,'index.html'),'<h1>Preview</h1>'),writeFile(join(root,'empty.wav'),''),
    ...Object.keys(audioTypes).map(extension=>writeFile(join(root,`track.${extension}`),audio)),
    writeFile(join(root,'upper.WAV'),audio),
  ]);
  const server=createPreviewServer({root});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const {port}=server.address();
  t.after(async()=>{
    await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    // Only delete the unique temporary directory created by this fixture.
    assert.equal(dirname(resolve(root)),temporaryRoot);assert.ok(basename(root).startsWith('portfolio-serve-'));
    await rm(root,{recursive:true,force:true});
  });
  function get(path,{method='GET',headers={}}={}) {
    return new Promise((resolve,reject)=>{
      const req=request({host:'127.0.0.1',port,path,method,headers,agent:false},response=>{
        const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('error',reject);
        response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks)}));
      });
      req.on('error',reject);req.end();
    });
  }
  return {get};
}

test('single byte-range parser handles inclusive, open-ended, suffix, and large offsets',()=>{
  assert.equal(parseByteRange(undefined,100),null);
  assert.deepEqual(parseByteRange('bytes=0-0',100),{start:0,end:0});
  assert.deepEqual(parseByteRange('bytes=5-9',100),{start:5,end:9});
  assert.deepEqual(parseByteRange('bytes=90-',100),{start:90,end:99});
  assert.deepEqual(parseByteRange('bytes=-10',100),{start:90,end:99});
  assert.deepEqual(parseByteRange('bytes=-500',100),{start:0,end:99});
  assert.deepEqual(parseByteRange('bytes=80-500',100),{start:80,end:99});
  assert.deepEqual(parseByteRange('bytes=20-99999999999999999999999999999',100),{start:20,end:99});
  assert.deepEqual(parseByteRange('bytes=-99999999999999999999999999999',100),{start:0,end:99});
  assert.deepEqual(parseByteRange(' BYTES=0001-0002 ',100),{start:1,end:2});
  assert.equal(parseByteRange('items=0-1',100),null,'Unknown range units are ignored');
  assert.equal(parseByteRange('bytes=0-1,8-9',100),null,'Multipart ranges use a complete response');
});

test('invalid and unsatisfiable byte ranges never produce invalid file offsets',()=>{
  for(const range of ['', 'bytes=', 'bytes=-', 'bytes=-0', 'bytes=9-1', 'bytes=100-', 'bytes=100-200', 'bytes=1.5-2', 'bytes=zero-2', 'bytes=+1-2', 'bytes=99999999999999999999999999999-']){
    assert.equal(parseByteRange(range,100),false,range);
  }
  assert.equal(parseByteRange('bytes=0-',0),false);
  assert.equal(parseByteRange('bytes=0-',NaN),false);
  assert.equal(parseByteRange('bytes=0-',-1),false);
});

test('full audio responses advertise correct MIME, byte length, and range support',async t=>{
  const {get}=await fixture(t);
  for(const [extension,type] of Object.entries(audioTypes)){
    const response=await get(`/track.${extension}`);
    assert.equal(response.status,200);assert.equal(response.headers['content-type'],type);
    assert.equal(response.headers['content-length'],String(audio.length));assert.equal(response.headers['accept-ranges'],'bytes');
    assert.equal(response.headers['transfer-encoding'],undefined);assert.equal(response.headers['cache-control'],'no-cache');
    assert.deepEqual(response.body,audio);
  }
  assert.equal((await get('/upper.WAV')).headers['content-type'],'audio/wav');
});

test('ranged audio GETs return exactly the requested bytes with consistent 206 headers',async t=>{
  const {get}=await fixture(t);
  for(const [range,start,end] of [['bytes=0-0',0,0],['bytes=4-9',4,9],['bytes=30-',30,audio.length-1],['bytes=-5',audio.length-5,audio.length-1],['bytes=30-999',30,audio.length-1],['bytes=-1000',0,audio.length-1]]){
    const response=await get('/track.wav',{headers:{Range:range}});
    assert.equal(response.status,206,range);assert.equal(response.headers['content-range'],`bytes ${start}-${end}/${audio.length}`);
    assert.equal(response.headers['content-length'],String(end-start+1));assert.equal(response.headers['content-type'],'audio/wav');
    assert.equal(response.headers['accept-ranges'],'bytes');assert.equal(response.headers['transfer-encoding'],undefined);
    assert.deepEqual(response.body,audio.subarray(start,end+1));
  }
});

test('invalid audio ranges return 416 and the full representation size without content',async t=>{
  const {get}=await fixture(t);
  for(const range of ['bytes=90-','bytes=10-2','bytes=-0','bytes=bad']){
    const response=await get('/track.wav',{headers:{Range:range}});
    assert.equal(response.status,416);assert.equal(response.headers['content-range'],`bytes */${audio.length}`);
    assert.equal(response.headers['content-length'],'0');assert.equal(response.body.length,0);
  }
  const empty=await get('/empty.wav',{headers:{Range:'bytes=0-'}});
  assert.equal(empty.status,416);assert.equal(empty.headers['content-range'],'bytes */0');
});

test('HEAD, empty files, and ignored range requests retain complete-response semantics',async t=>{
  const {get}=await fixture(t);
  for(const headers of [{},{Range:'bytes=3-8'},{Range:'bytes=bad'}]){
    const response=await get('/track.wav',{method:'HEAD',headers});
    assert.equal(response.status,200);assert.equal(response.headers['content-length'],String(audio.length));
    assert.equal(response.headers['content-range'],undefined);assert.equal(response.body.length,0);
  }
  for(const headers of [{Range:'items=0-3'},{Range:'bytes=0-1,3-4'},{Range:'bytes=0-3','If-Range':'"an-unknown-version"'}]){
    const response=await get('/track.wav',{headers});assert.equal(response.status,200);assert.deepEqual(response.body,audio);
  }
  const empty=await get('/empty.wav');assert.equal(empty.status,200);assert.equal(empty.headers['content-length'],'0');assert.equal(empty.body.length,0);
});

test('ordinary previews, missing assets, and forbidden dot paths keep their existing statuses',async t=>{
  const {get}=await fixture(t),index=await get('/');
  assert.equal(index.status,200);assert.equal(index.headers['content-type'],'text/html; charset=utf-8');assert.equal(index.body.toString(),'<h1>Preview</h1>');
  assert.equal((await get('/missing.wav')).status,404);assert.equal((await get('/.git/config')).status,403);
  const missingHead=await get('/missing.wav',{method:'HEAD'});assert.equal(missingHead.status,404);assert.equal(missingHead.body.length,0);
  assert.equal(missingHead.headers['content-length'],String(Buffer.byteLength('Not found')));
});
