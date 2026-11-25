/* Website analytics.
   1) Built-in, privacy-friendly analytics: counts visits, section reach, engaged time and interactions.
      No cookies, nothing leaves the browser; open "Site insights" in the footer (or add #insights to the URL).
   2) Optional: add your Plausible domain or GA4 id below to collect stats from ALL visitors on your live site.
   Visitors can opt out in the Accessibility & display panel; Do Not Track is respected. */
(function(){
  const CONFIG={plausibleDomain:'',ga4Id:''};          // e.g. plausibleDomain:'alizain.dev'  ga4Id:'G-XXXXXXX'
  const KEY='az_analytics',PREF='az_prefs';
  const optedOut=()=>{if(navigator.doNotTrack==='1')return true;try{return JSON.parse(localStorage.getItem(PREF)||'{}').noStats===true}catch(_){return false}};
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||null}catch(_){return null}};
  const save=d=>{try{localStorage.setItem(KEY,JSON.stringify(d))}catch(_){}};
  const blank=()=>({since:Date.now(),visits:0,days:{},events:{},sections:{},engagedMs:0,last:0});
  let D=load()||blank();
  const today=()=>new Date().toISOString().slice(0,10);
  function bump(map,k,n=1){map[k]=(map[k]||0)+n}
  /* providers */
  function loadProviders(){if(optedOut())return;
    if(CONFIG.plausibleDomain){const s=document.createElement('script');s.defer=true;s.dataset.domain=CONFIG.plausibleDomain;s.src='https://plausible.io/js/script.js';document.head.append(s);window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}}
    if(CONFIG.ga4Id){const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+CONFIG.ga4Id;document.head.append(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',CONFIG.ga4Id,{anonymize_ip:true})}}
  /* public tracker */
  window.AZTrack=function(name){if(optedOut())return;bump(D.events,name);save(D);
    try{window.plausible&&plausible(name);window.gtag&&gtag('event',name.replace(/[^a-z0-9_]/gi,'_').slice(0,40))}catch(_){}};
  /* visit */
  if(!optedOut()){const sess=sessionStorage.getItem('az_sess');if(!sess){try{sessionStorage.setItem('az_sess','1')}catch(_){}D.visits++;bump(D.days,today());D.last=Date.now();save(D)}}
  loadProviders();
  /* engaged time (tab visible + active in the last 30s) */
  let lastAct=Date.now();['pointermove','keydown','scroll','touchstart'].forEach(e=>addEventListener(e,()=>lastAct=Date.now(),{passive:true}));
  setInterval(()=>{if(optedOut()||document.hidden||Date.now()-lastAct>30000)return;D.engagedMs+=5000;save(D)},5000);
  /* section reach: counted once per visit when half visible for 0.8s */
  document.addEventListener('DOMContentLoaded',()=>{
    const seen=new Set(),timers={};
    const io=new IntersectionObserver(es=>es.forEach(e=>{const id=e.target.id;if(e.isIntersecting){timers[id]=setTimeout(()=>{if(seen.has(id)||optedOut())return;seen.add(id);bump(D.sections,id);save(D)},800)}else clearTimeout(timers[id])}),{threshold:.35});
    document.querySelectorAll('main section[id]').forEach(s=>io.observe(s));
    document.addEventListener('click',e=>{const t=e.target.closest('[data-track],a[href^="mailto:"],[data-case],#copyMail,a[href^="http"]');if(!t)return;
      if(t.dataset.track)AZTrack(t.dataset.track);else if(t.matches('a[href^="mailto:"]'))AZTrack('contact:email-click');else if(t.id==='copyMail')AZTrack('contact:copy-email');
      else if(t.dataset.case!==undefined)AZTrack('project:case-study');else AZTrack('outbound:'+new URL(t.href).hostname)});
    /* dashboard */
    const modal=document.getElementById('insightsModal');if(!modal)return;
    const fmt=ms=>{const s=Math.round(ms/1000);return s<60?s+'s':Math.floor(s/60)+'m '+(s%60)+'s'};
    const NAMES={home:'Hero',about:'About',reel:'Showreel',avatar:'3D avatar',skills:'Skills',projects:'Projects',journey:'Journey',testimonials:'Testimonials',contact:'Contact'};
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function render(){D=load()||D;const v=Math.max(1,D.visits);
      const emails=(D.events['contact:email-click']||0)+(D.events['contact:copy-email']||0);
      const days=[...Array(14)].map((_,i)=>{const d=new Date(Date.now()-(13-i)*864e5).toISOString().slice(0,10);return[d,D.days[d]||0]});const mx=Math.max(1,...days.map(d=>d[1]));
      const secs=Object.keys(NAMES).map(k=>[NAMES[k],D.sections[k]||0]);
      const top=Object.entries(D.events).sort((a,b)=>b[1]-a[1]).slice(0,8);
      document.getElementById('insightsBody').innerHTML=`
      <div class="kpis"><div><b>${D.visits}</b><span>Visits</span></div><div><b>${fmt(D.engagedMs/v)}</b><span>Avg. engaged time</span></div><div><b>${emails}</b><span>Email clicks &amp; copies</span></div><div><b>${D.events['project:case-study']||0}</b><span>Case studies opened</span></div></div>
      <h4>Visits, last 14 days</h4><div class="spark" role="img" aria-label="Visits per day for the last 14 days">${days.map(([d,n])=>`<span style="--h:${n/mx*100}%" title="${d}: ${n}"><i>${n||''}</i></span>`).join('')}</div>
      <h4>Section reach</h4><div class="reach">${secs.map(([n,c])=>`<div class="row"><span>${n}</span><div class="bar-h"><i style="width:${Math.min(100,c/v*100)}%"></i></div><b>${Math.round(Math.min(100,c/v*100))}%</b></div>`).join('')}</div>
      <h4>Top interactions</h4>${top.length?`<ol class="top">${top.map(([k,n])=>`<li><span>${esc(k)}</span><b>${n}</b></li>`).join('')}</ol>`:'<p class="muted">No interactions recorded yet.</p>'}
      <p class="muted small">Recorded in this browser only since ${new Date(D.since).toLocaleDateString()}. ${CONFIG.plausibleDomain||CONFIG.ga4Id?'Live provider connected for all visitors.':'Add a Plausible domain or GA4 id in js/analytics.js to see every visitor.'} ${optedOut()?'<b>Tracking is currently off.</b>':''}</p>`}
    const open=()=>{render();modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';modal.querySelector('.modal-x').focus()};
    document.querySelectorAll('[data-open-insights]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();open()}));
    if(location.hash==='#insights')setTimeout(open,1200);
    document.getElementById('insReset').addEventListener('click',()=>{D=blank();save(D);render()});
    document.getElementById('insCopy').addEventListener('click',async e=>{try{await navigator.clipboard.writeText(JSON.stringify(D,null,2));e.target.textContent='Copied'}catch(_){e.target.textContent='Copy failed'}setTimeout(()=>e.target.textContent='Copy data (JSON)',1600)});
  });
})();
