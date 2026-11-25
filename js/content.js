/* ===== Edit your content here ===== */
const EMAIL='az8435809@gmail.com';
const ICONS={
  html:'<path d="M4 3l1.6 17L12 22l6.4-2L20 3z"/><path d="M8.5 8h7l-.5 6-3 1-3-1-.2-2"/>',
  js:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M11 9v6.5a2 2 0 0 1-3.5 1.3M17 10.2a2 2 0 0 0-3 .3c-.6 1.6 3.5 1.6 3 3.6a2 2 0 0 1-3.4.6"/>',
  react:'<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  next:'<circle cx="12" cy="12" r="9.5"/><path d="M9 16V8l7.5 10M15 8v5"/>',
  ui:'<path d="M12 3l2.6 5.6L20 9.5l-4 4 1 5.5-5-2.8L7 19l1-5.5-4-4 5.4-.9z"/>',
  tw:'<path d="M3 11c1.5-4 4-5.5 7.5-4.5 2 .6 2.6 2.4 4.5 2.6 1.9.2 3.4-.8 4.5-3.1-1.5 4-4 5.5-7.5 4.5-2-.6-2.6-2.4-4.5-2.6C5.6 7.7 4.1 8.7 3 11zM3 18c1.5-4 4-5.5 7.5-4.5 2 .6 2.6 2.4 4.5 2.6 1.9.2 3.4-.8 4.5-3.1-1.5 4-4 5.5-7.5 4.5-2-.6-2.6-2.4-4.5-2.6-1.9-.2-3.4.8-4.5 3.1z"/>'
};
const SKILLS=[
  {name:'HTML / CSS',v:95,icon:'html',note:'Semantic, accessible markup and modern responsive layouts.'},
  {name:'JavaScript',v:90,icon:'js',note:'Interactive UI, animation and clean modern ES code.'},
  {name:'React',v:88,icon:'react',note:'Reusable components, hooks and fast single-page apps.'},
  {name:'Next.js',v:85,icon:'next',note:'SEO-ready, server-rendered sites and full apps.'},
  {name:'UI/UX Design',v:92,icon:'ui',note:'Wireframes to polished interfaces in Figma.'},
  {name:'Tailwind CSS',v:93,icon:'tw',note:'Consistent design systems, built quickly.'}
];
/* Projects: add `img:'assets/projects/name.webp'` for a real screenshot, and `demo` / `github` URLs when you have them.
   Without a URL the button opens the case study with an email link instead. */
const PROJECTS=[
  {cat:'Game Development',id:'game-32',type:'game',title:'Karachi Cyberpunk: Neon Rickshaw',desc:'A stylized 3D action-runner set in a futuristic Saddar and Clifton, with custom Niagara VFX.',tags:['Unreal Engine 5','Blender','Substance'],art:'road',
   details:'Built modular Karachi street props in Blender, baked 4K PBR textures in Substance Painter, and scripted vehicle physics and neon lighting in Unreal Engine 5.',demo:'',github:''},
  {cat:'3D Character',id:'3d-25',type:'3d',title:'Rigged Stylized 3D Avatar',desc:'A game-ready character with a full-body armature, facial blendshapes and real-time WebGL shaders.',tags:['Blender','IK/FK Rig','GLB'],art:'avatar',
   details:'Sculpted a high-poly mesh, retopologized to clean quad topology (about 18k tris) and exported rigged GLB animations for Three.js and Unity.',demo:'',github:''},
  {cat:'Motion Design',id:'motion-24',type:'motion',title:'60s Kinetic VFX Showreel',desc:'A promotional reel combining 3D camera tracking, kinetic typography and sound design.',tags:['After Effects','Premiere Pro','3D Passes'],art:'reel',
   details:'Composited Blender multi-pass EXR renders in After Effects with speed-ramped graph-editor curves and licensed audio.',demo:'',github:''},
  {cat:'Web Experience',id:'web-24',type:'web',title:'Interactive 3D Portfolio',desc:'A scroll-choreographed 3D portfolio with a physics tech-stack and a grounded AI assistant.',tags:['Three.js','Node.js','RAG'],art:'cube',
   details:'Combines Three.js real-time lighting, TF-IDF cosine-similarity retrieval with source citations, and an email contact flow.',demo:'',github:''},
  {cat:'VR Experience',id:'vr-22',type:'vr',title:'Mohatta Palace VR Tour',desc:'1st Runner-Up VR heritage walkthrough built for the Karachi Tech & Digital Arts Fest.',tags:['Unity XR','Blender','C#'],art:'palace',
   details:'Recreated the domes and courtyard lighting of Karachi’s Mohatta Palace in Blender and Unity XR, with spatial audio.',demo:'',github:''},
  {cat:'AI Engineering',id:'ai-29',type:'ai',title:'AI NPC Lore & Dialogue Engine',desc:'A context-aware NPC dialogue system grounded in verified world-lore documents.',tags:['Embeddings','RAG','Unity C#'],art:'chat',
   details:'Retrieves relevant quest-lore chunks by vector similarity so NPCs answer from the game’s real lore instead of making things up.',demo:'',github:''}
];
/* Testimonials: replace these placeholders with real quotes from people you have worked with. */
const TESTIMONIALS=[
  {quote:'Your first client’s words go here. Ask a happy client for two or three sentences about working with you.',name:'Client Name',role:'Founder, Company'},
  {quote:'A second real quote fits here. Specific details, like speed, communication or results, make it convincing.',name:'Client Name',role:'Product Manager, Company'},
  {quote:'A third real quote goes here. One or two sentences about the result you delivered work best.',name:'Client Name',role:'Marketing Lead, Company'}
];

