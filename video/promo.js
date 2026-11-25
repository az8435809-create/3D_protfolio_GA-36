/* Ali Zain — 46 s promo. Everything is a pure function of time: seek(t) draws the frame at t seconds. */
const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - x, 4);                       // ease-out quart
const eio = x => x < .5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2;
const back = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) };
const show = (el, o, tf = '') => { el.style.opacity = o; el.style.transform = tf; el.style.visibility = o <= 0.001 ? 'hidden' : 'visible' };
// scene boundaries
const S = [0, 5.6, 11.2, 18.2, 28.2, 34.2, 40.2, 46];
const DUR = 46;

/* ---------- build words ---------- */
function words(el, html) {
  el.innerHTML = html.replace(/(<em>.*?<\/em>)|([^\s<]+)/g, (m, em, w) => {
    if (em) return em.replace(/<em>(.*?)<\/em>/, (_, x) => x.split(' ').map(y => `<em class="word"><span>${y}</span></em>`).join(' '));
    return `<span class="word"><span>${w}</span></span>`;
  });
  return [...el.querySelectorAll('.word>span')];
}
$('title').innerHTML = 'Ali Zain'.split('').map(c => `<span class="word"><span>${c === ' ' ? '&nbsp;' : c}</span></span>`).join('') + '<span id="tdot" style="display:inline-block;width:40px;height:40px;border-radius:50%;background:#D9A821;margin-left:14px;box-shadow:0 0 40px #D9A821"></span>';
const titleL = [...$('title').querySelectorAll('.word>span')];
const s2w = words($('s2h'), 'I Build Digital Experiences That Reach <em>New Heights.</em>');
const s7w = words($('s7h'), "Let's Climb To The Top <em>Together.</em>");
// skills
const SK = SKILLS.map(s => [s.name, s.v]);
$('skills').innerHTML = SK.map(([n, v], i) => `<div id="sk${i}"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px"><span class="serif" style="font-size:54px">${n}</span><span class="serif" style="font-size:60px;color:#E8B923"><b id="skv${i}">0</b>%</span></div><div class="bar"><i id="skb${i}" style="width:${v}%;transform-origin:left"></i></div></div>`).join('');
$('mqt').innerHTML = Array(6).fill(['WEB DEVELOPMENT', 'UI/UX DESIGN', 'REACT', 'NEXT.JS', 'FIGMA', '3D & MOTION'].map((w, i) => `<span style="padding:0 34px;${i % 2 ? 'font-style:italic;font-weight:500' : ''}">${w}</span><span style="display:inline-block;width:16px;height:16px;background:#13200f;transform:rotate(45deg)"></span>`).join('')).join('');
// projects
$('track').innerHTML = PROJECTS.map((p, i) => `<div class="card" id="pc${i}" style="left:660px;top:0;width:600px;height:420px"><div style="height:100%">${cover(p.art, 'v' + i)}</div></div>`).join('');
$('track').querySelectorAll('svg').forEach(s => { s.style.width = '100%'; s.style.height = '100%' });
// avatar chips
$('s5c').innerHTML = ['Modeled & textured', '18-bone rig', '4 expressions', '5 animations', 'GLB for the web'].map((c, i) => `<span class="chip" id="ch${i}">${c}</span>`).join('');
// stats + timeline
$('stats').innerHTML = [['2', 'Years'], ['25', 'Projects'], ['15', 'Happy clients']].map(([n, l], i) => `<div id="st${i}"><div class="serif" style="font-size:150px;color:#E8B923;line-height:1"><span id="stv${i}">0</span>+</div><div class="label" style="font-size:20px;color:#9aa59b;margin-top:10px">${l}</div></div>`).join('');
$('tl').innerHTML = `<div id="tlline" style="position:absolute;left:0;top:40px;height:4px;width:100%;background:linear-gradient(90deg,#E8B923,#D9A821);transform-origin:left;box-shadow:0 0 14px #D9A821"></div>` +
  ['2023', '2024', '2025', '2026'].map((y, i) => `<div id="tld${i}" style="position:absolute;left:${i * 245}px;top:16px;text-align:left"><div style="width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#E8B923,#B8890F);box-shadow:0 0 0 6px #12211A,0 0 24px #E8B923;display:grid;place-items:center;color:#13200f;font-weight:800;font-size:20px">0${i + 1}</div><div class="serif" style="font-style:italic;font-size:46px;color:#E8B923;margin-top:18px">${y}</div><div style="font-size:21px;color:#c9cfc9;width:220px">${['Started learning', 'First freelance project', 'Built 25+ projects', 'Going international'][i]}</div></div>`).join('');

