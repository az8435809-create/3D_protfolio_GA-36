/* Portfolio AI assistant (RAG).
   1) POST /api/chat on the deployed site (server-side retrieval + LLM, keys in env vars).
   2) No server (static host / preview): same retrieval in the browser (rag/retriever.js + data/rag-index.js),
      answer written by Claude when the page can ask it, otherwise extracted from the retrieved passages. */
(function(){
  const $=id=>document.getElementById(id);
  const fab=$('chatFab'),panel=$('chatPanel'),log=$('chatLog'),form=$('chatForm'),input=$('chatInput'),send=$('chatSend'),modeEl=$('chatMode');
  if(!fab||!panel)return;
  const track=n=>window.AZTrack&&AZTrack(n);
  const store={get(){try{return JSON.parse(sessionStorage.getItem('az_chat'))||[]}catch(_){return[]}},set(v){try{sessionStorage.setItem('az_chat',JSON.stringify(v.slice(-20)))}catch(_){}}};
  let history=store.get(),busy=false,backend=null,samplePromise=null;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const GREETING="Assalam-o-Alaikum! I'm Ali's AI assistant. Ask me about his education, skills, projects, achievements or how to work with him — I answer only from his documents and show my sources.";
  /* ---------- rendering ---------- */
  function md(text,sources){
    let h=esc(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    h=h.replace(/\[(\d)\]/g,(m,n)=>{const s=sources&&sources[n-1];return s?`<sup><a href="${esc(s.section||'#home')}" data-src title="${esc(s.title+' — '+s.heading)}">${n}</a></sup>`:''});
    const lines=h.split(/\n+/);let out='',inList=false;
    lines.forEach(l=>{const li=l.match(/^\s*[-•*]\s+(.*)/);if(li){if(!inList){out+='<ul>';inList=true}out+=`<li>${li[1]}</li>`}else{if(inList){out+='</ul>';inList=false}if(l.trim())out+=`<p>${l}</p>`}});
    return out+(inList?'</ul>':'');
  }
  function bubble(role,text,sources,opts={}){
    const el=document.createElement('div');el.className='msg '+role+(opts.nf?' nf':'');
    if(role==='user')el.textContent=text;else el.innerHTML=md(text,sources)+srcHtml(sources);
    log.append(el);log.scrollTop=log.scrollHeight;return el;
  }
  function srcHtml(sources){
    if(!sources||!sources.length)return'';const seen=new Set();
    const chips=sources.filter(s=>{const k=s.title+s.heading;if(seen.has(k))return false;seen.add(k);return true}).slice(0,4)
      .map(s=>`<a href="${esc(s.section||'#home')}" data-src>${esc(s.heading.length>34?s.heading.slice(0,32)+'…':s.heading)}</a>`).join('');
    return `<div class="srcs"><span>Sources</span>${chips}</div>`;
  }
  function typing(){const el=document.createElement('div');el.className='msg bot';el.innerHTML='<div class="typing" aria-label="Assistant is typing"><i></i><i></i><i></i></div>';log.append(el);log.scrollTop=log.scrollHeight;return el}
  function renderAll(){log.innerHTML='';bubble('bot',GREETING);history.forEach(m=>bubble(m.role==='user'?'user':'bot',m.content,m.sources,{nf:m.nf}))}
  /* ---------- open / close ---------- */
  function open(){panel.hidden=false;fab.setAttribute('aria-expanded','true');if(!log.children.length)renderAll();setTimeout(()=>input.focus(),60);track('chat:opened')}
  function close(){panel.hidden=true;fab.setAttribute('aria-expanded','false');fab.focus()}
  fab.addEventListener('click',open);$('chatClose').addEventListener('click',close);
  document.querySelectorAll('[data-open-chat]').forEach(b=>b.addEventListener('click',open));
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  $('chatInfo').addEventListener('click',e=>{const h=$('chatHow');h.hidden=!h.hidden;e.currentTarget.setAttribute('aria-expanded',!h.hidden)});
  $('chatReset').addEventListener('click',()=>{history=[];store.set(history);renderAll();input.focus()});
  $('chatSuggest').addEventListener('click',e=>{const b=e.target.closest('button');if(b)ask(b.textContent)});
  log.addEventListener('click',e=>{const a=e.target.closest('a[data-src]');if(a&&innerWidth<640)close()});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(120,input.scrollHeight)+'px'});
  form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(q)ask(q)});
  /* ---------- answering ---------- */
  async function ask(q){
    if(busy)return;busy=true;send.disabled=true;input.value='';input.style.height='auto';
    bubble('user',q);const t=typing();track('chat:question');
    const hist=history.map(m=>({role:m.role,content:m.content}));
    history.push({role:'user',content:q});
    let res;
    try{res=await answer(q,hist,partial=>{t.innerHTML=md(partial)})}
    catch(err){console.warn(err);res={answer:"Sorry — I couldn't answer just now. Please try again, or email Ali at az8435809@gmail.com.",sources:[]}}
    t.remove();const nf=/^I don't have that information/.test(res.answer);
    bubble('bot',res.answer,res.sources,{nf});history.push({role:'assistant',content:res.answer,sources:res.sources,nf});store.set(history);
    busy=false;send.disabled=false;input.focus();if(nf)track('chat:not-found');
  }
  async function answer(q,hist,onPartial){
    if(backend!=='client'){
      try{
        const r=await fetch('api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q,history:hist})});
        const ct=r.headers.get('content-type')||'';
        if(ct.includes('application/json')){const j=await r.json();if(r.ok&&j.answer){backend='server';setMode(j.mode);return j}if(r.status===429)return{answer:j.error,sources:[]}}
        if(r.status!==404&&r.status!==405&&backend==='server')throw new Error('server '+r.status);
      }catch(e){if(backend==='server')throw e}
      backend='client';
    }
    return clientAnswer(q,hist,onPartial);
  }
  function loadIndex(){return window.RAG_INDEX?Promise.resolve(window.RAG_INDEX):new Promise((res,rej)=>{const s=document.createElement('script');s.src='data/rag-index.js';s.onload=()=>res(window.RAG_INDEX);s.onerror=rej;document.head.append(s)})}
  function getSample(){if(!samplePromise)samplePromise=(window.claude&&window.claude.use)?Promise.race([window.claude.use('sample'),new Promise(r=>setTimeout(()=>r(null),4000))]).catch(()=>null):Promise.resolve(null);return samplePromise}
  async function clientAnswer(q,hist,onPartial){
    const idx=await loadIndex();const lastUser=[...hist].reverse().find(m=>m.role==='user');
    const hits=RAG.retrieve(idx,q,lastUser&&lastUser.content,4);
    const sources=hits.map((h,i)=>({n:i+1,title:h.title,heading:h.heading,section:h.section}));
    if(!RAG.answerable(hits)){setMode('retrieval');return{answer:RAGPrompt.NOT_FOUND,sources:[]}}
    const sample=await getSample();
    if(sample){
      try{
        const msgs=[...hist.slice(-4),{role:'user',content:RAGPrompt.SYSTEM+'\n\n'+RAGPrompt.userMessage(q,hits)}];
        while(msgs.length&&msgs[0].role!=='user')msgs.shift();
        const out=await sample(msgs,{cache:false,modelTier:'quick',onText:({text})=>{if(text&&text!=='Thinking...')onPartial(text)}});
        setMode('llm');return{answer:(out.text||'').trim()||RAGPrompt.NOT_FOUND,sources};
      }catch(e){if(e&&e.code==='not_granted')samplePromise=Promise.resolve(null);console.warn('sample',e)}
    }
    setMode('extractive');return{answer:RAGPrompt.extractive(q,hits,RAG),sources};
  }
  function setMode(m){modeEl.textContent={llm:'AI answers grounded in Ali’s documents',extractive:'Quotes from Ali’s documents (no AI key set)',retrieval:'Answers only from Ali’s documents'}[m]||modeEl.textContent}
})();
