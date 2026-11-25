(function(){
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const root=document.documentElement,fine=matchMedia('(pointer:fine)').matches;
  const RM=()=>root.classList.contains('rm')||matchMedia('(prefers-reduced-motion: reduce)').matches;let reduce=RM();
  document.addEventListener('az:reducemotion',()=>reduce=RM());
  const EMAIL=window.__EMAIL||'az8435809@gmail.com';
  const tl=$('#timeline'),fill=$('#tlFill');

  /* ---- split headings into words ---- */
  $$('[data-split]').forEach(el=>{let w=0;const walk=n=>{[...n.childNodes].forEach(c=>{
      if(c.nodeType===3){const f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;if(/^\s+$/.test(t)){f.append(t);return}
        const o=document.createElement('span');o.className='split-word';const i=document.createElement('span');i.textContent=t;i.style.setProperty('--w',w++);o.append(i);f.append(o)});c.replaceWith(f)}
      else if(c.nodeType===1)walk(c)})};walk(el)});

  /* ---- preloader ---- */
  const pre=$('#preloader'),cnt=$('#preCount');document.body.classList.add('loading');
  let p=0;const tick=setInterval(()=>{p=Math.min(100,p+Math.ceil(Math.random()*9));if(cnt)cnt.textContent=p;if(p>=100)clearInterval(tick)},40);
  const finish=()=>{clearInterval(tick);if(cnt)cnt.textContent=100;setTimeout(()=>{pre&&pre.classList.add('done');document.body.classList.remove('loading');startReveal()},reduce?0:250)};
  let started=false;function startReveal(){if(started)return;started=true;io()}
  if(document.readyState==='complete')setTimeout(finish,900);else addEventListener('load',()=>setTimeout(finish,600));
  setTimeout(finish,3500);

  /* ---- reveal on scroll ---- */
  function io(){
    $$('[data-stagger]').forEach(g=>[...g.children].forEach((c,i)=>c.style.setProperty('--i',i)));
    const ob=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const t=e.target;t.classList.add('in');
      $$('[data-count]',t).forEach(countUp);if(t.matches('[data-stagger]'))$$('.skill-card',t).forEach(c=>c.classList.add('on'));ob.unobserve(t)}),{threshold:.14,rootMargin:'0px 0px -6% 0px'});
    $$('[data-reveal],[data-stagger],[data-split]').forEach(el=>ob.observe(el));
  }
  function countUp(el){if(el.dataset.done)return;el.dataset.done=1;const end=+el.dataset.count,dur=1600,t0=performance.now();
    const f=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,4);el.textContent=Math.round(end*e);if(k<1)requestAnimationFrame(f)};reduce?el.textContent=end:requestAnimationFrame(f)}

  /* ---- nav ---- */
  const nav=$('#nav'),burger=$('#burger'),menu=$('#mobileMenu');
  const onScroll=()=>{nav.classList.toggle('scrolled',scrollY>40);root.style.setProperty('--sy',Math.min(scrollY,1200));timeline()};
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  const toggle=o=>{burger.setAttribute('aria-expanded',o);menu.classList.toggle('open',o);menu.setAttribute('aria-hidden',!o);document.body.style.overflow=o?'hidden':''};
  burger.addEventListener('click',()=>toggle(burger.getAttribute('aria-expanded')!=='true'));
  $$('a',menu).forEach(a=>a.addEventListener('click',()=>toggle(false)));
  const links=$$('.nav-links a');
  const secObs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const id=e.target.id==='testimonials'?'journey':e.target.id;links.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+id))}}),{rootMargin:'-45% 0px -50% 0px'});
  $$('main section[id]').forEach(s=>secObs.observe(s));

  /* ---- mouse parallax ---- */
  let tx=0,ty=0,cx=0,cy=0;const stage=$('#heroStage'),scene=$('#scene');
  addEventListener('pointermove',e=>{if(reduce){tx=ty=0;return}tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5},{passive:true});
  (function par(){cx+=(tx-cx)*.06;cy+=(ty-cy)*.06;
    if(stage){stage.style.setProperty('--mx',(cx*2).toFixed(3));stage.style.setProperty('--my',(cy*2).toFixed(3))}
    if(scene){scene.style.setProperty('--px',(cx).toFixed(3));scene.style.setProperty('--py',(cy).toFixed(3))}
    requestAnimationFrame(par)})();

  /* ---- golden bokeh ---- */
  const cv=$('#bokeh');if(cv){const g=cv.getContext('2d');let W,H,parts=[],vis=true;
    const fit=()=>{const d=Math.min(devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*d;cv.height=H*d;g.setTransform(d,0,0,d,0,0);
      const n=Math.round(Math.min(90,W*H/16000));parts=[...Array(n)].map(()=>mk(true))};
    const mk=init=>{const z=Math.random();return{x:Math.random()*W,y:init?Math.random()*H:H+20,r:1+z*z*9,z,vy:.12+z*.45,ph:Math.random()*6.28,b:z>.75?6:0}};
    fit();addEventListener('resize',fit);new IntersectionObserver(e=>{vis=e[0].isIntersecting;if(vis)requestAnimationFrame(draw)}).observe(cv);
    function draw(t){if(!vis)return;g.clearRect(0,0,W,H);if(reduce){setTimeout(()=>requestAnimationFrame(draw),500)}
      for(const p of parts){if(!reduce){p.y-=p.vy;p.x+=Math.sin(t/2200+p.ph)*.25*p.z}if(p.y<-20)Object.assign(p,mk(false));
        const x=p.x+cx*-60*p.z,y=p.y+cy*-40*p.z,tw=.55+.45*Math.sin(t/900+p.ph);
        const gr=g.createRadialGradient(x,y,0,x,y,p.r*2.6);const a=(.25+.65*p.z)*tw;
        gr.addColorStop(0,`rgba(255,226,140,${a})`);gr.addColorStop(.35,`rgba(232,185,35,${a*.55})`);gr.addColorStop(1,'rgba(217,168,33,0)');
        g.fillStyle=gr;g.beginPath();g.arc(x,y,p.r*2.6,0,6.283);g.fill()}
      if(!reduce)requestAnimationFrame(draw)}requestAnimationFrame(draw)}

  /* ---- cursor + magnetic ---- */
  if(fine&&!reduce){const c=$('#cursor'),dot=$('.cursor-dot'),ring=$('.cursor-ring');let x=-100,y=-100,rx=x,ry=y;
    addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;dot.style.transform=`translate3d(${x}px,${y}px,0)`},{passive:true});
    (function f(){rx+=(x-rx)*.18;ry+=(y-ry)*.18;ring.style.transform=`translate3d(${rx}px,${ry}px,0)`;requestAnimationFrame(f)})();
    document.addEventListener('pointerover',e=>c.classList.toggle('hover',!!e.target.closest('a,button,[role=button],.project,.cert-3d')));
    $$('.magnetic').forEach(b=>{b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.translate=`${(e.clientX-r.left-r.width/2)*.25}px ${(e.clientY-r.top-r.height/2)*.3}px`});b.addEventListener('pointerleave',()=>b.style.translate='')});
    $$('.skill-card').forEach(c=>c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--sx',e.clientX-r.left+'px');c.style.setProperty('--sy',e.clientY-r.top+'px')}));
    const mc=$('.mail-card');mc&&mc.addEventListener('pointermove',e=>{const r=mc.getBoundingClientRect();mc.style.setProperty('--mcx',e.clientX-r.left+'px');mc.style.setProperty('--mcy',e.clientY-r.top+'px')});
  }

  /* ---- timeline progress ---- */
  function timeline(){if(!tl)return;const r=tl.getBoundingClientRect(),v=innerHeight*.6;fill.style.setProperty('--p',Math.max(0,Math.min(1,(v-r.top)/r.height)).toFixed(3))}

  /* ---- modals ---- */
  let lastFocus;
  const open=m=>{lastFocus=document.activeElement;m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>$('.modal-x',m)?.focus(),50)};
  const close=m=>{m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';lastFocus&&lastFocus.focus()};
  $$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target.closest('[data-close]'))close(m)}));
  addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal.open').forEach(close)});
  const cm=$('#caseModal');
  const showCase=i=>{const p=window.__PROJECTS[i];const mail=`mailto:${EMAIL}?subject=${encodeURIComponent('About your project: '+p.title)}`;
    $('#caseBody').innerHTML=`<div class="case-media">${p.img?`<img src="${p.img}" alt="">`:window.__COVER(p.art,'m'+i)}</div><div class="case-body">
      <span class="p-cat">${p.cat}</span><h3 id="caseTitle">${p.title}</h3><p>${p.desc}</p><h4>How it was built</h4><p>${p.details}</p>
      <h4>Tools</h4><div class="tags">${p.tags.map(t=>`<span>${t}</span>`).join('')}</div>
      ${p.demo||p.github?`<div class="p-actions">${p.demo?`<a class="btn btn-gold" target="_blank" rel="noopener" href="${p.demo}">Live demo</a>`:''}${p.github?`<a class="btn btn-outline" target="_blank" rel="noopener" href="${p.github}">GitHub</a>`:''}</div>`
      :`<p class="case-note">A live demo and source walkthrough are available on request. <a href="${mail}">Email me about this project</a>.</p>`}</div>`;open(cm)};
  document.addEventListener('click',e=>{const t=e.target.closest('[data-case]');if(t){e.preventDefault();showCase(+t.dataset.case)}});
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.p-media')){e.preventDefault();showCase(+e.target.dataset.case)}});

  /* ---- certificate 3D tilt ---- */
  const cert=$('#cert3d'),ci=$('.cert-inner',cert);
  if(cert){cert.addEventListener('pointermove',e=>{const r=cert.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      ci.style.setProperty('--ry',((x-.5)*22).toFixed(2)+'deg');ci.style.setProperty('--rx',((.5-y)*16).toFixed(2)+'deg');ci.style.setProperty('--gx',x*100+'%');ci.style.setProperty('--gy',y*100+'%')});
    cert.addEventListener('pointerleave',()=>{ci.style.removeProperty('--rx');ci.style.removeProperty('--ry')});
    cert.addEventListener('click',()=>open($('#certModal')))}

  /* ---- email contact ---- */
  const toast=msg=>{const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2400)};
  $('#copyMail')?.addEventListener('click',async e=>{const b=e.currentTarget,s=$('span',b);
    try{await navigator.clipboard.writeText(EMAIL)}catch(_){const a=document.createElement('textarea');a.value=EMAIL;document.body.append(a);a.select();try{document.execCommand('copy')}catch(__){}a.remove()}
    s.textContent='Copied!';toast('Email copied to clipboard');setTimeout(()=>s.textContent='Copy address',2000)});
  /* topic chips now pre-fill the contact form (js/contact-form.js) */

  /* ---- CV: falls back to email if the PDF isn't in assets/ yet ---- */
  const cvBtn=$('[data-cv]');
  cvBtn&&cvBtn.addEventListener('click',async e=>{e.preventDefault();const href=cvBtn.getAttribute('href');
    try{const r=await fetch(href,{method:'HEAD'});if(r.ok){const a=document.createElement('a');a.href=href;a.download='Ali-Zain-CV.pdf';a.click();return}}catch(_){}
    toast('CV on request — opening email');setTimeout(()=>location.href=`mailto:${EMAIL}?subject=${encodeURIComponent('CV request')}`,700)});
})();
