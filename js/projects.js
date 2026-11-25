/* Projects: filter, search, sort, drag & keyboard re-ordering (saved per browser), 3D tilt */
(function(){
  const P=window.__PROJECTS,I=window.__ICONS,grid=document.getElementById('projectsGrid');if(!grid)return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const track=n=>window.AZTrack&&AZTrack(n);
  const store={get(){try{return JSON.parse(localStorage.getItem('az_order'))}catch(_){return null}},set(v){try{localStorage.setItem('az_order',JSON.stringify(v))}catch(_){}}};
  let custom=store.get()||P.map(p=>p.id);custom=custom.filter(id=>P.some(p=>p.id===id));P.forEach(p=>{if(!custom.includes(p.id))custom.push(p.id)});
  const st={filter:'all',q:'',sort:'featured',arrange:false};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const CAT={web:'Web',ai:'AI','3d':'3D',motion:'Motion',game:'Games',vr:'VR'};
  function list(){
    let L=P.slice();const q=st.q.trim().toLowerCase();
    if(st.filter!=='all'){const f=st.filter.split(',');L=L.filter(p=>f.includes(p.type))}
    if(q)L=L.filter(p=>[p.title,p.desc,p.cat,p.details,...p.tags].join(' ').toLowerCase().includes(q));
    const by={featured:()=>0,az:(a,b)=>a.title.localeCompare(b.title),za:(a,b)=>b.title.localeCompare(a.title),category:(a,b)=>a.cat.localeCompare(b.cat)||a.title.localeCompare(b.title),
      custom:(a,b)=>custom.indexOf(a.id)-custom.indexOf(b.id)};
    return L.sort(by[st.sort]);
  }
  function card(p,i,n){const idx=P.indexOf(p),num=String(idx+1).padStart(2,'0');
    return `<article class="project${st.arrange?' arranging':''}" data-id="${p.id}" ${st.arrange?'draggable="true"':''} aria-label="${esc(p.title)}">
    <div class="p-media" tabindex="0" role="button" data-case="${idx}" aria-label="Open case study: ${esc(p.title)}">${p.img?`<img src="${esc(p.img)}" alt="" loading="lazy">`:window.__COVER(p.art,idx)}<span class="p-num">${num}</span><span class="p-case">View case study ${I.arrow}</span></div>
    ${st.arrange?`<div class="move-ctl"><span class="grip" aria-hidden="true">⋮⋮</span><button class="mv" data-mv="-1" aria-label="Move ${esc(p.title)} earlier" ${i===0?'disabled':''}>←</button><span class="pos">${i+1} / ${n}</span><button class="mv" data-mv="1" aria-label="Move ${esc(p.title)} later" ${i===n-1?'disabled':''}>→</button></div>`:''}
    <div class="p-body"><span class="p-cat">${esc(p.cat)}</span><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p>
    <div class="tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>
    <div class="p-actions">${p.demo?`<a class="btn btn-gold" href="${esc(p.demo)}" target="_blank" rel="noopener" data-track="project:demo">Live demo ${I.ext}</a>`:`<button class="btn btn-gold" data-case="${idx}">Live demo ${I.ext}</button>`}
    ${p.github?`<a class="btn btn-outline" href="${esc(p.github)}" target="_blank" rel="noopener" data-track="project:github">${I.gh} GitHub</a>`:`<button class="btn btn-outline" data-case="${idx}">${I.gh} GitHub</button>`}</div></div></article>`}
  function render(animate=true){
    const before={};if(animate)$$('.project').forEach(el=>before[el.dataset.id]=el.getBoundingClientRect());
    const L=list();grid.innerHTML=L.map((p,i)=>card(p,i,L.length)).join('');
    [...grid.children].forEach((c,i)=>c.style.setProperty('--i',i));
    if(grid.classList.contains('in')||animate)grid.classList.add('in');
    $('#projEmpty').hidden=L.length>0;
    $('#projCount').textContent=L.length===P.length?`Showing all ${P.length} projects`:`Showing ${L.length} of ${P.length} projects`;
    // FLIP: slide cards from their previous spots
    if(animate&&!document.documentElement.classList.contains('rm'))$$('.project').forEach(el=>{const b=before[el.dataset.id],a=el.getBoundingClientRect();
      if(b){el.animate([{transform:`translate(${b.left-a.left}px,${b.top-a.top}px)`},{transform:'none'}],{duration:550,easing:'cubic-bezier(.22,1,.36,1)'})}
      else el.animate([{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'none'}],{duration:450,easing:'ease-out'})});
    tilt();
  }
  /* controls */
  $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{$$('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',x===b));st.filter=b.dataset.filter;render();track('projects:filter:'+b.textContent.trim())}));
  let tq;$('#projSearch').addEventListener('input',e=>{st.q=e.target.value;render();clearTimeout(tq);tq=setTimeout(()=>st.q&&track('projects:search'),900)});
  $('#projSort').addEventListener('change',e=>{st.sort=e.target.value;render();track('projects:sort:'+st.sort)});
  const setArrange=on=>{st.arrange=on;$('#arrangeBtn').setAttribute('aria-pressed',on);$('#arrangeBar').hidden=!on;
    if(on){st.sort='custom';$('#projSort').value='custom';st.filter='all';st.q='';$('#projSearch').value='';$$('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.filter==='all'))}render()};
  $('#arrangeBtn').addEventListener('click',()=>{setArrange(!st.arrange);track('projects:arrange')});
  $('#doneArrange').addEventListener('click',()=>setArrange(false));
  $('#resetOrder').addEventListener('click',()=>{custom=P.map(p=>p.id);store.set(custom);render();announce('Order reset')});
  $('#clearFilters').addEventListener('click',()=>{st.q='';st.filter='all';$('#projSearch').value='';$$('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.filter==='all'));render()});
  const announce=m=>{$('#projCount').textContent=m};
  function move(id,d){const order=list().map(p=>p.id);const i=order.indexOf(id),j=i+d;if(j<0||j>=order.length)return;[order[i],order[j]]=[order[j],order[i]];custom=order;store.set(custom);render();
    const btn=grid.querySelector(`[data-id="${id}"] [data-mv="${d}"]`)||grid.querySelector(`[data-id="${id}"] .mv:not([disabled])`);btn&&btn.focus();
    announce(`${P.find(p=>p.id===id).title} moved to position ${j+1}`)}
  grid.addEventListener('click',e=>{const b=e.target.closest('[data-mv]');if(b){e.stopPropagation();move(b.closest('.project').dataset.id,+b.dataset.mv)}});
  /* drag & drop */
  let dragId=null;
  grid.addEventListener('dragstart',e=>{const c=e.target.closest('.project');if(!c||!st.arrange)return;dragId=c.dataset.id;c.classList.add('dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',dragId)}catch(_){}});
  grid.addEventListener('dragover',e=>{if(!dragId)return;e.preventDefault();const over=e.target.closest('.project');$$('.project').forEach(x=>x.classList.toggle('drop-target',x===over&&x.dataset.id!==dragId))});
  grid.addEventListener('drop',e=>{e.preventDefault();const over=e.target.closest('.project');
    if(over&&dragId&&over.dataset.id!==dragId){const o=list().map(p=>p.id),from=o.indexOf(dragId),to=o.indexOf(over.dataset.id);o.splice(from,1);o.splice(to,0,dragId);
      custom=o;store.set(custom);render();announce(`Moved to position ${to+1}`);track('projects:reorder')}});
  grid.addEventListener('dragend',()=>{dragId=null;$$('.project').forEach(x=>x.classList.remove('dragging','drop-target'))});
  /* 3D tilt toward the cursor */
  function tilt(){if(!matchMedia('(pointer:fine)').matches)return;$$('.project:not(.arranging),.skill-card').forEach(c=>{if(c._t)return;c._t=1;
    c.addEventListener('pointermove',e=>{if(document.documentElement.classList.contains('rm'))return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      c.style.transform=`perspective(900px) translateY(-10px) rotateX(${(-y*9).toFixed(2)}deg) rotateY(${(x*11).toFixed(2)}deg)`});
    c.addEventListener('pointerleave',()=>{c.style.transform=''})})}
  render(false);
  window.__renderProjects=render;
})();
