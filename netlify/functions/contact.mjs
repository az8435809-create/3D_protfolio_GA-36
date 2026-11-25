import { webHandler } from '../../server/http.mjs';
export default req => webHandler(req, 'contact');
export const config = { path: '/api/contact' };