/* ---------- bokeh + grain (deterministic) ---------- */
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647 }
const R = rng(7), parts = [...Array(80)].map(() => ({ x: R() * 1920, y: R() * 1080, z: R(), ph: R() * 6.28 }));
const bctx = $('bokeh').getContext('2d');
function bokeh(t, amount) {
  bctx.clearRect(0, 0, 1920, 1080); if (amount <= 0) return;
  for (const p of parts) {
    const r = 1.5 + p.z * p.z * 13, y = ((p.y - t * (14 + p.z * 50)) % 1140 + 1140) % 1140 - 30, x = p.x + Math.sin(t * .5 + p.ph) * 18 * p.z;
    const tw = .55 + .45 * Math.sin(t * 1.6 + p.ph), a = (.2 + .65 * p.z) * tw * amount;
    const g = bctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
    g.addColorStop(0, `rgba(255,226,140,${a})`); g.addColorStop(.35, `rgba(232,185,35,${a * .55})`); g.addColorStop(1, 'rgba(217,168,33,0)');
    bctx.fillStyle = g; bctx.beginPath(); bctx.arc(x, y, r * 2.6, 0, 6.283); bctx.fill();
  }
}
const gctx = $('grainc').getContext('2d'), gimg = gctx.createImageData(480, 270);
function grain(frame) { const R2 = rng(frame * 7919 + 1); for (let i = 0; i < gimg.data.length; i += 4) { const v = R2() * 255; gimg.data[i] = gimg.data[i + 1] = gimg.data[i + 2] = v; gimg.data[i + 3] = 255 } gctx.putImageData(gimg, 0, 0) }

/* ---------- avatar ---------- */
let AV = null;
window.ready = AliAvatar.create($('av'), { src: '../assets/ali-avatar.glb', autostart: false, interactive: false, preserve: true, auto: false, dist: 5.6, targetY: 1.0 }).then(a => { AV = a; return true });

