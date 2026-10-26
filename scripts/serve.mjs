import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const workspace = resolve(import.meta.dirname, '..');
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.flac': 'audio/flac', '.aac': 'audio/aac', '.webm': 'audio/webm',
};

/**
 * A single inclusive byte range, null to serve the full representation, or false
 * for an invalid/unsatisfiable byte range. Unknown units and multipart ranges
 * are ignored. BigInt avoids rounding very large client-supplied offsets.
 * Semantics: https://www.rfc-editor.org/rfc/rfc9110.html#section-14
 */
export function parseByteRange(header, size) {
  if(header==null)return null;
  if(typeof header!=='string'||!Number.isSafeInteger(size)||size<0)return false;
  const value=header.trim();
  if(!/^bytes=/i.test(value))return value===''?false:null;
  if(value.includes(','))return null;
  const match=/^bytes=(\d*)-(\d*)$/i.exec(value);
  if(!match||(!match[1]&&!match[2])||size===0)return false;
  const length=BigInt(size);
  if(!match[1]){
    const suffix=BigInt(match[2]);
    if(suffix===0n)return false;
    return {start:Number(suffix>=length?0n:length-suffix),end:size-1};
  }
  const start=BigInt(match[1]),requestedEnd=match[2]?BigInt(match[2]):length-1n;
  if(start>=length||requestedEnd<start)return false;
  return {start:Number(start),end:Number(requestedEnd>=length?length-1n:requestedEnd)};
}

export function createPreviewServer({root=workspace}={}) {
  const directory=resolve(root);
  return createServer(async (request, response) => {
    const head=request.method==='HEAD';
    function text(status,message) {
      response.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Content-Length':Buffer.byteLength(message)});
      response.end(head?undefined:message);
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const target = resolve(directory, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!target.startsWith(directory + sep) || pathname.split('/').some(part => part.startsWith('.'))) {
        text(403,'Forbidden');return;
      }
      const info = await stat(target);
      if (!info.isFile()) throw new Error('Not a file');
      const headers={
        'Content-Type':mime[extname(target).toLowerCase()]||'application/octet-stream',
        'Cache-Control':'no-cache','Accept-Ranges':'bytes','Content-Length':info.size,
      };
      // Range only applies to GET. With no validators, If-Range safely falls
      // back to a full response rather than mixing versions of a local file.
      const range=request.method==='GET'&&!request.headers['if-range']?parseByteRange(request.headers.range,info.size):null;
      if(range===false){
        response.writeHead(416,{...headers,'Content-Range':`bytes */${info.size}`,'Content-Length':0}).end();return;
      }
      if(range){headers['Content-Range']=`bytes ${range.start}-${range.end}/${info.size}`;headers['Content-Length']=range.end-range.start+1;}
      response.writeHead(range?206:200,headers);
      if(head||info.size===0){response.end();return;}
      const stream=createReadStream(target,range||undefined);
      stream.on('error',()=>response.destroy());
      response.on('close',()=>stream.destroy());
      stream.pipe(response);
    } catch {
      if(response.headersSent)response.destroy();else text(404,'Not found');
    }
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const port = Number(process.env.PORT || 4173);
  createPreviewServer().listen(port, '127.0.0.1', () => {
    console.log(`Local: http://127.0.0.1:${port}`);
  });
}
