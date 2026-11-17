import { defineConfig } from 'vite';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';

const limit = 25 * 1024 * 1024;
const folder = resolve(process.env.SWISH_UPLOAD_DIR || '.uploads');
const fileRoute = /^\/api\/files\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/;

function filename(value) {
  return (value || 'download').replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 255).trim() || 'download';
}

async function download(req, res, id, name) {
  if (!['GET','HEAD'].includes(req.method)) {
    res.writeHead(405, {Allow:'GET, HEAD'}).end();
    return;
  }
  let handle;
  try {
    handle = await open(join(folder,id), 'r');
    const {size} = await handle.stat();
    const encoded = encodeURIComponent(filename(name).toWellFormed()).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16));
    res.writeHead(200,{
      'Content-Type':'application/octet-stream',
      'Content-Disposition':"attachment; filename=\"download\"; filename*=UTF-8''" + encoded,
      'Content-Length':size,
      'X-Content-Type-Options':'nosniff',
      'Cache-Control':'private, no-store'
    });
    if (req.method === 'HEAD') res.end();
    else await pipeline(handle.createReadStream(),res);
  } catch (err) {
    if (!res.headersSent) res.writeHead(err.code === 'ENOENT' ? 404 : 500).end();
  } finally {
    await handle?.close();
  }
}

function attach(server) {
  server.middlewares.use(async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    const match = fileRoute.exec(url.pathname);
    if (match) return download(req,res,match[1],url.searchParams.get('name'));
    if (url.pathname !== '/api/upload') return next();
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host && req.headers.origin !== 'https://' + req.headers.host) {
      res.writeHead(403).end(); return;
    }
    const id = randomUUID();
    const temp = join(folder, id + '.part');
    let handle;
    try {
      if (Number(req.headers['content-length']) > limit) { res.writeHead(413).end(); return; }
      await mkdir(folder, {recursive:true});
      handle = await open(temp,'wx',0o600);
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > limit) { res.writeHead(413).end(); return; }
        await handle.writeFile(chunk);
      }
      await handle.close();
      handle = null;
      await rename(temp, join(folder,id));
      res.writeHead(201, {'Content-Type':'application/json'}).end(JSON.stringify({id, downloadUrl:'/api/files/' + id + '?' + new URLSearchParams({name:filename(url.searchParams.get('name'))})}));
    } catch {
      if (!res.headersSent) res.writeHead(500).end();
    } finally {
      if (handle) await handle.close().catch(() => {});
      await rm(temp,{force:true}).catch(() => {});
    }
  });
}
export default defineConfig({
  base:'./',
  server:{fs:{deny:['.uploads','**/.uploads/**','.env','.env.*','*.{crt,pem}','**/.git/**']}},
  plugins:[{name:'swish-local-uploads',configureServer:attach,configurePreviewServer:attach}]
});
