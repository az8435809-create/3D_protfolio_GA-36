/* Shared RAG retrieval engine — runs in the browser and in Node (UMD).
   Embeddings: 512-dim hashed TF-IDF vectors over stemmed words, word bigrams and character
   trigrams, with a small synonym map (e.g. "university" ~ "education" ~ "degree"), L2-normalised.
   Ranking: hybrid = 0.55 × cosine(query, chunk) + 0.45 × normalised BM25, top-k with a floor
   below which the question is treated as "not in the documents". */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RAG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DIM = 512;
  const STOP = new Set('a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those he she his her him they them their what which who whom whose when where why how do does did can could would should will shall may might must i me my you your we our us about into over under than then there here so not no yes any all some just also very more most much many such only own same too s t ali zain alis tell know please'.split(' '));
  const SYN = {
    study: 'education degree university college school student studying studies course bs bachelor',
    education: 'study degree university college school student bs bachelor ned neduet',
    university: 'education degree college ned neduet school',
    degree: 'education bachelor bs university',
    job: 'work experience role career position freelance employment',
    work: 'experience job career role freelance projects',
    experience: 'work job career freelance years role',
    skill: 'skills tools stack technologies tech expertise abilities',
    tech: 'skills tools stack technologies',
    stack: 'skills tools technologies tech',
    tool: 'skills software technologies stack',
    software: 'tools skills programs applications',
    use: 'tools skills',
    project: 'projects work portfolio built expedition',
    contact: 'email reach hire message mail touch',
    email: 'contact mail reach address',
    hire: 'contact available freelance work email',
    live: 'location based city karachi pakistan from',
    location: 'based city karachi pakistan live from',
    award: 'achievement prize winner runner certificate recognition',
    achievement: 'award certificate prize runner hackathon',
    certificate: 'achievement award hackathon participation',
    game: 'unreal unity engine gaming vr',
    '3d': 'blender modeling rigging avatar character',
    animation: 'motion after effects animate reel',
    video: 'showreel reel promo promotional',
    ai: 'rag chatbot llm embeddings vector npc',
    website: 'web portfolio site frontend html',
    design: 'ui ux figma designer interface',
    available: 'availability open remote freelance hire',
    cv: 'resume curriculum',
    resume: 'cv curriculum'
  };
  function stem(w) {
    if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
    if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }
  function words(text) {
    return (text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9+#.]+/g) || [])
      .map(w => w.replace(/^\.+|\.+$/g, '')).filter(w => w && !STOP.has(w)).map(stem);
  }
  function features(text, expand) {
    const ws = words(text), f = [];
    ws.forEach((w, i) => {
      f.push('w:' + w);
      if (i) f.push('b:' + ws[i - 1] + '_' + w);
      if (w.length > 3) { const g = '#' + w + '#'; for (let k = 0; k < g.length - 2; k++) f.push('c:' + g.substr(k, 3)); }
      if (expand && SYN[w]) SYN[w].split(' ').forEach(s => f.push('x:' + stem(s)));   // synonyms: weaker features
    });
    return { ws, f };
  }
  function h(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) } return x >>> 0 }
  function vec(feats, idf) {
    const v = new Float32Array(DIM), tf = {};
    feats.forEach(t => tf[t] = (tf[t] || 0) + 1);
    for (const t in tf) {
      const key = t[0] === 'x' ? 'w' + t.slice(1) : t;
      const hv = h(key), w = (1 + Math.log(tf[t])) * (idf[key] || idf.__default || 1) * (t[0] === 'c' ? .35 : t[0] === 'b' ? 1.2 : t[0] === 'x' ? .3 : 1);
      v[hv % DIM] += (hv & 0x80000000 ? -1 : 1) * w;
    }
    let n = 0; for (let i = 0; i < DIM; i++) n += v[i] * v[i]; n = Math.sqrt(n) || 1;
    for (let i = 0; i < DIM; i++) v[i] /= n;
    return v;
  }
  /* ---------- index building (Node build script) ---------- */
  function buildIndex(chunks) {
    const docs = chunks.map(c => features(c.title + ' ' + c.heading + ' ' + c.text, false));
    const df = {}; docs.forEach(d => new Set(d.f).forEach(t => df[t] = (df[t] || 0) + 1));
    const N = docs.length, idf = { __default: Math.log(1 + N) };
    for (const t in df) idf[t] = Math.log(1 + (N - df[t] + .5) / (df[t] + .5)) + .1;
    const lens = docs.map(d => d.ws.length), avg = lens.reduce((a, b) => a + b, 0) / N;
    return {
      version: 1, model: 'hashed-tfidf-512', dim: DIM, createdAt: new Date().toISOString(), avgLen: avg, idf,
      chunks: chunks.map((c, i) => ({ ...c, len: lens[i], tf: tfMap(docs[i].ws), vector: Array.from(vec(docs[i].f, idf), x => +x.toFixed(4)) }))
    };
  }
  function tfMap(ws) { const m = {}; ws.forEach(w => m[w] = (m[w] || 0) + 1); return m }
  /* ---------- search ---------- */
  function search(index, query, k = 4, neuralScores) {
    const q = features(query, true);
    if (!q.ws.length) return [];
    const qv = vec(q.f, index.idf);
    const own = new Set(q.f.filter(t => t[0] === 'w').map(t => t.slice(2)));
    const qterms = [...own].map(t => [t, 1]).concat([...new Set(q.f.filter(t => t[0] === 'x').map(t => t.slice(2)))].filter(t => !own.has(t)).map(t => [t, .3]));
    const N = index.chunks.length;
    const bm = index.chunks.map(c => {
      let s = 0;
      for (const [t, wt] of qterms) {
        const tf = c.tf[t]; if (!tf) continue;
        const idf = index.idf['w:' + t] || .1;
        s += wt * idf * (tf * 2.2) / (tf + 1.2 * (.25 + .75 * c.len / index.avgLen));
      }
      return s;
    });
    const bmax = Math.max(...bm, 1e-9);
    const res = index.chunks.map((c, i) => {
      let cos = 0; for (let d = 0; d < DIM; d++) cos += qv[d] * c.vector[d];
      const dense = neuralScores ? neuralScores[i] : cos;
      return { id: c.id, title: c.title, heading: c.heading, section: c.section, text: c.text, cosine: +dense.toFixed(3), bm25: +(bm[i] / bmax).toFixed(3), rawBm25: bm[i],
        score: +(.55 * dense + .45 * (bm[i] / bmax) * Math.min(1, bm[i] / 1.5)).toFixed(4) };
    }).sort((a, b) => b.score - a.score);
    return res.slice(0, k);
  }
  /* retrieval with conversation context: the question alone decides whether it is answerable;
     the previous question is only mixed in for genuine follow-ups ("which tools did it use?") */
  const FOLLOW = /\b(it|its|that|this|those|these|they|them|there|more|else|also|same|which tools|how so|why)\b/i;
  function retrieve(index, q, prevQ, k = 4, neural) {
    const own = search(index, q, k, neural);
    const isFollow = prevQ && FOLLOW.test(q) && words(q).length <= 3;
    if (!isFollow) return own;
    // follow-up: re-rank the chunks that answered the previous question by how well they match this one
    const prev = search(index, prevQ, 6, neural), cur = search(index, prevQ + ' ' + q, index.chunks.length, neural), m = {};
    cur.forEach(h => m[h.id] = h.score);
    const rest = prev.slice(1).map(h => ({ ...h, score: +(.5 * h.score + .5 * (m[h.id] || 0)).toFixed(4) })).sort((a, b) => b.score - a.score);
    const merged = [prev[0], ...rest].slice(0, k);      // the thing being talked about stays first
    return answerable(merged) ? merged : own;
  }
  /* is the best match strong enough to answer from? */
  function answerable(hits) { return hits.length > 0 && (hits[0].score >= .2 || hits[0].rawBm25 >= 2.2) }
  return { DIM, words, features, vec, buildIndex, search, retrieve, answerable };
});