/* ----- procedural cover art (forest + gold line art) ----- */
function cover(kind,i){
  const id='cv'+i, g=`<defs><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3326"/><stop offset="1" stop-color="#0c1610"/></linearGradient>
  <radialGradient id="${id}s" cx=".7" cy=".35" r=".6"><stop offset="0" stop-color="#E8B923" stop-opacity=".55"/><stop offset="1" stop-color="#E8B923" stop-opacity="0"/></radialGradient>
  <pattern id="${id}g" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#F5F0E6" stroke-opacity=".05"/></pattern></defs>
  <rect width="440" height="300" fill="url(#${id}b)"/><rect width="440" height="300" fill="url(#${id}g)"/><rect width="440" height="300" fill="url(#${id}s)"/>`;
  const L='fill="none" stroke="#E8B923" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const art={
    road:`<circle cx="300" cy="120" r="54" fill="#E8B923" opacity=".9"/><path d="M246 120h108M252 102h96M262 86h76M252 138h96" stroke="#0c1610" stroke-width="5"/>
      <path d="M0 190h440" ${L}/>${[...Array(9)].map((_,k)=>`<path d="M220 190 L${-180+k*100} 300" ${L} opacity=".55"/>`).join('')}
      ${[0,1,2,3].map(k=>`<path d="M0 ${205+k*k*9}h440" ${L} opacity="${.25+k*.12}"/>`).join('')}
      <path d="M30 190v-60h28v-24h20v84M330 190v-44h24v-30h22v74M386 190v-90h30v90M92 190v-40h26v40" fill="#0c1610" stroke="#E8B923" stroke-width="1.2" opacity=".9"/>
      <g transform="translate(176 214)"><rect x="0" y="10" width="88" height="34" rx="10" fill="#E8B923"/><path d="M14 10 Q44 -18 78 10" fill="#E8B923"/><circle cx="20" cy="46" r="10" fill="#0c1610" stroke="#E8B923" stroke-width="3"/><circle cx="70" cy="46" r="10" fill="#0c1610" stroke="#E8B923" stroke-width="3"/></g>`,
    avatar:`${[...Array(7)].map((_,k)=>`<ellipse cx="220" cy="150" rx="${100-k*4}" ry="${100}" transform="rotate(${k*26} 220 150)" ${L} opacity=".35"/>`).join('')}
      <circle cx="220" cy="118" r="40" fill="#E8B923"/><path d="M152 240c8-50 36-72 68-72s60 22 68 72" fill="#E8B923"/>
      <path d="M196 116h10M234 116h10M208 136q12 8 24 0" stroke="#0c1610" stroke-width="4" stroke-linecap="round"/>
      ${[[120,70],[330,90],[110,220],[338,226]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5" fill="#E8B923"/><path d="M${x} ${y}L220 150" ${L} opacity=".3" stroke-dasharray="4 6"/>`).join('')}`,
    reel:`${[0,1,2].map(k=>`<rect x="${34+k*130}" y="80" width="112" height="78" rx="6" ${L} opacity="${.5+k*.25}"/>`).join('')}<path d="M164 102l30 17-30 17z" fill="#E8B923"/>
      <path d="M20 66h400M20 172h400" ${L} opacity=".5"/>${[...Array(20)].map((_,k)=>`<rect x="${24+k*20}" y="58" width="9" height="6" rx="1.5" fill="#E8B923" opacity=".45"/><rect x="${24+k*20}" y="176" width="9" height="6" rx="1.5" fill="#E8B923" opacity=".45"/>`).join('')}
      <path d="M20 240 ${[...Array(40)].map((_,k)=>`L${20+k*10} ${240-Math.abs(Math.sin(k*1.7)*Math.cos(k*.4))*36}`).join(' ')}" ${L}/>`,
    cube:`<g transform="translate(220 150)"><path d="M0-86L74-44V42L0 84-74 42V-44Z" fill="#E8B923" fill-opacity=".1" ${L}/><path d="M0-86L74-44 0-2-74-44ZM0-2V84" ${L}/><path d="M0-86L74-44 0-2-74-44Z" fill="#E8B923" opacity=".85"/></g>
      ${[[60,70],[380,60],[70,236],[372,232],[220,30]].map(([x,y],k)=>`<circle cx="${x}" cy="${y}" r="${6+k%2*4}" fill="${k%2?'none':'#E8B923'}" stroke="#E8B923" stroke-width="1.6"/><path d="M${x} ${y}L220 150" ${L} opacity=".22"/>`).join('')}`,
    palace:`<circle cx="220" cy="120" r="80" fill="#E8B923" opacity=".12"/><path d="M110 236V150h220v86M150 150v-30h140v30M180 120q40-74 80 0" ${L}/>
      <path d="M180 120q40-74 80 0z" fill="#E8B923" opacity=".85"/><path d="M220 58v-18M214 44h12" ${L}/>
      ${[0,1,2,3,4].map(k=>`<path d="M${126+k*42} 236v-44q13-18 26 0v44" ${L}/>`).join('')}<path d="M70 236h300" ${L}/>
      <path d="M118 150q-14-40 0-54q14 14 0 54M322 150q-14-40 0-54q14 14 0 54" fill="#E8B923" opacity=".7"/>
      <rect x="150" y="248" width="140" height="30" rx="15" ${L} opacity=".6"/><circle cx="185" cy="263" r="7" ${L}/><circle cx="255" cy="263" r="7" ${L}/>`,
    chat:`<rect x="60" y="62" width="190" height="74" rx="20" fill="#E8B923"/><path d="M90 136l-8 26 30-26" fill="#E8B923"/>
      <path d="M86 92h120M86 110h80" stroke="#0c1610" stroke-width="6" stroke-linecap="round"/>
      <rect x="190" y="160" width="190" height="74" rx="20" ${L}/><path d="M350 234l8 24-30-24" ${L}/>
      <path d="M216 190h130M216 208h90" ${L} opacity=".7"/>${[[70,220],[110,250],[150,214]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="#E8B923" opacity=".8"/>`).join('')}<path d="M70 220L110 250 150 214 70 220" ${L} opacity=".4"/>`
  }[kind]||'';
  return `<svg viewBox="0 0 440 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${g}${art}</svg>`;
}
const arrow='<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const ext='<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
const gh='<svg viewBox="0 0 24 24"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>';

