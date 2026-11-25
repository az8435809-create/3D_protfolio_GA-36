/* Retrieval evaluation: does each question retrieve the right document, and are out-of-scope questions refused? */
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const RAG = require('../rag/retriever.js');
const idx = JSON.parse(fs.readFileSync(new URL('../data/rag-index.json', import.meta.url)));
const cases = [
  ['Where does Ali study?', '02-education'], ['What degree is he doing?', '02-education'], ['Which university?', '02-education'],
  ['What are his skills?', '04-skills'], ['Does he know React?', '04-skills'], ['What 3D software does he use?', '04-skills'],
  ['Tell me about the VR project', '05-projects'], ['What is Neon Rickshaw?', '05-projects'], ['Has he built any AI projects?', '05-projects'],
  ['Has he won any awards?', '06-achievements'], ['What certificate did he get?', '06-achievements'], ['Did he take part in a hackathon?', '06-achievements'],
  ['What is his work experience?', '03-experience'], ['Has he done freelance work?', '03-experience'],
  ['How can I contact him?', '08-contact'], ['Where is he based?', '01-profile'], ['Is he available for remote work?', '01-profile'],
  ['Tell me about the 3D avatar on this site', '07-this-portfolio'], ['What is in the showreel video?', '07-this-portfolio'],
  ['What is his phone number?', null], ['How old is Ali?', null], ['What is his GPA?', null], ['What is his favorite food?', null], ['Is he married?', null], ['What salary does he expect?', null],
];
let ok = 0;
for (const [q, want] of cases) {
  const h = RAG.search(idx, q, 4), ans = RAG.answerable(h), got = ans ? h[0].id.split('#')[0] : null;
  const pass = want === null ? !ans : (ans && h.slice(0, 2).some(x => x.id.startsWith(want)));
  ok += pass; console.log(pass ? 'PASS' : 'FAIL', q.padEnd(42), '→', got || 'not answerable', want === null ? '(should refuse)' : '');
}
const fu = [['Which tools did it use?', 'Tell me about the VR project', '05-projects#5'], ['How was it built?', 'Tell me about the cyberpunk game', '05-projects#1'], ['Did it win anything?', 'Tell me about the VR project', '05-projects#5'], ['What is his phone number?', 'Tell me about the VR project', null]];
for (const [q, prev, want] of fu) {
  const h = RAG.retrieve(idx, q, prev, 4), ans = RAG.answerable(h), pass = want === null ? !ans : ans && h[0].id === want;
  ok += pass; console.log(pass ? 'PASS' : 'FAIL', ('follow-up: ' + q).padEnd(42), '→', ans ? h[0].id : 'not answerable');
}
const total = cases.length + fu.length; console.log(`\n${ok}/${total} passed`); process.exit(ok === total ? 0 : 1);
