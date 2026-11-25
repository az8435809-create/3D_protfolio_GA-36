/* Theme (dark / light / system) + Accessibility & display preferences, saved per browser */
(function(){
  const root=document.documentElement,KEY='az_prefs';
  const get=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(_){return{}}};
  const put=p=>{try{localStorage.setItem(KEY,JSON.stringify(p))}catch(_){}};
  let P=Object.assign({theme:'system',text:'1',motion:false,contrast:false,underline:false,noStats:false},get());
  const sysLight=matchMedia('(prefers-color-scheme: light)');
  const sysRM=matchMedia('(prefers-reduced-motion: reduce)');
  function apply(){
    const t=P.theme==='system'?(sysLight.matches?'light':'dark'):P.theme;
    if(root.dataset.theme!==t){root.dataset.theme=t;document.dispatchEvent(new CustomEvent('az:theme',{detail:t}))}
    document.querySelector('meta[name=theme-color]')?.setAttribute('content',t==='light'?'#F3EEE2':'#12211A');
    root.style.fontSize=(+P.text*100)+'%';
    const rm=P.motion||sysRM.matches;if(root.classList.contains('rm')!==rm){root.classList.toggle('rm',rm);document.dispatchEvent(new CustomEvent('az:reducemotion',{detail:rm}))}
    root.classList.toggle('hc',!!P.contrast);root.classList.toggle('ul',!!P.underline);
    const tb=document.getElementById('themeToggle');if(tb){tb.setAttribute('aria-label',t==='light'?'Switch to dark theme':'Switch to light theme');tb.dataset.mode=t}
    syncPanel()}
  function set(k,v){P[k]=v;put(P);apply();window.AZTrack&&AZTrack('prefs:'+k+':'+v)}
  sysLight.addEventListener?.('change',apply);sysRM.addEventListener?.('change',apply);
  apply();
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('themeToggle')?.addEventListener('click',()=>{const cur=root.dataset.theme;set('theme',cur==='light'?'dark':'light')});
    const panel=document.getElementById('prefsPanel'),btn=document.getElementById('prefsBtn');
    const openP=o=>{panel.hidden=!o;btn.setAttribute('aria-expanded',o);if(o)panel.querySelector('input,button').focus()};
    btn.addEventListener('click',()=>openP(panel.hidden));
    panel.querySelector('.prefs-x').addEventListener('click',()=>{openP(false);btn.focus()});
    addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){openP(false);btn.focus()}});
    document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!btn.contains(e.target))openP(false)});
    panel.addEventListener('change',e=>{const t=e.target;if(t.name==='theme')set('theme',t.value);else if(t.name==='text')set('text',t.value);else if(t.dataset.pref)set(t.dataset.pref,t.checked)});
    document.getElementById('prefsReset').addEventListener('click',()=>{P={theme:'system',text:'1',motion:false,contrast:false,underline:false,noStats:false};put(P);apply()});
    syncPanel();
  });
  function syncPanel(){const panel=document.getElementById('prefsPanel');if(!panel)return;
    panel.querySelectorAll('input[name=theme]').forEach(i=>i.checked=i.value===P.theme);
    panel.querySelectorAll('input[name=text]').forEach(i=>i.checked=i.value===String(P.text));
    panel.querySelectorAll('[data-pref]').forEach(i=>i.checked=!!P[i.dataset.pref])}
})();
