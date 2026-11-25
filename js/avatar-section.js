/* Wires the "Meet the 3D Me" section to the AliAvatar player */
(function(){
  const cv=document.getElementById('avatarCanvas');if(!cv||!window.AliAvatar)return;
  const loading=document.getElementById('avatarLoading');
  const track=(n)=>window.AZTrack&&AZTrack(n);
  const ensureData=()=>new Promise(res=>{                  // file:// fallback: load the base64 copy of the GLB
    if(window.AVATAR_GLB_B64)return res();
    fetch('assets/ali-avatar.glb',{method:'HEAD'}).then(r=>r.ok?res():Promise.reject()).catch(()=>{const s=document.createElement('script');s.src='assets/ali-avatar-data.js';s.onload=res;s.onerror=res;document.head.append(s)})});
  let started=false;
  const io=new IntersectionObserver(async es=>{if(!es[0].isIntersecting||started)return;started=true;io.disconnect();
    try{await ensureData();const av=await AliAvatar.create(cv,{src:'assets/ali-avatar.glb',auto:!document.documentElement.classList.contains('rm')});window.__avatar=av;loading.classList.add('done');wire(av);
      setTimeout(()=>av.play('Wave'),700)}
    catch(e){loading.textContent='3D view unavailable on this device';console.warn(e)}},{rootMargin:'300px'});
  io.observe(cv);
  function wire(av){
    const gBtns=[...document.querySelectorAll('[data-gesture]')];
    gBtns.forEach(b=>b.addEventListener('click',()=>{av.play(b.dataset.gesture);gBtns.forEach(x=>x.classList.remove('playing'));b.classList.add('playing');
      if(b.dataset.exprWith){av.setExpression(b.dataset.exprWith);setTimeout(()=>{const cur=document.querySelector('[data-expr][aria-checked=true]');av.setExpression(cur?cur.dataset.expr:'Neutral')},1500)}
      setTimeout(()=>b.classList.remove('playing'),1800)}));
    const eBtns=[...document.querySelectorAll('[data-expr]')];
    eBtns.forEach(b=>b.addEventListener('click',()=>{eBtns.forEach(x=>x.setAttribute('aria-checked',x===b));av.setExpression(b.dataset.expr);track('avatar:expr:'+b.dataset.expr)}));
    const auto=document.getElementById('autoRotate');auto.addEventListener('change',()=>{av.setAuto(auto.checked);track('avatar:autorotate')});
    document.getElementById('resetView').addEventListener('click',()=>{av.reset();track('avatar:reset')});
    cv.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){av.nudge(-.08);e.preventDefault()}if(e.key==='ArrowRight'){av.nudge(.08);e.preventDefault()}
      if(e.key==='Enter'||e.key===' '){av.play('Wave');e.preventDefault()}});
    let down=0;cv.addEventListener('pointerdown',e=>down=e.clientX);
    cv.addEventListener('click',e=>{if(Math.abs(e.clientX-down)<4){const g=['Wave','Nod','Celebrate','Surprised'][Math.floor(Math.random()*4)];av.play(g);if(g==='Surprised'){av.setExpression('Surprised');setTimeout(()=>av.setExpression('Neutral'),1500)}track('avatar:click')}});
    document.addEventListener('az:reducemotion',e=>{av.setAuto(!e.detail&&auto.checked)});
    document.addEventListener('az:theme',e=>av.setLight(e.detail==='light'?1:0));av.setLight(document.documentElement.dataset.theme==='light'?1:0);
  }
})();
