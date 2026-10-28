import { createServer } from 'node:http';
import { readFile, stat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { pathToFileURL } from 'node:url';
import { parseByteRange } from './serve.mjs';

const workspace = resolve(import.meta.dirname,'..');
const scripts = new Set(['device-qa.html','device-qa.js','frame-probe.html']);
const entries = new Set(['index.html','reading.html','robots.txt','sitemap.xml']);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.pdf':'application/pdf','.txt':'text/plain','.xml':'application/xml',
  '.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.m4a':'audio/mp4','.flac':'audio/flac','.aac':'audio/aac','.webm':'audio/webm'};

export function createDeviceServer({ root = workspace, resultsDir = resolve(workspace,'state/device-runs') } = {}) {
  let received = 0;
  return createServer(async (request,response) => {
    response.setHeader('Cache-Control','no-store');
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Referrer-Policy','no-referrer');
    try {
      const pathname = decodeURIComponent(new URL(request.url,'http://local').pathname);
      if (pathname === '/__device-results') {
        if (request.method !== 'POST') { response.writeHead(405).end('POST required'); return; }
        // Reject browser submissions originating from another site.
        if (request.headers.origin && new URL(request.headers.origin).host !== request.headers.host) { response.writeHead(403).end('Origin rejected'); return; }
        if (received >= 30) { response.writeHead(429).end('Session report limit reached'); return; }
        const chunks = []; let bytes = 0;
        for await (const chunk of request) {
          bytes += chunk.length;
          if (bytes > 100_000) { response.writeHead(413).end('Report too large'); return; }
          chunks.push(chunk);
        }
        const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (report.version !== 1 || report.status !== 'COMPLETE' || !['automatic','manual'].includes(report.kind)
          || typeof report.userAgent !== 'string' || report.userAgent.length > 512 || !Array.isArray(report.rows) || report.rows.length !== 6
          || report.rows.some(row => typeof row.name !== 'string' || !Number.isFinite(row.fps) || row.fps <= 0)) {
          response.writeHead(400).end('Invalid completed device report'); return;
        }
        const file = `device-${randomUUID()}.json`;
        await mkdir(resultsDir,{recursive:true});
        await writeFile(resolve(resultsDir,file),JSON.stringify({receivedAt:new Date().toISOString(),...report},null,2)+'\n',{flag:'wx'});
        received++;
        response.writeHead(201,{'Content-Type':'application/json'}).end(JSON.stringify({file:`state/device-runs/${file}`}));
        console.log(`Saved ${file}: ${report.kind}, ${report.userAgent}`);
        return;
      }
      if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405).end('Read only'); return; }
      const path = pathname === '/' ? '/scripts/device-qa.html' : pathname;
      const parts = path.slice(1).split('/');
      const allowed = entries.has(parts[0]) && parts.length === 1
        || parts[0] === 'assets' && parts.length > 1
        || parts[0] === 'scripts' && parts.length === 2 && scripts.has(parts[1]);
      if (!allowed || parts.some(part => part.startsWith('.') || part.includes('\\'))) { response.writeHead(403).end('Not served by device preview'); return; }
      const target = await realpath(resolve(root,...parts));
      if (!target.startsWith(resolve(root)+sep) || !(await stat(target)).isFile()) { response.writeHead(403).end('Forbidden'); return; }
      const body = await readFile(target);
      const headers={'Content-Type':mime[extname(target).toLowerCase()] || 'application/octet-stream','Content-Length':body.length,'Accept-Ranges':'bytes'};
      const range=request.method==='GET'&&!request.headers['if-range']?parseByteRange(request.headers.range,body.length):null;
      if(range===false){response.writeHead(416,{...headers,'Content-Range':`bytes */${body.length}`,'Content-Length':0}).end();return;}
      if(range){headers['Content-Range']=`bytes ${range.start}-${range.end}/${body.length}`;headers['Content-Length']=range.end-range.start+1;}
      response.writeHead(range?206:200,headers);
      response.end(request.method === 'HEAD' ? undefined : range?body.subarray(range.start,range.end+1):body);
    } catch (error) { response.writeHead(error instanceof SyntaxError ? 400 : 404).end('Invalid request or missing file'); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4174);
  const server=createDeviceServer();
  server.on('error',error=>{
    console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. Reuse the running preview, or set PORT to a different number.`:`Device preview could not start: ${error.message}`);
    process.exitCode=1;
  });
  server.listen(port,'0.0.0.0',()=>{
    console.log(`PC: http://127.0.0.1:${port}/`);
    for (const rows of Object.values(networkInterfaces())) for (const row of rows || []) {
      if (row.family === 'IPv4' && !row.internal) console.log(`Local network: http://${row.address}:${port}/`);
    }
    console.log('Only public site assets, the device test page, and its local report receiver are served. Stop with Ctrl+C when testing ends.');
  });
}
