/* Build the chatbot's vector index from knowledge/ (Markdown, text and PDF CV).
   node rag/build_index.mjs            → data/rag-index.json (+ data/rag-index.js for static/offline use)
   EMBED_PROVIDER=openai OPENAI_API_KEY=… node rag/build_index.mjs   → also stores neural embeddings
   (text-embedding-3-small); the server then embeds questions with the same model. */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const RAG = require('./retriever.js');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KDIR = path.join(ROOT, 'knowledge');
function readDoc(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.pdf') {
    try { return { meta: { title: path.basename(file, ext).replace(/[-_]/g, ' '), section: '#about' }, body: execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }) } }
    catch { console.warn('skip PDF (pdftotext missing):', file); return null }
  }
  let raw = fs.readFileSync(file, 'utf8'), meta = { title: path.basename(file, ext), section: '#home' };
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) { fm[1].split('\n').forEach(l => { const m = l.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2].trim() }); raw = raw.slice(fm[0].length) }
  return { meta, body: raw };
}
/* chunking: split on headings, then pack paragraphs/sentences into ~40–140-word chunks with a 1-sentence overlap */
function chunk(doc, file) {
  const out = []; const parts = doc.body.split(/^#+\s+/m).filter(s => s.trim());
  for (const part of parts) {
    const lines = part.split('\n'); const isHeaded = /^#/.test(doc.body.trim()) || doc.body.includes('\n# ');
    const heading = isHeaded ? lines.shift().trim() : doc.meta.title; const text = lines.join(' ').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const sents = text.split(/(?<=[a-z0-9)%\]][.!?])\s+(?=[A-Z0-9\"])/); let buf = [];
    const flush = () => { if (buf.length) out.push({ heading, text: buf.join(' ') }) };
    for (const s of sents) {
      buf.push(s);
      if (buf.join(' ').split(' ').length > 140) { const last = buf.pop(); flush(); buf = [buf[buf.length - 1], last].filter(Boolean) }
    }
    flush();
  }
  return out.map((c, i) => ({ id: path.basename(file).replace(/\.\w+$/, '') + '#' + (i + 1), title: doc.meta.title, section: doc.meta.section, heading: c.heading, text: c.text }));
}
const files = fs.readdirSync(KDIR).filter(f => /\.(md|txt|pdf)$/i.test(f) && f.toLowerCase() !== 'readme.md').sort();
let chunks = [];
for (const f of files) { const d = readDoc(path.join(KDIR, f)); if (d) chunks = chunks.concat(chunk(d, f)) }
const index = RAG.buildIndex(chunks);
if (process.env.EMBED_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
  const r = await fetch((process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1') + '/embeddings', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
    body: JSON.stringify({ model: process.env.EMBED_MODEL || 'text-embedding-3-small', input: chunks.map(c => c.title + ' — ' + c.heading + ': ' + c.text) }) });
  if (!r.ok) throw new Error('embedding API ' + r.status + ' ' + await r.text());
  const j = await r.json(); index.neural = { model: process.env.EMBED_MODEL || 'text-embedding-3-small', vectors: j.data.map(d => d.embedding.map(x => +x.toFixed(5))) };
  console.log('neural embeddings:', index.neural.model, index.neural.vectors[0].length, 'dims');
}
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data/rag-index.json'), JSON.stringify(index));
fs.writeFileSync(path.join(ROOT, 'data/rag-index.mjs'), 'export default ' + JSON.stringify(index) + ';\n');
const slim = { ...index }; delete slim.neural;
fs.writeFileSync(path.join(ROOT, 'data/rag-index.js'), 'window.RAG_INDEX=' + JSON.stringify(slim).replace(/</g, '\\u003c') + ';');
console.log(`indexed ${files.length} documents → ${chunks.length} chunks (${index.model}, ${index.dim} dims) → data/rag-index.json`);
