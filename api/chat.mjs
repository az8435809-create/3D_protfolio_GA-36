import { webHandler } from '../server/http.mjs';
export function POST(req) { return webHandler(req, 'chat') }
export function OPTIONS(req) { return webHandler(req, 'chat') }
