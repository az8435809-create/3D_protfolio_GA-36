/* AliAvatar — a tiny glTF 2.0 (GLB) player in plain WebGL.
   Supports: node hierarchy, skins (skinning in the vertex shader), morph targets (CPU), PBR-ish materials,
   baseColor textures, animation clips with cross-fading, cursor look-at and drag-to-rotate.
   Usage: AliAvatar.create(canvas,{src:'assets/ali-avatar.glb'}).then(ctrl=>ctrl.play('Wave')) */
(function(){
  const V3=(x=0,y=0,z=0)=>[x,y,z];
  const m4={
    id(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]},
    mul(a,b){const o=new Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];o[i*4+j]=s}return o},
    trs(t,q,s){const[x,y,z,w]=q,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
      return[(1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,(xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,(xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0,t[0],t[1],t[2],1]},
    persp(f,a,n,fa){const t=1/Math.tan(f/2);return[t/a,0,0,0,0,t,0,0,0,0,(fa+n)/(n-fa),-1,0,0,2*fa*n/(n-fa),0]},
    lookAt(e,c,u){let z=[e[0]-c[0],e[1]-c[1],e[2]-c[2]];let l=Math.hypot(...z);z=z.map(v=>v/l);let x=[u[1]*z[2]-u[2]*z[1],u[2]*z[0]-u[0]*z[2],u[0]*z[1]-u[1]*z[0]];l=Math.hypot(...x);x=x.map(v=>v/l);
      const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]),-(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]),-(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]),1]},
    rotY(a){const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]}
  };
  const q={
    mul(a,b){return[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]},
    slerp(a,b,t){let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=b.map(v=>-v);d=-d}
      let o=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t];const l=Math.hypot(...o);return o.map(v=>v/l)},
    euler(yaw,pitch,roll=0){const cy=Math.cos(yaw/2),sy=Math.sin(yaw/2),cp=Math.cos(pitch/2),sp=Math.sin(pitch/2),cr=Math.cos(roll/2),sr=Math.sin(roll/2);
      return q.mul(q.mul([0,sy,0,cy],[sp,0,0,cp]),[0,0,sr,cr])}
  };
  const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);

  /* ---------- GLB parsing ---------- */
  function b64ToBuf(b64){const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer}
  const cache={};
  async function loadGLB(src){
    if(cache[src])return cache[src];
    return cache[src]=(async()=>{
      let buf;
      if(window.AVATAR_GLB_B64)buf=b64ToBuf(window.AVATAR_GLB_B64);
      else buf=await (await fetch(src)).arrayBuffer();
      const dv=new DataView(buf);if(dv.getUint32(0,true)!==0x46546C67)throw new Error('not a GLB');
      const jl=dv.getUint32(12,true);const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,jl)));
      const binOff=20+jl+8;
      const T={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
      const N={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
      const acc=i=>{const a=json.accessors[i],v=json.bufferViews[a.bufferView];return new T[a.componentType](buf,binOff+(v.byteOffset||0)+(a.byteOffset||0),a.count*N[a.type])};
      const images=await Promise.all((json.images||[]).map(async im=>{const v=json.bufferViews[im.bufferView];
        const blob=new Blob([new Uint8Array(buf,binOff+(v.byteOffset||0),v.byteLength)],{type:im.mimeType});
        if(window.createImageBitmap)return createImageBitmap(blob);
        return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=URL.createObjectURL(blob)})}));
      return{json,acc,images}
    })()
  }

  /* ---------- shaders ---------- */
  const VS=`precision highp float;
  attribute vec3 aP;attribute vec3 aN;attribute vec2 aUV;attribute vec4 aJ;attribute vec4 aW;
  uniform mat4 uJ[24];uniform mat4 uModel;uniform mat4 uVP;varying vec3 vN;varying vec3 vW;varying vec2 vUV;
  void main(){mat4 sk=aW.x*uJ[int(aJ.x)]+aW.y*uJ[int(aJ.y)]+aW.z*uJ[int(aJ.z)]+aW.w*uJ[int(aJ.w)];
    vec4 w=uModel*sk*vec4(aP,1.);vW=w.xyz;vN=normalize((uModel*sk*vec4(aN,0.)).xyz);vUV=aUV;gl_Position=uVP*w;}`;
  const FS=`precision highp float;varying vec3 vN;varying vec3 vW;varying vec2 vUV;
  uniform vec4 uBase;uniform float uMetal;uniform float uRough;uniform sampler2D uTex;uniform float uHasTex;uniform vec3 uEye;uniform float uLight;
  vec3 toLin(vec3 c){return pow(c,vec3(2.2));}
  void main(){vec3 base=uBase.rgb;if(uHasTex>.5)base*=toLin(texture2D(uTex,vUV).rgb);
    vec3 N=normalize(vN);vec3 V=normalize(uEye-vW);
    vec3 L1=normalize(vec3(-.55,.8,.75));vec3 L2=normalize(vec3(.9,.25,.35));vec3 L3=normalize(vec3(.2,.4,-1.));
    float d1=max(dot(N,L1),0.);float wrap=max((dot(N,L1)+.35)/1.35,0.);float d2=max(dot(N,L2),0.);
    vec3 H=normalize(L1+V);float sh=mix(8.,90.,1.-uRough);float spec=pow(max(dot(N,H),0.),sh)*(1.-uRough)*(.55+uMetal*2.);
    float rim=pow(1.-max(dot(N,V),0.),3.);float back=max(dot(N,L3),0.);
    vec3 sky=mix(vec3(.18,.2,.17),vec3(.42,.40,.34),uLight),gnd=vec3(.05,.08,.06);
    vec3 amb=mix(gnd,sky,N.y*.5+.5);
    vec3 kd=base*(1.-uMetal*.85);
    vec3 col=kd*(amb+wrap*vec3(1.25,1.08,.86)*.85+d2*vec3(.26,.33,.28))+mix(vec3(1.),base,uMetal)*spec*vec3(1.,.92,.75)+(rim*.3+back*.25)*vec3(1.,.74,.22)*.5;
    col=col/(col+vec3(.85))*1.6;gl_FragColor=vec4(pow(col,vec3(1./2.2)),1.);}`;

  /* ---------- controller ---------- */
  async function create(canvas,opts={}){
    const src=opts.src||'assets/ali-avatar.glb';
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:!!opts.preserve});
    if(!gl)throw new Error('WebGL unavailable');
    const {json,acc,images}=await loadGLB(src);
    const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
    const L=n=>gl.getUniformLocation(pr,n),A=n=>gl.getAttribLocation(pr,n);
    const loc={aP:A('aP'),aN:A('aN'),aUV:A('aUV'),aJ:A('aJ'),aW:A('aW'),uJ:L('uJ'),uModel:L('uModel'),uVP:L('uVP'),uBase:L('uBase'),uMetal:L('uMetal'),uRough:L('uRough'),uTex:L('uTex'),uHasTex:L('uHasTex'),uEye:L('uEye'),uLight:L('uLight')};
    const texs=images.map(img=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);return t});
    const vbo=(data,target=gl.ARRAY_BUFFER,usage=gl.STATIC_DRAW)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,usage);return b};
    const CT={5121:gl.UNSIGNED_BYTE,5123:gl.UNSIGNED_SHORT,5126:gl.FLOAT};
    // nodes
    const nodes=json.nodes.map(n=>({...n,t:n.translation||V3(),r:n.rotation||[0,0,0,1],s:n.scale||[1,1,1],rest:{t:n.translation||V3(),r:n.rotation||[0,0,0,1],s:n.scale||[1,1,1]},w:m4.id()}));
    const parent=[];nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parent[c]=i));
    const order=[];const visit=i=>{order.push(i);(nodes[i].children||[]).forEach(visit)};json.scenes[json.scene||0].nodes.forEach(visit);
    const skin=json.skins[0];const ibm=acc(skin.inverseBindMatrices);const jointBuf=new Float32Array(24*16);
    // meshes
    const draws=[];let faceNode=null;
    nodes.forEach((n,ni)=>{if(n.mesh===undefined)return;const mesh=json.meshes[n.mesh];if(mesh.weights)faceNode=n;n.weights=(mesh.weights||[]).slice();
      mesh.primitives.forEach(p=>{const a=p.attributes,ga=k=>json.accessors[a[k]];
        const pos=acc(a.POSITION);const d={node:n,count:json.accessors[p.indices].count,idxType:CT[json.accessors[p.indices].componentType],mat:json.materials[p.material],
          ib:vbo(acc(p.indices),gl.ELEMENT_ARRAY_BUFFER),pos:vbo(new Float32Array(pos),gl.ARRAY_BUFFER,p.targets?gl.DYNAMIC_DRAW:gl.STATIC_DRAW),nor:vbo(acc(a.NORMAL)),uv:vbo(acc(a.TEXCOORD_0)),
          j:vbo(acc(a.JOINTS_0)),jt:CT[ga('JOINTS_0').componentType],w:vbo(acc(a.WEIGHTS_0)),wt:CT[ga('WEIGHTS_0').componentType],wn:!!ga('WEIGHTS_0').normalized};
        if(p.targets){d.basePos=new Float32Array(pos);d.targets=p.targets.map(t=>acc(t.POSITION));d.cur=new Float32Array(pos);d.lastW=''}
        draws.push(d)})});
    // animations
    const clips={};(json.animations||[]).forEach(an=>{let dur=0;const ch=an.channels.map(c=>{const s=an.samplers[c.sampler];const t=acc(s.input),o=acc(s.output);dur=Math.max(dur,t[t.length-1]);
      return{node:c.target.node,path:c.target.path,t,o,stride:c.target.path==='weights'?o.length/t.length:(c.target.path==='rotation'?4:3)}});clips[an.name]={name:an.name,ch,dur}});
    function sample(c,time,out){const t=c.t,n=t.length;let i=0;if(time<=t[0])i=0;else if(time>=t[n-1])i=n-2;else{let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(t[m]<=time)lo=m;else hi=m}i=lo}
      const k=n>1?Math.min(1,Math.max(0,(time-t[i])/(t[i+1]-t[i]||1))):0,s=c.stride,a=[...c.o.slice(i*s,i*s+s)],b=n>1?[...c.o.slice((i+1)*s,(i+1)*s+s)]:a;
      return c.path==='rotation'?q.slerp(a,b,k):lerp(a,b,k)}
    function poseOf(clip,time){const P={};clip.ch.forEach(c=>{(P[c.node]=P[c.node]||{})[c.path]=sample(c,time)});return P}

    /* ---- state ---- */
    const st={base:clips.Idle,bt:0,gesture:null,gt:0,gw:0,expr:{},exprCur:[0,0,0,0],yaw:opts.yaw||0,yawV:0,auto:opts.auto??true,look:[0,0],lookCur:[0,0],drag:false,lastX:0,light:0};
    const ctrl={clips:Object.keys(clips),
      play(name){if(!clips[name])return;if(name==='Idle'){st.gesture=null;return}st.gesture=clips[name];st.gt=0},
      setExpression(name){const map={Neutral:{},Smile:{2:1},Surprised:{3:1},Wink:{0:1,2:.6},Blink:{0:1,1:1}};st.expr=map[name]||{}},
      setAuto(v){st.auto=v},reset(){st.yaw=0;st.yawV=0},nudge(d){st.yawV+=d},
      setLook(x,y){st.look=[x,y]},setLight(v){st.light=v},
      get yaw(){return st.yaw},set yaw(v){st.yaw=v},
      renderAt,start,stop,canvas};
    // interaction
    if(opts.interactive!==false){
      canvas.addEventListener('pointerdown',e=>{st.drag=true;st.lastX=e.clientX;canvas.setPointerCapture(e.pointerId);canvas.classList.add('grabbing')});
      canvas.addEventListener('pointermove',e=>{if(!st.drag)return;const dx=e.clientX-st.lastX;st.lastX=e.clientX;st.yaw+=dx*.012;st.yawV=dx*.012});
      const up=()=>{st.drag=false;canvas.classList.remove('grabbing')};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
      addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();st.look=[Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width*.8))),Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height*.3))/(r.height*.8)))]},{passive:true});
    }
    function resize(){const d=Math.min(devicePixelRatio||1,2);const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d)}gl.viewport(0,0,canvas.width,canvas.height)}
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
    let last=null;
    function step(dt){
      st.bt=(st.bt+dt)%st.base.dur;
      let P=poseOf(st.base,st.bt);
      if(st.gesture){st.gt+=dt;const D=st.gesture.dur;st.gw=Math.min(1,Math.min(st.gt/.2,(D-st.gt)/.25));if(st.gt>=D){st.gesture=null;st.gw=0}
        else{const G=poseOf(st.gesture,st.gt),w=Math.max(0,st.gw);for(const k in G){const a=P[k]||{},g=G[k];P[k]=P[k]||{};
          if(g.rotation)P[k].rotation=q.slerp(a.rotation||nodes[k].rest.r,g.rotation,w);if(g.translation)P[k].translation=lerp(a.translation||nodes[k].rest.t,g.translation,w);
          if(g.weights)P[k].weights=lerp(a.weights||[0,0,0,0],g.weights,w)}}}
      nodes.forEach((n,i)=>{const p=P[i]||{};n.t=p.translation||n.rest.t;n.r=p.rotation||n.rest.r;n.s=p.scale||n.rest.s;if(p.weights)n.weights=p.weights});
      // look-at on head/neck (additive)
      const k=1-Math.pow(.001,dt);st.lookCur=lerp(st.lookCur,st.drag?[0,0]:st.look,k*.8);
      const head=nodes.findIndex(n=>n.name==='head'),neck=nodes.findIndex(n=>n.name==='neck');
      const yawRel=Math.atan2(Math.sin(st.yaw),Math.cos(st.yaw));
      const lx=st.lookCur[0]*.55-yawRel*.5,ly=st.lookCur[1]*.28;
      if(head>=0)nodes[head].r=q.mul(nodes[head].r,q.euler(lx*.65,ly*.65));if(neck>=0)nodes[neck].r=q.mul(nodes[neck].r,q.euler(lx*.35,ly*.35));
      // expressions
      if(faceNode){const tgt=[0,1,2,3].map(i=>st.expr[i]||0);st.exprCur=lerp(st.exprCur,tgt,k*.9);faceNode.weights=faceNode.weights.map((w,i)=>Math.min(1,Math.max(w,st.exprCur[i])))}
      // yaw
      if(!st.drag){st.yaw+=st.yawV;st.yawV*=Math.pow(.02,dt);if(st.auto&&Math.abs(st.yawV)<.002)st.yaw+=dt*.35}
    }
    function draw(){
      resize();
      order.forEach(i=>{const n=nodes[i];const l=m4.trs(n.t,n.r,n.s);n.w=parent[i]!==undefined?m4.mul(nodes[parent[i]].w,l):l});
      skin.joints.forEach((j,k)=>{const m=m4.mul(nodes[j].w,Array.from(ibm.subarray(k*16,k*16+16)));jointBuf.set(m,k*16)});
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const asp=canvas.width/canvas.height,dist=opts.dist||5.4,eye=[0,1.35,dist];
      const vp=m4.mul(m4.persp(opts.fov||.52,asp,.1,50),m4.lookAt(eye,[0,opts.targetY||1.02,0],[0,1,0]));
      gl.uniformMatrix4fv(loc.uVP,false,vp);gl.uniformMatrix4fv(loc.uModel,false,m4.rotY(st.yaw));gl.uniform3fv(loc.uEye,eye);
      gl.uniformMatrix4fv(loc.uJ,false,jointBuf);gl.uniform1f(loc.uLight,st.light);
      for(const d of draws){
        if(d.targets){const w=d.node.weights,key=w.map(v=>v.toFixed(3)).join();if(key!==d.lastW){d.lastW=key;const c=d.cur;c.set(d.basePos);
            w.forEach((wt,ti)=>{if(wt>.001){const t=d.targets[ti];for(let i=0;i<c.length;i++)c[i]+=t[i]*wt}});gl.bindBuffer(gl.ARRAY_BUFFER,d.pos);gl.bufferSubData(gl.ARRAY_BUFFER,0,c)}}
        const bind=(b,l,n,t,norm)=>{if(l<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,t,norm,0,0)};
        bind(d.pos,loc.aP,3,gl.FLOAT,false);bind(d.nor,loc.aN,3,gl.FLOAT,false);bind(d.uv,loc.aUV,2,gl.FLOAT,false);bind(d.j,loc.aJ,4,d.jt,false);bind(d.w,loc.aW,4,d.wt,d.wn);
        const pb=d.mat.pbrMetallicRoughness||{};gl.uniform4fv(loc.uBase,pb.baseColorFactor||[1,1,1,1]);gl.uniform1f(loc.uMetal,pb.metallicFactor??0);gl.uniform1f(loc.uRough,pb.roughnessFactor??1);
        const ti=pb.baseColorTexture?json.textures[pb.baseColorTexture.index].source:-1;gl.uniform1f(loc.uHasTex,ti>=0?1:0);if(ti>=0){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texs[ti]);gl.uniform1i(loc.uTex,0)}
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,d.ib);gl.drawElements(gl.TRIANGLES,d.count,d.idxType,0)}
    }
    /* deterministic render for video capture: state at absolute time t (s) */
    function renderAt(t,{gesture,gestureStart=0,expr,yaw}={}){
      st.bt=0;st.gesture=null;st.yawV=0;if(yaw!==undefined)st.yaw=yaw;if(expr)ctrl.setExpression(expr);st.exprCur=[0,1,2,3].map(i=>st.expr[i]||0);
      st.bt=t%st.base.dur;st.lookCur=st.look.slice();
      if(gesture&&t>=gestureStart&&t<gestureStart+clips[gesture].dur){st.gesture=clips[gesture];st.gt=t-gestureStart}
      const a=st.auto;st.auto=false;step(0);st.auto=a;draw()}
    let raf=0,vis=true;
    function loop(now){raf=0;if(!vis)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;step(dt);draw();raf=requestAnimationFrame(loop)}
    function start(){if(!raf){last=null;raf=requestAnimationFrame(loop)}}
    function stop(){cancelAnimationFrame(raf);raf=0}
    if(opts.autostart!==false){new IntersectionObserver(e=>{vis=e[0].isIntersecting;if(vis)start()}).observe(canvas);start()}
    return ctrl;
  }
  window.AliAvatar={create,loadGLB};
})();