(function render(){
  const sg=document.getElementById('skillsGrid');
  sg.innerHTML=SKILLS.map(s=>`<article class="card skill-card" style="--v:${s.v}%">
    <div class="skill-top"><span class="icon-gold"><svg viewBox="0 0 24 24">${ICONS[s.icon]}</svg></span><span class="skill-pct"><span data-count="${s.v}">0</span><small>%</small></span></div>
    <h3>${s.name}</h3><p>${s.note}</p><div class="bar" role="progressbar" aria-label="${s.name}" aria-valuenow="${s.v}" aria-valuemin="0" aria-valuemax="100"><span></span></div></article>`).join('');
  const star='<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.8z"/></svg>';
  document.getElementById('testiGrid').innerHTML=TESTIMONIALS.map(t=>`<figure class="card testi"><span class="qmark" aria-hidden="true">&ldquo;</span>
    <div class="stars" aria-label="5 out of 5 stars">${star.repeat(5)}</div><blockquote>${t.quote}</blockquote>
    <figcaption><span class="avatar">${t.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</span><span><strong>${t.name}</strong><small>${t.role}</small></span></figcaption></figure>`).join('');
  window.__PROJECTS=PROJECTS;window.__COVER=cover;window.__EMAIL=EMAIL;window.__ICONS={arrow,ext,gh};
})();