/* ---------- the timeline ---------- */
window.seek = function (t) {
  window.__VIDEO_T = t;
  const sc = i => t >= S[i] - .4 && t < S[i + 1] + .4;
  // scene visibility
  ['s1', 's2', 's3', 's4', 's5', 's6', 's7'].forEach((id, i) => { $(id).style.display = sc(i) ? 'block' : 'none' });
  // landscape: used in S1, S2, S7
  const land = t < S[2] + .4 || t >= S[6] - .4;
  $('scene').style.display = land ? 'block' : 'none'; $('shade').style.display = land ? 'block' : 'none';
  if (land) {
    const push = t < S[2] ? 1.16 - .16 * eo(prog(t, 0, 9)) : 1.04 - .04 * eo(prog(t, S[6], 46));
    $('scene').style.transform = `scale(${push}) translateX(${(t < S[2] ? -t * 4 : (t - 40) * 6)}px)`;
    $('scene').style.opacity = t < S[2] ? eo(prog(t, 0, 1.2)) : 1;
    $('shade').style.opacity = t < S[1] ? .55 : 1;
    $('shade').style.background = t >= S[6] - .4 ? 'linear-gradient(0deg,rgba(10,20,14,.95) 0%,rgba(10,20,14,.78) 50%,rgba(10,20,14,.25) 85%)' : 'linear-gradient(90deg,rgba(10,20,14,.9),rgba(10,20,14,.55) 40%,transparent 70%),linear-gradient(0deg,#12211A,transparent 30%)';
  }
  bokeh(t, t < S[2] ? 1 : t >= S[6] ? 1 : t >= S[4] && t < S[5] ? .6 : .35);
  grain(Math.floor(t * 30));

  /* S1 — title */
  if (sc(0)) {
    $('peak').querySelector('path').style.strokeDashoffset = 1 - eo(prog(t, .3, 1.6));
    show($('peak'), 1 - prog(t, 4.8, 5.4), `translateY(${-30 * eo(prog(t, 4.8, 5.5))}px)`);
    titleL.forEach((l, i) => l.style.transform = `translateY(${110 * (1 - eo(prog(t, 1.0 + i * .07, 1.9 + i * .07)))}%)`);
    $('tdot').style.transform = `scale(${back(prog(t, 2.0, 2.5))})`;
    show($('title'), 1 - prog(t, 4.9, 5.5), `scale(${1 + .06 * eio(prog(t, 1, 5.5))})`);
    show($('sub'), eo(prog(t, 2.5, 3.3)) * (1 - prog(t, 4.9, 5.4)), `translateY(${30 * (1 - eo(prog(t, 2.5, 3.3)))}px)`);
    $('sub').style.letterSpacing = (24 - 16 * eo(prog(t, 2.5, 4))) + 'px';
  }
  /* S2 — intro */
  if (sc(1)) {
    const k = eo(prog(t, 5.8, 7.0)), fl = Math.sin((t - 5.6) * 1.05) * 8;
    show($('hero'), k, `translateY(${(1 - k) * 160 + fl}px)`);
    show($('rock'), eo(prog(t, 5.6, 6.6)), `translateY(${(1 - eo(prog(t, 5.6, 6.6))) * 120 + fl}px)`);
    show($('halo'), eo(prog(t, 6.2, 7.2)) * .9, `scale(${.8 + .2 * eo(prog(t, 6.2, 7.2))}) rotate(${t * 6}deg)`);
    show($('s2l'), eo(prog(t, 6.1, 6.8)), `translateX(${-40 * (1 - eo(prog(t, 6.1, 6.8)))}px)`);
    s2w.forEach((w, i) => w.style.transform = `translateY(${110 * (1 - eo(prog(t, 6.3 + i * .09, 7.2 + i * .09)))}%)`);
    show($('s2p'), eo(prog(t, 7.6, 8.4)), `translateY(${30 * (1 - eo(prog(t, 7.6, 8.4)))}px)`);
  }
  /* S3 — skills */
  if (sc(2)) {
    $('ghost').style.transform = `translateX(${-200 - (t - S[2]) * 90}px)`;
    show($('s3l'), eo(prog(t, 11.4, 12)));
    show($('s3h'), eo(prog(t, 11.5, 12.3)), `translateY(${50 * (1 - eo(prog(t, 11.5, 12.3)))}px)`);
    SK.forEach(([n, v], i) => {
      const a = 12.1 + i * .22, k = eo(prog(t, a, a + .7)), b = eio(prog(t, a + .3, a + 1.9));
      show($('sk' + i), k, `translateY(${40 * (1 - k)}px)`);
      $('skb' + i).style.transform = `scaleX(${b})`; $('skv' + i).textContent = Math.round(v * b);
    });
    $('mqt').style.transform = `translateX(${-(t - S[2]) * 160}px)`;
    show($('mq'), eo(prog(t, 12.6, 13.3)), `rotate(-1.5deg) translateY(${80 * (1 - eo(prog(t, 12.6, 13.3)))}px)`);
  }
  /* S4 — projects carousel */
  if (sc(3)) {
    show($('s4l'), eo(prog(t, 18.4, 19)));
    show($('s4h'), eo(prog(t, 18.5, 19.3)), `translateY(${50 * (1 - eo(prog(t, 18.5, 19.3)))}px)`);
    // focus moves 0→5 with holds
    const u = clamp((t - 19.6) / 1.45, 0, 5), f = Math.floor(u) + eio(clamp((u - Math.floor(u)) * 2.2 - 1.2, 0, 1));
    const enter = eo(prog(t, 18.6, 19.8));
    PROJECTS.forEach((p, i) => {
      const d = i - Math.min(5, f), ad = Math.abs(d);
      const el = $('pc' + i);
      el.style.transform = `translateX(${d * 560 + (1 - enter) * 1400}px) translateZ(${-ad * 260}px) rotateY(${-d * 22}deg) scale(${1 - Math.min(ad, 2) * .06})`;
      el.style.opacity = clamp(1.6 - ad * .45) * enter;
      el.style.zIndex = 10 - Math.round(ad);
      el.style.borderColor = ad < .5 ? 'rgba(232,185,35,.95)' : 'rgba(217,168,33,.25)';
      el.style.boxShadow = ad < .5 ? '0 0 80px -10px rgba(232,185,35,.55),0 40px 80px -20px #000' : '0 30px 60px -30px #000';
    });
    const cur = Math.round(Math.min(5, f)), p = PROJECTS[cur], cf = 1 - Math.min(1, Math.abs(f - cur) * 2.5);
    $('cap').innerHTML = `<div class="label" style="font-size:22px">${p.cat}</div><div class="serif" style="font-size:70px;margin:10px 0 16px">${p.title}</div><div>${p.tags.map(x => `<span class="tag">${x}</span>`).join('')}</div>`;
    show($('cap'), cf * enter, `translateY(${(1 - cf) * 20}px)`);
    $('s4n').textContent = `0${cur + 1} / 06`; show($('s4n'), enter);
  }
  /* S5 — 3D avatar */
  if (sc(4) && AV) {
    const lt = t - S[4], k = eo(prog(t, 28.3, 29.2));
    $('av').style.opacity = k; $('av').style.transform = `translateY(${(1 - k) * 60}px)`; $('rock2').style.opacity = k;
    let g = null, gs = 0, ex = 'Neutral';
    if (lt >= .9 && lt < 3.3) { g = 'Wave'; gs = .9 }
    else if (lt >= 3.4) { g = 'Celebrate'; gs = 3.4; ex = 'Smile' }
    AV.renderAt(t, { gesture: g, gestureStart: gs, expr: ex, yaw: -.5 + Math.sin(lt * .55) * .55 + .3 });
    show($('s5l'), eo(prog(t, 28.6, 29.2)));
    show($('s5h'), eo(prog(t, 28.7, 29.5)), `translateY(${50 * (1 - eo(prog(t, 28.7, 29.5)))}px)`);
    for (let i = 0; i < 5; i++) { const c = eo(prog(t, 29.6 + i * .3, 30.2 + i * .3)); show($('ch' + i), c, `translateY(${30 * (1 - c)}px) scale(${.9 + .1 * c})`) }
  }
  /* S6 — achievements */
  if (sc(5)) {
    show($('s6l'), eo(prog(t, 34.4, 35)));
    [2, 25, 15].forEach((v, i) => { const k = eo(prog(t, 34.6 + i * .25, 35.3 + i * .25)); show($('st' + i), k, `translateY(${50 * (1 - k)}px)`); $('stv' + i).textContent = Math.round(v * eio(prog(t, 34.8 + i * .25, 36.4 + i * .25))) });
    $('tlline').style.transform = `scaleX(${eio(prog(t, 35.6, 37.4))})`;
    for (let i = 0; i < 4; i++) { const k = back(prog(t, 35.8 + i * .45, 36.3 + i * .45)); show($('tld' + i), clamp(k), `scale(${.6 + .4 * k})`) }
    const ck = eo(prog(t, 34.6, 36));
    $('cert').style.transform = `rotateY(${(1 - ck) * 50 - 12 + Math.sin(t * .9) * 4}deg) rotateX(${6 + Math.sin(t * .7) * 2}deg) translateY(${Math.sin(t * 1.1) * 8}px)`;
    $('cert').parentElement.style.opacity = ck;
    const gx = -40 + prog(t, 36, 38.5) * 180;
    $('glare').style.background = `linear-gradient(110deg,transparent ${gx - 12}%,rgba(255,248,220,.45) ${gx}%,transparent ${gx + 12}%)`;
  }
  /* S7 — CTA */
  if (sc(6)) {
    const k = eo(prog(t, 40.4, 41.3)), wave = Math.sin((t - 41) * 9) * 4 * prog(t, 41, 41.4) * (1 - prog(t, 42.6, 43));
    show($('hero2'), k, `translateY(${(1 - k) * 80 + Math.sin(t * 1.05) * 6}px) rotate(${wave}deg)`);
    show($('bub'), back(prog(t, 41.2, 41.7)), `scale(${back(prog(t, 41.2, 41.7))})`);
    s7w.forEach((w, i) => w.style.transform = `translateY(${110 * (1 - eo(prog(t, 40.8 + i * .09, 41.7 + i * .09)))}%)`);
    show($('mail'), eo(prog(t, 42, 42.8)), `translateY(${30 * (1 - eo(prog(t, 42, 42.8)))}px)`);
    $('mline').style.transform = `scaleX(${eio(prog(t, 42.6, 43.6))})`;
    show($('s7p'), eo(prog(t, 43.2, 43.9)));
  }
  // end card
  show($('end'), eio(prog(t, 44.6, 45.3)) * (1 - prog(t, 45.8, 46)) + (t >= 46 ? 0 : 0));
  // gold wipes between scenes
  let w = -1;
  for (const b of S.slice(1, 6 + 1)) { if (b === 46) continue; const p = prog(t, b - .45, b + .45); if (p > 0 && p < 1) { w = p; break } }
  $('wipe').style.display = w < 0 ? 'none' : 'block';
  if (w >= 0) $('wipe').style.transform = `translateX(${-1300 + eio(w) * 3600}px) skewX(-14deg)`;
};
window.DUR = DUR;
