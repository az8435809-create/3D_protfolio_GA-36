/* Low-poly floating rock in plain WebGL (no libraries). Usage: <canvas data-rock="hero|small"> */
(function(){
  // --- tiny math ---
  const M={
    mul(a,b){const o=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];o[i*4+j]=s}return o},
    persp(f,asp,n,fa){const t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(fa+n)/(n-fa);o[11]=-1;o[14]=2*fa*n/(n-fa);return o},
    tr(x,y,z){const o=M.id();o[12]=x;o[13]=y;o[14]=z;return o},
    sc(x,y,z){const o=M.id();o[0]=x;o[5]=y;o[10]=z;return o},
    ry(a){const o=M.id(),c=Math.cos(a),s=Math.sin(a);o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o},
    rx(a){const o=M.id(),c=Math.cos(a),s=Math.sin(a);o[5]=c;o[6]=s;o[9]=-s;o[10]=c;return o},
    rz(a){const o=M.id(),c=Math.cos(a),s=Math.sin(a);o[0]=c;o[1]=s;o[4]=-s;o[5]=c;return o},
    id(){const o=new Float32Array(16);o[0]=o[5]=o[10]=o[15]=1;return o}
  };
  // --- value noise ---
  function hash(x,y,z,s){let h=Math.sin(x*127.1+y*311.7+z*74.7+s*19.19)*43758.5453;return h-Math.floor(h)}
  function noise(x,y,z,s){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
    const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);let r=0;
    for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){r+=hash(ix+a,iy+b,iz+c,s)*(a?u:1-u)*(b?v:1-v)*(c?w:1-w)}return r*2-1}
  // --- geometry: icosphere -> rock ---
  function rockGeo(seed,detail,flatTop){
    const t=(1+Math.sqrt(5))/2;let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
    let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    const nrm=v=>{const l=Math.hypot(...v);return v.map(c=>c/l)};V=V.map(nrm);
    for(let d=0;d<detail;d++){const cache={},nf=[];const mid=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(cache[k]!==undefined)return cache[k];V.push(nrm([(V[a][0]+V[b][0])/2,(V[a][1]+V[b][1])/2,(V[a][2]+V[b][2])/2]));return cache[k]=V.length-1};
      F.forEach(([a,b,c])=>{const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);nf.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])});F=nf}
    const P=V.map(([x,y,z])=>{
      let r=1+.2*noise(x*1.8,y*1.8,z*1.8,seed)+.09*noise(x*4.2,y*4.2,z*4.2,seed+3)+.035*noise(x*9,y*9,z*9,seed+7);
      let px=x*r,py=y*r,pz=z*r;
      if(flatTop&&py>.3)py=.3+(py-.3)*.12+.025*noise(x*6,0,z*6,seed+9);
      if(py<0){const k=Math.max(.16,1+py*.62);px*=k;pz*=k;py*=1.75}
      return[px*1.5,py,pz*1.12]});
    const pos=[],nor=[],col=[];
    F.forEach(([a,b,c])=>{const A=P[a],B=P[b],C=P[c];
      const u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],v=[C[0]-A[0],C[1]-A[1],C[2]-A[2]];
      let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;n=n.map(q=>q/l);
      const cy=(A[1]+B[1]+C[1])/3,cx=(A[0]+B[0]+C[0])/3,cz=(A[2]+B[2]+C[2])/3;
      const j=hash(cx*13,cy*7,cz*11,seed)*.12;
      let c0=[.27+j,.28+j,.25+j*.8];                      // stone
      if(cy<-.3)c0=[.16+j,.19+j,.16+j];                   // darker underside
      if(n[1]>.62&&cy>.15)c0=[.13+j*.4,.21+j*.6,.12];       // moss on top
      if(n[1]>.62&&cy>.15&&hash(cx*5,cz*5,1,seed)>.95)c0=[.42,.34,.13]; // golden lichen
      for(const p of[A,B,C]){pos.push(...p);nor.push(...n);col.push(...c0)}});
    return{pos:new Float32Array(pos),nor:new Float32Array(nor),col:new Float32Array(col),count:pos.length/3}
  }
  const VS=`attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 mvp;uniform mat4 m;varying vec3 vn;varying vec3 vc;varying float vy;varying vec3 vw;
  void main(){vn=normalize((m*vec4(n,0.)).xyz);vc=c;vy=p.y;vw=(m*vec4(p,1.)).xyz;gl_Position=mvp*vec4(p,1.);}`;
  const FS=`precision mediump float;varying vec3 vn;varying vec3 vc;varying float vy;varying vec3 vw;uniform float fade;uniform vec3 eye;uniform vec3 tint;uniform float gold;
  void main(){vec3 N=normalize(vn);vec3 key=normalize(vec3(-.55,.75,.55));vec3 fill=normalize(vec3(.8,.1,.3));vec3 V=normalize(eye-vw);
    float d=max(dot(N,key),0.);float f=max(dot(N,fill),0.);float rim=pow(1.-max(dot(N,V),0.),2.6);
    vec3 bc=mix(vc,vec3(.62,.48,.16)+vc*.15,gold);vec3 col=bc*tint*(.30+d*vec3(1.1,.9,.55)+f*vec3(.22,.30,.24))+rim*vec3(.95,.72,.25)*.55;
    float a=smoothstep(-1.75,-.55,vy)*fade;
    vec3 fog=vec3(.07,.12,.09);col=mix(fog,col,clamp(.35+ (vy+1.8)*.45,0.,1.));
    gl_FragColor=vec4(col*a,a);}`;
  function init(canvas){
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
    if(!gl){document.documentElement.classList.add('no-webgl');return}
    const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
    const hero=canvas.dataset.rock==='hero',field=canvas.dataset.rock==='field';
    const mk=(g)=>{const b=k=>{const o=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,o);gl.bufferData(gl.ARRAY_BUFFER,g[k],gl.STATIC_DRAW);return o};return{p:b('pos'),n:b('nor'),c:b('col'),count:g.count}};
    const seed=hero?4.2:(Math.random()*20);
    const main=mk(rockGeo(seed,3,true));
    const shard=mk(rockGeo(seed+11,1,false));const crystal=field?mk(rockGeo(seed+5,0,false)):null;
    const loc={p:gl.getAttribLocation(pr,'p'),n:gl.getAttribLocation(pr,'n'),c:gl.getAttribLocation(pr,'c'),mvp:gl.getUniformLocation(pr,'mvp'),m:gl.getUniformLocation(pr,'m'),fade:gl.getUniformLocation(pr,'fade'),eye:gl.getUniformLocation(pr,'eye'),tint:gl.getUniformLocation(pr,'tint'),gold:gl.getUniformLocation(pr,'gold')};
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    const shards=hero?[[-2.15,.1,.4,.24,0],[2.2,-.3,.2,.19,1.7],[-1.6,-1.0,.8,.14,3.1],[1.85,.9,-.6,.11,4.4]]:[[1.75,.15,.2,.15,1]];
    let w=0,h=0,vis=true,mx=0,my=0,tx=0,ty=0,px=-99,py=-99;
    const R=(a,b)=>a+Math.random()*(b-a);
    const crystals=field?[...Array(11)].map((_,i)=>{const side=i%2?1:-1;return{bx:side*R(.62,1),by:R(-.95,.95),z:R(-1.4,.2),s:R(.035,.085),ox:0,oy:0,vx:0,vy:0,ph:R(0,6.28),sp:R(.2,.6)}}):[];
    function resize(){const dpr=Math.min(window.devicePixelRatio||1,2);w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=Math.max(1,w*dpr);canvas.height=Math.max(1,h*dpr);gl.viewport(0,0,canvas.width,canvas.height)}
    resize();addEventListener('resize',resize);
    new IntersectionObserver(e=>{vis=e[0].isIntersecting;if(vis)requestAnimationFrame(loop)}).observe(canvas);
    addEventListener('pointermove',e=>{tx=(e.clientX/innerWidth-.5)*2;ty=(e.clientY/innerHeight-.5)*2;if(field){const r=canvas.getBoundingClientRect();px=((e.clientX-r.left)/r.width)*2-1;py=1-((e.clientY-r.top)/r.height)*2}},{passive:true});
    const draw=(g,model,vp,fade)=>{const bind=(b,l)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,3,gl.FLOAT,false,0,0)};
      bind(g.p,loc.p);bind(g.n,loc.n);bind(g.c,loc.c);gl.uniformMatrix4fv(loc.m,false,model);gl.uniformMatrix4fv(loc.mvp,false,M.mul(vp,model));gl.uniform1f(loc.fade,fade);gl.drawArrays(gl.TRIANGLES,0,g.count)};
    const reduce=()=>document.documentElement.classList.contains('rm')||matchMedia('(prefers-reduced-motion: reduce)').matches;let frozen=0;
    function loop(now){
      if(!vis)return;
      const t=window.__VIDEO_T!==undefined?window.__VIDEO_T:(reduce()?frozen:(frozen=now/1000));mx+=(tx-mx)*.04;my+=(ty-my)*.04;
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const asp=w/h;const camZ=hero?5.2:4.6;
      const view=field?M.tr(0,0,-camZ):M.mul(M.tr(0,hero?-.05:.05,-camZ),M.rx(.42+my*.05));
      const vp=M.mul(M.persp(.62,asp,.1,50),view);
      gl.uniform3f(loc.eye,0,1.9,camZ);
      const bob=0; // the whole stage floats in CSS so the character stays planted
      const yaw=Math.sin(t*.18)*.35+mx*.35+(hero?.4:1.2);
      const base=M.mul(M.tr(0,.55+bob,0),M.mul(M.ry(yaw),M.sc(1.15,1.15,1.15)));
      gl.uniform3f(loc.tint,1,1,1);gl.uniform1f(loc.gold,field?1:0);
      if(field){drawField(vp,asp,camZ,t);if(!reduce())requestAnimationFrame(loop);return}
      draw(main,base,vp,1);
      shards.forEach(([x,y,z,s,ph])=>{const m=M.mul(M.tr(x+Math.sin(t*.4+ph)*.06,y+Math.sin(t*.9+ph)*.14,z),M.mul(M.ry(t*.3+ph),M.mul(M.rx(t*.2+ph),M.sc(s,s,s))));draw(shard,m,vp,.95)});
      if(!reduce())requestAnimationFrame(loop)}
    requestAnimationFrame(loop);
    document.addEventListener('az:reducemotion',e=>{if(!e.detail&&vis)requestAnimationFrame(loop)});
    function drawField(vp,asp,camZ,t){const hh=Math.tan(.31)*camZ,hw=hh*asp;gl.uniform3f(loc.tint,1,1,1);
      crystals.forEach(c=>{const x=c.bx*hw*.95+c.ox,y=c.by*hh*.9+c.oy;const pxw=px*hw,pyw=py*hh;const dx=x-pxw,dy=y-pyw,d=Math.hypot(dx,dy);
        if(d<1.1&&!reduce()){const f=(1.1-d)*.012;c.vx+=dx/(d||1)*f;c.vy+=dy/(d||1)*f}c.vx+=-c.ox*.02;c.vy+=-c.oy*.02;c.vx*=.9;c.vy*=.9;c.ox+=c.vx;c.oy+=c.vy;
        const look=Math.atan2(pyw-y,pxw-x);
        const m=M.mul(M.tr(x,y+Math.sin(t*c.sp+c.ph)*.08,c.z),M.mul(M.ry(t*c.sp+c.ph+look*.4),M.mul(M.rx(t*.3+c.ph+(py*.5)),M.mul(M.rz(look*.3),M.sc(c.s,c.s*1.5,c.s)))));
        draw(crystal,m,vp,1)})}
  }
  document.querySelectorAll('canvas[data-rock]').forEach(init);
})();
