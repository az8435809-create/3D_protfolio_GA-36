/* Shared adapter: Web Request → core handler → Web Response (used by Netlify + Vercel). */
import { handleChat, handleContact } from './core.mjs';
const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
export async function webHandler(req, kind) {
  const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get('origin') || '';
  const cors = allowed.includes(origin) ? { 'access-control-allow-origin': origin, 'vary': 'origin' } : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' } });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...H, allow: 'POST' } });
  if (origin && allowed.length && !allowed.includes(origin)) return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers: H });
  const raw = await req.text(); if (raw.length > 20_000) return new Response(JSON.stringify({ error: 'Request too large' }), { status: 413, headers: H });
  let body; try { body = JSON.parse(raw) } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: H }) }
  const ip = req.headers.get('x-nf-client-connection-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const out = await (kind === 'chat' ? handleChat : handleContact)(body, { ip });
  return new Response(JSON.stringify(out.body), { status: out.status, headers: { ...H, ...cors } });
}
