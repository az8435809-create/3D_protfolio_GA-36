/* npm test — retrieval evaluation + contact validation/spam unit tests + handler checks (no network). */
import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const R = require('../rag/validate.js');
let fails = 0; const t = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); if (!cond) fails++ };
try { console.log(execFileSync('node', [new URL('./rag_eval.mjs', import.meta.url).pathname], { encoding: 'utf8' }).split('\n').slice(-2)[0]) } catch (e) { console.log(e.stdout); fails++ }
const good = { name: 'Sara Ahmed', email: 'sara@example.com', subject: 'Website project', message: 'Hi Ali, I need a website for my bakery.' };
t('valid message passes', R.validate(good).ok);
t('bad email rejected', !R.validate({ ...good, email: 'sara@' }).ok);
t('short message rejected', !R.validate({ ...good, message: 'hi' }).ok);
t('link in name rejected', !R.validate({ ...good, name: 'http://spam.io' }).ok);
t('CRLF stripped from subject (no header injection)', !/[\r\n]/.test(R.validate({ ...good, subject: 'Hi\r\nBcc: x@y.z' }).values.subject));
t('control chars removed', !/\u0007/.test(R.validate({ ...good, message: good.message + '\u0007' }).values.message));
t('spam scored', R.spamScore({ subject: 'SEO services', message: 'buy backlinks http://a http://b http://c' }) >= 3);
t('normal message not spam', R.spamScore(good) < 3);
const core = await import('../server/core.mjs');
const hp = await core.handleContact({ ...good, website: 'x', startedAt: Date.now() - 10000 }, { ip: 't1' }); t('honeypot silently dropped', hp.status === 200 && hp.body.id === 'filtered');
const fast = await core.handleContact({ ...good, startedAt: Date.now() }, { ip: 't2' }); t('instant submit blocked', fast.status === 400);
const inv = await core.handleContact({ ...good, email: 'nope', startedAt: Date.now() - 10000 }, { ip: 't3' }); t('server-side validation 422 + field errors', inv.status === 422 && inv.body.errors.email);
const nf = await core.handleChat({ question: 'What is his phone number?' }, { ip: 't4' }); t('chat refuses unknown personal info', /don't have that information/.test(nf.body.answer));
const ok = await core.handleChat({ question: 'Where does Ali study?' }, { ip: 't5' }); t('chat answers with sources', ok.body.sources.length > 0 && /NED/.test(ok.body.answer));
console.log(fails ? `\n${fails} failing` : '\nAll tests passed'); process.exit(fails ? 1 : 0);
