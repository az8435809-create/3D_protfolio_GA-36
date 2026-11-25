/* Showreel: muted looping preview while in view → "Play with sound" restarts with audio, controls and captions.
   Chapters seek the video; the hero "Watch the intro" button scrolls here and plays. */
(function(){
  const sec=document.getElementById('reel'),v=document.getElementById('reelVideo');if(!sec||!v)return;
  const play=document.getElementById('reelPlay'),bar=document.getElementById('reelBar'),chs=[...document.querySelectorAll('#chapters button')];
  const root=document.documentElement,track=n=>window.AZTrack&&AZTrack(n);
  let full=false;
  const rm=()=>root.classList.contains('rm')||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function goFull(t=0){full=true;sec.classList.add('playing');v.muted=false;v.loop=false;v.controls=true;v.currentTime=t;
    if(v.textTracks[0])v.textTracks[0].mode='showing';v.play().catch(()=>{v.muted=true;v.play()});}
  play.addEventListener('click',()=>goFull(0));
  chs.forEach(b=>b.addEventListener('click',()=>{const t=+b.dataset.t;if(!full)goFull(t);else{v.currentTime=t;v.play()}track('video:chapter')}));
  v.addEventListener('timeupdate',()=>{bar.style.width=(v.currentTime/(v.duration||46)*100)+'%';
    let cur=0;chs.forEach((b,i)=>{if(v.currentTime>=+b.dataset.t-.05)cur=i});chs.forEach((b,i)=>b.setAttribute('aria-current',full&&i===cur))});
  v.addEventListener('ended',()=>{full=false;sec.classList.remove('playing');v.controls=false;v.muted=true;v.loop=true;if(v.textTracks[0])v.textTracks[0].mode='hidden';track('video:completed')});
  // muted preview only while visible (and not with reduced motion)
  new IntersectionObserver(es=>{const on=es[0].isIntersecting;if(full){if(!on)v.pause();return}
    if(on&&!rm())v.play().catch(()=>{});else v.pause()},{threshold:.35}).observe(v);
  document.addEventListener('az:reducemotion',e=>{if(e.detail&&!full)v.pause()});
  // hero button
  document.querySelectorAll('[data-open-video]').forEach(b=>b.addEventListener('click',()=>{sec.scrollIntoView({behavior:rm()?'auto':'smooth',block:'center'});setTimeout(()=>goFull(0),rm()?0:650)}));
})();
