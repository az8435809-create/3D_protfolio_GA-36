/* Contact form: live validation (same rules as the server), spam traps, clear success / error states. */
(function(){
  const form=document.getElementById('contactForm');if(!form||!window.ContactRules)return;
  const R=window.ContactRules,startedAt=Date.now(),track=n=>window.AZTrack&&AZTrack(n);
  const F={name:form.elements.name,email:form.elements.email,subject:form.elements.subject,message:form.elements.message};
  const status=document.getElementById('cfStatus'),btn=document.getElementById('cfSubmit'),count=document.getElementById('cfCount');
  const touched=new Set();const template=form.innerHTML;
  const errEl=k=>document.getElementById('cf'+k[0].toUpperCase()+k.slice(1)+'Err');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function values(){return{name:F.name.value,email:F.email.value,subject:F.subject.value,message:F.message.value}}
  function show(errors,only){Object.keys(F).forEach(k=>{if(only&&!touched.has(k))return;const e=errors[k]||'';errEl(k).textContent=e;F[k].setAttribute('aria-invalid',!!e);F[k].dataset.valid=!e&&F[k].value.trim()?'true':'false'})}
  function check(only){const r=R.validate(values());show(r.errors,only);return r}
  Object.entries(F).forEach(([k,el])=>{el.addEventListener('blur',()=>{if(el.value.trim()){touched.add(k);check(true)}});el.addEventListener('input',()=>{if(touched.has(k))check(true)})});
  function upd(){const n=F.message.value.length;count.textContent=`${n} / ${R.LIMITS.message[1]}`;count.style.color=n>0&&n<R.LIMITS.message[0]?'#e0795f':''}
  F.message.addEventListener('input',upd);upd();
  document.querySelectorAll('[data-topic]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();F.subject.value=a.dataset.topic;touched.add('subject');check(true);
    form.scrollIntoView({behavior:document.documentElement.classList.contains('rm')?'auto':'smooth',block:'center'});setTimeout(()=>(F.name.value?F.message:F.name).focus(),400);track('contact:topic')}));
  function fail(msg,v){
    const mail=`mailto:az8435809@gmail.com?subject=${encodeURIComponent(v.subject||'Hello Ali')}&body=${encodeURIComponent(v.message||'')}`;
    status.className='cf-status error';
    status.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg><div><b>Message not sent.</b> ${esc(msg)} <a href="${esc(mail)}">Send it by email instead</a>.</div>`;
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();status.className='cf-status';status.textContent='';
    Object.keys(F).forEach(k=>touched.add(k));const r=check(false);
    if(!r.ok){const first=Object.keys(F).find(k=>r.errors[k]);F[first].focus();status.className='cf-status error';status.textContent='Please fix the highlighted fields.';return}
    if(R.spamScore(r.values)>=3){fail('Your message looks like spam to our filter — please remove links or promotional text.',r.values);return}
    btn.setAttribute('aria-busy','true');btn.querySelector('.cf-label').textContent='Sending…';
    try{
      const res=await fetch('api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...r.values,website:form.elements.website.value,startedAt})});
      const json=(res.headers.get('content-type')||'').includes('application/json')?await res.json():null;
      if(res.ok&&json&&json.ok){success(r.values);track('contact:sent');return}
      if(json&&json.errors){show(json.errors,false);const first=Object.keys(F).find(k=>json.errors[k]);first&&F[first].focus()}
      fail(json&&json.error?json.error:res.status===404||res.status===405?'The message server is not available on this copy of the site.':'Something went wrong on the server.',r.values);track('contact:error:'+res.status);
    }catch(err){fail('Could not reach the server — check your connection.',r.values);track('contact:error:network')}
    finally{btn.removeAttribute('aria-busy');const l=btn.querySelector('.cf-label');if(l)l.textContent='Send message'}
  });
  function success(v){
    form.innerHTML=`<div class="cf-success" tabindex="-1"><div class="tick"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h3>Message sent!</h3><p>Thank you, ${esc(v.name)}. Your message is on its way to Ali's inbox — he'll reply to <b>${esc(v.email)}</b>.</p>
      <small>Usually worth checking your spam folder for the reply.</small><button type="button" class="btn btn-outline btn-sm" id="cfAgain">Send another message</button></div>`;
    const s=form.querySelector('.cf-success');s.focus();
    document.getElementById('cfAgain').addEventListener('click',()=>location.reload());
  }
})();
