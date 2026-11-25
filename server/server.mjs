/* Standalone Node server: serves the static site + /api/chat + /api/contact.
   npm start   (reads .env if present)   → http://localhost:3000   — also works on Render, Railway, Fly, a VPS. */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// minimal .env loader (no dependency)
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) for (const l of fs.readFileSync(envFile, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const { handleChat, handleContact } = await import('./core.mjs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.pdf': 'application/pdf', '.ico': 'image/x-icon' };
const BLOCK = /^\/(server|netlify|api|rag\/build|knowledge|avatar-src|video\/frames|\.env|\.git)/;
const SEC = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'SAMEORIGIN' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
  if (url.pathname === '/api/chat' || url.pathname === '/api/contact') {
    if (req.method !== 'POST') { res.writeHead(405, { allow: 'POST', ...SEC }); return res.end() }
    let raw = ''; for await (const c of req) { raw += c; if (raw.length > 20000) { res.writeHead(413, SEC); return res.end() } }
    let body; try { body = JSON.parse(raw) } catch { res.writeHead(400, { 'content-type': 'application/json', ...SEC }); return res.end('{"error":"Invalid JSON"}') }
    const out = await (url.pathname === '/api/chat' ? handleChat : handleContact)(body, { ip });
    res.writeHead(out.status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SEC }); return res.end(JSON.stringify(out.body));
  }
  let p = decodeURIComponent(url.pathname); if (p.endsWith('/')) p += 'index.html';
  if (BLOCK.test(p) || p.includes('..')) { res.writeHead(404, SEC); return res.end('Not found') }
  const f = path.join(ROOT, p);
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, SEC); return res.end('Not found') }
    const type = TYPES[path.extname(f)] || 'application/octet-stream', range = req.headers.range;
    if (range) {                                       // byte ranges so the video can seek
      const [s, e] = range.replace('bytes=', '').split('-'); const start = +s, end = e ? +e : st.size - 1;
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1, ...SEC });
      return fs.createReadStream(f, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes', ...SEC }); fs.createReadStream(f).pipe(res);
  });
}).listen(+process.env.PORT || 3000, () => console.log('Portfolio running on http://localhost:' + (process.env.PORT || 3000)));
