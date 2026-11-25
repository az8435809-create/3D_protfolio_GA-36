import { webHandler } from '../../server/http.mjs';
export default req => webHandler(req, 'chat');
export const config = { path: '/api/chat' };
