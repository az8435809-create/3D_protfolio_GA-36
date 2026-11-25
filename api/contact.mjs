import { webHandler } from '../server/http.mjs';
export function POST(req) { return webHandler(req, 'contact') }
export function OPTIONS(req) { return webHandler(req, 'contact') }
