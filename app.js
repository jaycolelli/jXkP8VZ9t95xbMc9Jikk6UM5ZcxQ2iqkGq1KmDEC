/* ABC Sand & Rock · Yard Visualizer — a JayCo preview. 100% client-side, no network calls beyond loading this site's own files. */
(function(){
'use strict';
var D=window.ABC_DATA, PRODUCTS=D.products, SAMPLES=D.samples;
var PBY={}; PRODUCTS.forEach(function(p){PBY[p.id]=p;});
var PHONE_TEL='+16022721792', PHONE='(602) 272-1792';
var DENS={ds:{t:1.4,l:'Decorative Stone 1/4"–1"'},rr:{t:1.4,l:'River Rock 1/4"–6"'},rr6:{t:1.1,l:'River Rock 6"+'},dg:{t:1.4,l:'Decomposed Granite'}};
var CATL={stone:'Decorative Stone',dg:'Decomposed Granite',river:'River Rock'};
var FAMS=[['all','All colors',''],['gold','Golds & tans','#C9A15A'],['brown','Browns','#7A5236'],['red','Reds & pinks','#B5543F'],['grey','Greys & whites','#9AA0A6'],['green','Greens & blends','#7E8C6A'],['natural','Natural river rock','#8C8A80']];
var ZC=['#E07A3C','#7FA06E','#D4AF5F','#6FA8DC','#D77A9A'];
var $=function(s,r){return (r||document).querySelector(s);};
var el=function(t,a,h){var e=document.createElement(t);if(a)for(var k in a){if(k==='class')e.className=a[k];else if(k==='style')e.style.cssText=a[k];else e.setAttribute(k,a[k]);}if(h!=null)e.innerHTML=h;return e;};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
var r2=function(v){return Math.round(v*100)/100;};
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('show');},2200);}

/* ------------------------------------------------------------------ deadline / ribbon / end card */
var DEADLINE_MS=Date.parse('2026-12-02T18:00:00Z');
function daysLeft(now){ if(now>=DEADLINE_MS) return -1;
  var fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Phoenix',year:'numeric',month:'2-digit',day:'2-digit'});
  var t0=Date.parse(fmt.format(new Date(now))+'T00:00:00Z'), t1=Date.parse('2026-12-02T00:00:00Z');
  return Math.round((t1-t0)/86400000); }
function countdownLabel(d){return d>=2?d+' days left':d===1?'1 day left':d===0?'last day':'';}
function endCard(){
  var c=String(window.JAY_CONTACT||'').trim(), ch='';
  if(c){ ch=/^https?:\/\//i.test(c)?'<a href="'+esc(c)+'">'+esc(c)+'</a>':c.indexOf('@')>0?'<a href="mailto:'+esc(c)+'">'+esc(c)+'</a>':esc(c); ch='<p style="margin:14px 0 0;font-size:16px;color:#D4AF5F;word-break:break-word">'+ch+'</p>'; }
  var e=$('#endcard'); e.innerHTML='<div class="bar"></div><div class="k">Preview edition</div><h1>This preview has closed.</h1><p class="p">Want a yard visualizer like this on your own site, plus custom AI assistants for quotes, delivery planning and customer questions, in English and Spanish?</p><div class="j">JayCo</div><div class="s">AI Consulting &amp; Services</div><p style="margin:0;font-size:16px;line-height:1.5">Let\'s talk.</p>'+ch;
  e.hidden=false; $('#app').hidden=true; }
function tickRibbon(){ var d=daysLeft(Date.now()); if(d<0){endCard();return false;} var l=countdownLabel(d); $('#ribbon-days').textContent=l?' · '+l:''; return true; }
if(!tickRibbon()) return;
setInterval(tickRibbon,60000);
$('#ribbon-x').onclick=function(){ $('#ribbon').remove(); requestAnimationFrame(layout); };

/* ------------------------------------------------------------------ state */
var S={img:null,W:0,H:0,sample:null,zones:[],active:-1,tool:'poly',brush:28,horizon:0.3,horizonAuto:true,flat:false,
  step:'photo',compare:false,cmpX:0.5,view:{s:1,tx:0,ty:0},shadow:0.85,feather:3,sel:-1,zip:'',date:'',fam:'all',type:'all',q:''};
var hist=[];
var zid=0;
function newZone(){ var i=S.zones.length; var z={id:++zid,name:'Zone '+String.fromCharCode(65+i),color:ZC[i%ZC.length],pts:[],closed:false,strokes:[],
  product:null,scale:1,rot:0,area:'',L:'',Wd:'',useLW:false,depth:2,dens:null,mask:null,dirty:true,meanL:.5,tint:[1,1,1]}; S.zones.push(z); S.active=S.zones.length-1; return z; }
function Z(){return S.zones[S.active];}
function snap(){ return JSON.stringify({z:S.zones.map(function(z){var o={};for(var k in z) if(k!=='mask') o[k]=z[k]; return o;}),a:S.active,h:S.horizon,ha:S.horizonAuto}); }
function pushHist(){ hist.push(snap()); if(hist.length>60) hist.shift(); }
function undo(){ var s=hist.pop(); if(!s){toast('Nothing to undo');return;} var o=JSON.parse(s); S.zones=o.z.map(function(z){z.mask=null;z.dirty=true;return z;}); S.active=o.a; S.horizon=o.h; S.horizonAuto=o.ha; S.sel=-1; changed(true); }

/* ------------------------------------------------------------------ DOM refs */
var stage=$('#stage'), inner=$('#stage-inner'), cvO=$('#cv-orig'), cvG=$('#cv-gl'), ov=$('#overlay');
var base={w:0,h:0,ox:0,oy:0};

/* ------------------------------------------------------------------ WebGL engine */
var gl=null, G={};
var VS='attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
var FS_PHOTO='precision mediump float;varying vec2 v;uniform sampler2D uP;void main(){gl_FragColor=vec4(texture2D(uP,v).rgb,1.);}';
var FS_ZONE=[
'precision highp float;varying vec2 v;',
'uniform sampler2D uS,uS2,uM,uT;uniform vec2 uRes;uniform float uHz,uTiles,uRot,uShadow,uMeanL,uTexL,uFeather,uSeed;uniform vec3 uTint;',
'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
'float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}',
'float mk(vec2 o){return texture2D(uM,v+o).r;}',
'void main(){',
' float dy=v.y-uHz; if(dy<=0.0005) discard;',
' float asp=uRes.x/uRes.y, k=1.-uHz;',
' vec2 g=vec2((v.x-.5)*asp*k/dy, k*k/dy);',          /* ground-plane coords, 1 unit = image height at the bottom row */
' float cs=cos(uRot), sn=sin(uRot); g=mat2(cs,-sn,sn,cs)*g;',
' vec2 uv=g*uTiles/asp + uSeed;',
' vec3 a=texture2D(uT,uv).rgb;',
' vec2 uv2=mat2(.8,-.6,.6,.8)*uv*1.13+vec2(.37,.71);',     /* second, rotated sample breaks up visible repeats */
' vec3 b=texture2D(uT,uv2).rgb;',
' float n=vn(uv*.55+3.1)*.65+vn(uv*1.7)*.35;',
' vec3 c=mix(a,b,smoothstep(.38,.62,n));',
' c*=.94+.12*vn(g*uTiles/asp*.18+7.);',                  /* low-frequency raking variation */
' float Ls=mix(lum(texture2D(uS2,v).rgb),lum(texture2D(uS,v).rgb),.4);',
' float rel=clamp(Ls/max(uMeanL,.02),.08,2.2);',
' float expo=clamp(pow(max(uMeanL,.02)/max(uTexL,.02),.7),.28,1.6);',
' c=c*expo*uTint*mix(1.,rel,uShadow);',
' vec2 px=vec2(1.)/uRes*uFeather;',
' float m=mk(vec2(0))*.2;',
' m+=(mk(px*vec2(1,0))+mk(px*vec2(-1,0))+mk(px*vec2(0,1))+mk(px*vec2(0,-1)))*.1;',
' m+=(mk(px*vec2(.7,.7))+mk(px*vec2(-.7,.7))+mk(px*vec2(.7,-.7))+mk(px*vec2(-.7,-.7)))*.1;',
' vec2 q=px*3.+vec2(1.5)/uRes;',
' float mb=(mk(q*vec2(1,0))+mk(q*vec2(-1,0))+mk(q*vec2(0,1))+mk(q*vec2(0,-1))+mk(q*vec2(.7,.7))+mk(q*vec2(-.7,.7))+mk(q*vec2(.7,-.7))+mk(q*vec2(-.7,-.7)))*.125;',
' float ao=mix(.80,1.,smoothstep(.45,1.,mb));',           /* soft contact shadow where rock meets edges */
' float fade=smoothstep(0.,.012,dy);',
' gl_FragColor=vec4(clamp(c*ao,0.,1.),clamp(m,0.,1.)*fade);',
'}'].join('\n');
function mkProg(fs){ var p=gl.createProgram(); [[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,fs]].forEach(function(s){var sh=gl.createShader(s[0]);gl.shaderSource(sh,s[1]);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));gl.attachShader(p,sh);});
  gl.bindAttribLocation(p,0,'p'); gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); var u={}; var n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS); for(var i=0;i<n;i++){var nm=gl.getActiveUniform(p,i).name;u[nm]=gl.getUniformLocation(p,nm);} return {p:p,u:u}; }
function initGL(){
  try{ gl=cvG.getContext('webgl',{preserveDrawingBuffer:true,premultipliedAlpha:false,antialias:false,alpha:false}); }catch(e){gl=null;}
  if(!gl) return false;
  try{
    var hp=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT); if(!hp||hp.precision===0) FS_ZONE=FS_ZONE.replace('precision highp','precision mediump');
    G.photo=mkProg(FS_PHOTO); G.zone=mkProg(FS_ZONE);
  }catch(e){ console.warn('WebGL shader failed, using 2D fallback',e); gl=null; return false; }
  var b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  G.aniso=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'); if(G.aniso) G.anisoMax=Math.min(16,gl.getParameter(G.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
  G.tP=gl.createTexture(); G.tS=gl.createTexture(); G.tS2=gl.createTexture(); G.tM=gl.createTexture(); G.rock={};
  return true;
}
function texParams(mip){ gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mip?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,mip?gl.REPEAT:gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,mip?gl.REPEAT:gl.CLAMP_TO_EDGE); }
function upload(t,src,mip){ gl.bindTexture(gl.TEXTURE_2D,t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src); texParams(mip); if(mip){ gl.generateMipmap(gl.TEXTURE_2D); if(G.aniso) gl.texParameterf(gl.TEXTURE_2D,G.aniso.TEXTURE_MAX_ANISOTROPY_EXT,G.anisoMax); } }
var rockImg={};
function loadRock(id,cb){ if(rockImg[id]&&rockImg[id].ok) return cb&&cb(); var im=rockImg[id]||(rockImg[id]=new Image()); if(!im.src){ im.onload=function(){im.ok=true; if(gl){G.rock[id]=gl.createTexture(); upload(G.rock[id],im,true);} (im.cbs||[]).forEach(function(f){f();}); im.cbs=[]; schedule();}; im.cbs=[]; im.src='tex/'+id+'.jpg'; } if(cb) im.cbs.push(cb); }

/* shade map (blurred luminance of the photo) + small stats buffer */
var shadeCv, shade2Cv, statCv, statData, SW=0, SH=0;
function buildShade(){
  var w=Math.max(8,Math.round(S.W/5)), h=Math.max(8,Math.round(S.H/5));
  var c=document.createElement('canvas'); c.width=w;c.height=h; var x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(S.img,0,0,w,h);
  shadeCv=document.createElement('canvas'); shadeCv.width=S.W; shadeCv.height=S.H; var y=shadeCv.getContext('2d'); y.imageSmoothingEnabled=true; y.imageSmoothingQuality='high'; y.drawImage(c,0,0,S.W,S.H);
  var w2=Math.max(6,Math.round(S.W/16)), h2=Math.max(6,Math.round(S.H/16)); var c2=document.createElement('canvas'); c2.width=w2; c2.height=h2; var x2=c2.getContext('2d'); x2.imageSmoothingQuality='high'; x2.drawImage(c,0,0,w2,h2);
  shade2Cv=document.createElement('canvas'); shade2Cv.width=S.W; shade2Cv.height=S.H; var y2=shade2Cv.getContext('2d'); y2.imageSmoothingQuality='high'; y2.drawImage(c2,0,0,S.W,S.H);
  SW=Math.max(8,Math.round(S.W/8)); SH=Math.max(8,Math.round(S.H/8)); statCv=document.createElement('canvas'); statCv.width=SW; statCv.height=SH;
  var sx=statCv.getContext('2d'); sx.drawImage(S.img,0,0,SW,SH); statData=sx.getImageData(0,0,SW,SH).data;
}
var MW=0,MH=0;
function buildMask(z){
  if(!z.mask){ z.mask=document.createElement('canvas'); }
  MW=Math.round(S.W/1.5); MH=Math.round(S.H/1.5); if(z.mask.width!==MW){z.mask.width=MW; z.mask.height=MH;}
  var x=z.mask.getContext('2d'); x.globalCompositeOperation='source-over'; x.fillStyle='#000'; x.fillRect(0,0,MW,MH); x.fillStyle='#fff'; x.strokeStyle='#fff';
  if(z.closed && z.pts.length>2){ x.beginPath(); z.pts.forEach(function(p,i){ i?x.lineTo(p[0]*MW,p[1]*MH):x.moveTo(p[0]*MW,p[1]*MH); }); x.closePath(); x.fill(); }
  z.strokes.forEach(function(s){ x.globalCompositeOperation=s.mode==='erase'?'destination-out':'source-over'; if(s.mode==='erase'){x.fillStyle='#000';}
    x.lineCap='round'; x.lineJoin='round'; x.lineWidth=s.r*2*MH; x.strokeStyle=s.mode==='erase'?'rgba(0,0,0,1)':'#fff';
    x.beginPath(); s.pts.forEach(function(p,i){ i?x.lineTo(p[0]*MW,p[1]*MH):x.moveTo(p[0]*MW,p[1]*MH); }); if(s.pts.length===1) x.lineTo(s.pts[0][0]*MW+.01,s.pts[0][1]*MH); x.stroke();
    if(s.mode==='erase'){ x.globalCompositeOperation='source-over'; } });
  // erased areas become transparent; flatten onto black
  var t=document.createElement('canvas'); t.width=MW;t.height=MH; var tx=t.getContext('2d'); tx.fillStyle='#000'; tx.fillRect(0,0,MW,MH); tx.drawImage(z.mask,0,0); x.globalCompositeOperation='copy'; x.drawImage(t,0,0); x.globalCompositeOperation='source-over';
  // stats: mean luminance + colour under the zone (for exposure + tint matching)
  var s=document.createElement('canvas'); s.width=SW; s.height=SH; var sx=s.getContext('2d'); sx.drawImage(z.mask,0,0,SW,SH); var md=sx.getImageData(0,0,SW,SH).data;
  var wsum=0,L=0,R=0,Gg=0,B=0; for(var i=0;i<md.length;i+=4){ var w=md[i]/255; if(w<.02) continue; var r=statData[i]/255,g=statData[i+1]/255,b=statData[i+2]/255; wsum+=w; R+=r*w; Gg+=g*w; B+=b*w; }
  if(wsum>0){ R/=wsum;Gg/=wsum;B/=wsum; L=.299*R+.587*Gg+.114*B; z.meanL=clamp(L,.03,1); var m=Math.max(L,.03); var k=.2; z.tint=[1+(R/m-1)*k,1+(Gg/m-1)*k,1+(B/m-1)*k].map(function(v){return clamp(v,.75,1.3);}); }
  z.dirty=false; z.hasArea=wsum>0;
}
function render(){
  if(!S.img) return;
  S.zones.forEach(function(z){ if(z.dirty) buildMask(z); });
  if(gl){
    gl.viewport(0,0,S.W,S.H); gl.disable(gl.BLEND);
    gl.useProgram(G.photo.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,G.tP); gl.uniform1i(G.photo.u.uP,0); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    var P=G.zone, u=P.u; gl.useProgram(P.p);
    S.zones.forEach(function(z,zi){
      if(!z.product||!z.hasArea) return; var pr=PBY[z.product]; if(!rockImg[z.product]||!rockImg[z.product].ok){ loadRock(z.product); return; }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,G.tS); gl.uniform1i(u.uS,0); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D,G.tS2); gl.uniform1i(u.uS2,3);
      gl.activeTexture(gl.TEXTURE1); upload(G.tM,z.mask,false); gl.uniform1i(u.uM,1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,G.rock[z.product]); gl.uniform1i(u.uT,2);
      gl.uniform2f(u.uRes,S.W,S.H); gl.uniform1f(u.uHz,S.flat?-8:S.horizon); gl.uniform1f(u.uTiles,pr.tiles*z.scale); gl.uniform1f(u.uRot,z.rot*Math.PI/180);
      gl.uniform1f(u.uShadow,S.shadow); gl.uniform1f(u.uMeanL,z.meanL); gl.uniform1f(u.uTexL,pr.lum); gl.uniform1f(u.uFeather,S.feather*S.W/1000+.75); gl.uniform1f(u.uSeed,zi*.37);
      gl.uniform3f(u.uTint,z.tint[0],z.tint[1],z.tint[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    });
  } else render2D();
  var any=S.zones.some(function(z){return z.product&&z.hasArea;});
  $('#btn-save').disabled=!any; $('#btn-compare').disabled=!any;
}
function render2D(){ // fallback: flat pattern + multiply (no perspective)
  var x=cvG.getContext('2d'); x.globalCompositeOperation='source-over'; x.globalAlpha=1; x.drawImage(S.img,0,0,S.W,S.H);
  S.zones.forEach(function(z){ if(!z.product||!z.hasArea||!rockImg[z.product]||!rockImg[z.product].ok){ if(z.product) loadRock(z.product); return; }
    var t=document.createElement('canvas'); t.width=S.W;t.height=S.H; var tx=t.getContext('2d'); var pat=tx.createPattern(rockImg[z.product],'repeat');
    var sc=S.W/(PBY[z.product].tiles*z.scale)/512; pat.setTransform&&pat.setTransform(new DOMMatrix().scale(sc)); tx.fillStyle=pat; tx.fillRect(0,0,S.W,S.H);
    tx.globalAlpha=S.shadow; tx.globalCompositeOperation='multiply'; tx.drawImage(shadeCv,0,0); tx.globalAlpha=1;
    tx.globalCompositeOperation='destination-in'; tx.drawImage(z.mask,0,0,S.W,S.H); x.drawImage(t,0,0); });
}
var raf=0; function schedule(){ if(!raf) raf=requestAnimationFrame(function(){raf=0; render(); drawOverlay();}); }
function changed(maskToo){ if(maskToo) S.zones.forEach(function(z){z.dirty=true;}); else { var z=Z(); if(z) z.dirty=true; } schedule(); renderPanel(); }

/* ------------------------------------------------------------------ photo loading */
var MAXD=1600;
function setImage(img,sample){
  var w=img.naturalWidth||img.width, h=img.naturalHeight||img.height, sc=Math.min(1,MAXD/Math.max(w,h));
  S.W=Math.round(w*sc); S.H=Math.round(h*sc);
  var c=document.createElement('canvas'); c.width=S.W; c.height=S.H; var x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(img,0,0,S.W,S.H);
  S.img=c; S.sample=sample||null; S.zones=[]; S.active=-1; hist=[]; S.sel=-1; S.compare=false; S.view={s:1,tx:0,ty:0}; S.flat=false;
  S.horizon=sample?sample.horizon:0.3; S.horizonAuto=!sample; if(sample&&sample.horizon<-1){S.flat=true;}
  cvO.width=cvG.width=S.W; cvO.height=cvG.height=S.H; cvO.getContext('2d').drawImage(c,0,0);
  ov.setAttribute('viewBox','0 0 '+S.W+' '+S.H); ov.setAttribute('preserveAspectRatio','none');
  buildShade(); if(gl){ upload(G.tP,c,false); upload(G.tS,shadeCv,false); upload(G.tS2,shade2Cv,false); }
  $('#welcome').hidden=true; $('#app').classList.remove('empty'); layout(); setCompare(false);
  if(sample){ useSuggested(); goStep('rock'); } else { newZone(); goStep('mark'); }
  schedule();
}
function useSuggested(product){
  var sm=S.sample; if(!sm) return; pushHist(); S.zones=[]; var z=newZone(); z.pts=sm.poly.map(function(p){return p.slice();}); z.closed=true; z.product=product||sm.product; z.scale=sm.tiles||1;
  z.dens=null; S.horizon=sm.horizon; S.flat=sm.horizon<-1; S.horizonAuto=false; loadRock(z.product); changed(true);
}
function loadSample(i,cb){ var sm=SAMPLES[i]; var im=new Image(); im.onload=function(){ setImage(im,sm); cb&&cb(); }; im.src=sm.img; }
function loadFile(f){ if(!f) return; if(!/^image\//.test(f.type)&&!/\.(jpe?g|png|webp|heic|gif)$/i.test(f.name)){toast('Please choose a photo');return;}
  var url=URL.createObjectURL(f); var im=new Image(); im.onload=function(){ setImage(im,null); URL.revokeObjectURL(url); toast('Photo loaded. Tap around the area to cover.'); }; im.onerror=function(){toast('That photo format isn\u2019t supported here. Try a JPG or PNG.');}; im.src=url; }
$('#file-cam').onchange=function(e){loadFile(e.target.files[0]); e.target.value='';};
$('#file-up').onchange=function(e){loadFile(e.target.files[0]); e.target.value='';};
var sEl=$('#samples'); SAMPLES.forEach(function(s,i){ var b=el('button',{type:'button',class:'sample',style:'background-image:url('+s.th+')'},'<span>'+esc(s.en)+'</span>'); b.onclick=function(){loadSample(i);}; sEl.appendChild(b); });
$('#btn-new').onclick=function(){ $('#welcome').hidden=false; $('#app').classList.add('empty'); setCompare(false); requestAnimationFrame(layout); };

/* ------------------------------------------------------------------ layout / view transform */
function placeFab(){ var f=$('#chat-fab'); if(window.innerWidth>=900){ f.style.bottom=''; f.style.right=''; return; } var r=$('#stage-wrap').getBoundingClientRect(); f.style.bottom=(window.innerHeight-r.bottom-3)+'px'; f.style.right=(window.innerWidth-r.right+10)+'px'; }
function layout(){
  placeFab(); if(!S.W) return; var r=stage.getBoundingClientRect(); var sc=Math.min(r.width/S.W,r.height/S.H);
  base.w=S.W*sc; base.h=S.H*sc; base.ox=(r.width-base.w)/2; base.oy=(r.height-base.h)/2; inner.style.width=base.w+'px'; inner.style.height=base.h+'px'; applyView(); }
function applyView(){ var v=S.view; inner.style.transform='translate('+(base.ox+v.tx)+'px,'+(base.oy+v.ty)+'px) scale('+v.s+')'; drawOverlay(); placeCompare(); }
function dispScale(){ return base.w/S.W*S.view.s; } // screen px per image px
window.addEventListener('resize',function(){layout();});
$('#btn-fit').onclick=function(){ S.view={s:1,tx:0,ty:0}; applyView(); };
function toImg(cx,cy){ var r=inner.getBoundingClientRect(); return [(cx-r.left)/r.width,(cy-r.top)/r.height]; } // normalized

/* ------------------------------------------------------------------ overlay */
var NS='http://www.w3.org/2000/svg';
function sv(t,a){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);return e;}
function drawOverlay(){
  if(!S.W){ov.innerHTML='';return;} ov.innerHTML=''; var k=1/dispScale(); var W=S.W,H=S.H;
  var editing=S.step==='mark'||S.step==='photo';
  S.zones.forEach(function(z,zi){ var act=zi===S.active; if(!z.pts.length) return;
    var d=z.pts.map(function(p,i){return (i?'L':'M')+(p[0]*W).toFixed(1)+' '+(p[1]*H).toFixed(1);}).join(' ');
    if(z.closed){ var rendered=z.product&&!editing; ov.appendChild(sv('path',{d:d+' Z',class:'zpoly'+(rendered?' rendered':'')+(act?'':' inactive'),fill:z.color,stroke:rendered?(act&&S.step==='rock'?'rgba(251,245,234,.55)':'transparent'):z.color})); }
    else { ov.appendChild(sv('path',{d:d,class:'zline',stroke:z.color})); }
    if(act && editing && S.tool==='poly'){
      if(z.closed){ z.pts.forEach(function(p,i){ var q=z.pts[(i+1)%z.pts.length]; var g=sv('g',{class:'hdl mid','data-mid':i}); g.appendChild(sv('circle',{class:'hit',cx:(p[0]+q[0])/2*W,cy:(p[1]+q[1])/2*H,r:16*k})); g.appendChild(sv('circle',{class:'v',cx:(p[0]+q[0])/2*W,cy:(p[1]+q[1])/2*H,r:5*k})); ov.appendChild(g); }); }
      z.pts.forEach(function(p,i){ var g=sv('g',{class:'hdl'+(i===0&&!z.closed?' first':''),'data-i':i}); g.appendChild(sv('circle',{class:'hit',cx:p[0]*W,cy:p[1]*H,r:18*k})); g.appendChild(sv('circle',{class:'v',cx:p[0]*W,cy:p[1]*H,r:(i===S.sel?11:8.5)*k,stroke:z.color,'stroke-width':3*k})); ov.appendChild(g); });
    }
  });
  if(S.step==='look' && !S.flat && !S.compare && S.zones.some(function(z){return z.product;})){
    var y=S.horizon*H; var g=sv('g',{class:'horizon hdl','data-hz':1}); g.appendChild(sv('rect',{class:'hit',x:0,y:y-24*k,width:W,height:48*k}));
    if(y>-1){ g.appendChild(sv('line',{x1:0,y1:y,x2:W,y2:y})); var bw=150*k,bh=30*k,bx=W/2-bw/2; g.appendChild(sv('rect',{x:bx,y:y-bh/2,width:bw,height:bh,rx:bh/2})); var t=sv('text',{x:W/2,y:y+5*k,'text-anchor':'middle','font-size':13*k}); t.textContent='\u2195 Drag horizon'; g.appendChild(t); }
    ov.appendChild(g);
  }
  if(brushPos && (S.tool==='brush'||S.tool==='erase') && S.step==='mark'){ ov.appendChild(sv('circle',{class:'brush-cursor',cx:brushPos[0]*W,cy:brushPos[1]*H,r:S.brush*k})); }
  updateHint();
}
var brushPos=null;
function updateHint(){
  var h=$('#hint'), z=Z(), t='';
  if(!S.img){h.hidden=true;return;}
  if(S.step==='mark'){ if(S.tool==='poly'){ if(!z||(!z.closed&&z.pts.length===0)) t='Tap the corners of the area you want to cover'; else if(!z.closed&&z.pts.length<3) t='Keep tapping around the area ('+z.pts.length+' points)'; else if(!z.closed) t='Tap the first point (or Done) to close the shape'; else t='Drag points to adjust. Tap a dot on an edge to add a point.'; }
    else t=S.tool==='brush'?'Paint to add to '+(z?z.name:'the zone'):'Paint to erase from '+(z?z.name:'the zone'); }
  else if(S.step==='look'&&!S.flat) t='Drag the gold line to the horizon for true depth';
  else if(S.step==='rock'&&z&&!z.product) t='Pick a rock for '+z.name;
  if(S.compare) t='';
  h.textContent=t; h.hidden=!t;
}

/* ------------------------------------------------------------------ pointer input */
var ptrs={}, gest=null;
stage.addEventListener('pointerdown',function(e){
  if(!S.img||!$('#welcome').hidden) return;
  if(e.target.closest('#stage-tools')||e.target.closest('.cmp-line')) return;
  stage.setPointerCapture(e.pointerId); ptrs[e.pointerId]={x:e.clientX,y:e.clientY};
  var ids=Object.keys(ptrs);
  if(ids.length===2){ // pinch
    if(gest&&gest.type==='stroke'){ var z0=Z(); if(z0&&gest.started){ z0.strokes.pop(); z0.dirty=true; schedule(); } }
    var a=ptrs[ids[0]],b=ptrs[ids[1]]; gest={type:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y),c0:[(a.x+b.x)/2,(a.y+b.y)/2],v0:JSON.parse(JSON.stringify(S.view))}; return; }
  if(ids.length>2) return;
  var p=toImg(e.clientX,e.clientY), t=e.target.closest('.hdl'), z=Z();
  if(t&&t.getAttribute('data-hz')){ pushHist(); gest={type:'hz'}; S.horizonAuto=false; return; }
  if(S.step==='mark'&&S.tool==='poly'){
    if(t&&t.hasAttribute('data-i')){ var i=+t.getAttribute('data-i'); if(!z.closed&&i===0&&z.pts.length>=3){ pushHist(); z.closed=true; autoHorizon(); changed(); gest=null; return; }
      pushHist(); S.sel=i; gest={type:'drag',i:i,moved:false,sx:e.clientX,sy:e.clientY,p:p}; drawOverlay(); renderPanel(); return; }
    if(t&&t.hasAttribute('data-mid')){ pushHist(); var mi=+t.getAttribute('data-mid'); z.pts.splice(mi+1,0,p); S.sel=mi+1; gest={type:'drag',i:mi+1,moved:true}; changed(); return; }
    gest={type:'tap',sx:e.clientX,sy:e.clientY,p:p,v0:JSON.parse(JSON.stringify(S.view))}; return; }
  if(S.step==='mark'&&(S.tool==='brush'||S.tool==='erase')){
    if(!z){ z=newZone(); z.closed=true; }
    pushHist(); var st={mode:S.tool==='erase'?'erase':'add',r:S.brush/dispScale()/S.H,pts:[p]}; z.strokes.push(st); gest={type:'stroke',st:st,started:true}; z.dirty=true; brushPos=p; schedule(); return; }
  gest={type:'pan',sx:e.clientX,sy:e.clientY,v0:JSON.parse(JSON.stringify(S.view))};
});
stage.addEventListener('pointermove',function(e){
  if(S.img&&(S.tool==='brush'||S.tool==='erase')&&S.step==='mark'&&e.pointerType==='mouse'){ brushPos=toImg(e.clientX,e.clientY); if(!gest) drawOverlay(); }
  if(!ptrs[e.pointerId]) return; ptrs[e.pointerId]={x:e.clientX,y:e.clientY}; if(!gest) return;
  var p=toImg(e.clientX,e.clientY), z=Z();
  if(gest.type==='pinch'){ var ids=Object.keys(ptrs); if(ids.length<2) return; var a=ptrs[ids[0]],b=ptrs[ids[1]]; var d=Math.hypot(a.x-b.x,a.y-b.y), c=[(a.x+b.x)/2,(a.y+b.y)/2];
    var s=clamp(gest.v0.s*d/gest.d0,1,6), r=stage.getBoundingClientRect(); var cx=gest.c0[0]-r.left-base.ox, cy=gest.c0[1]-r.top-base.oy;
    var ix=(cx-gest.v0.tx)/gest.v0.s, iy=(cy-gest.v0.ty)/gest.v0.s; S.view={s:s,tx:c[0]-r.left-base.ox-ix*s,ty:c[1]-r.top-base.oy-iy*s}; clampView(); applyView(); return; }
  if(gest.type==='drag'){ if(!gest.moved&&gest.sx!=null&&Math.hypot(e.clientX-gest.sx,e.clientY-gest.sy)<6) return; z.pts[gest.i]=[snapE(clamp(p[0],0,1)),snapE(clamp(p[1],0,1))]; gest.moved=true; if(z.closed){ z.dirty=true; if(S.horizonAuto) autoHorizon(); } schedule(); return; }
  if(gest.type==='hz'){ var lim=minZoneTop()-0.015; S.horizon=clamp(p[1],-3,lim); schedule(); syncLookSliders(); return; }
  if(gest.type==='stroke'){ gest.st.pts.push(p); brushPos=p; z.dirty=true; schedule(); return; }
  if(gest.type==='tap'||gest.type==='pan'){ var dx=e.clientX-gest.sx, dy=e.clientY-gest.sy; if(gest.type==='tap'&&Math.hypot(dx,dy)>10){ gest.type='pan'; }
    if(gest.type==='pan'&&S.view.s>1.01){ S.view.tx=gest.v0.tx+dx; S.view.ty=gest.v0.ty+dy; clampView(); applyView(); } }
});
function endPtr(e){
  if(!ptrs[e.pointerId]) return; delete ptrs[e.pointerId]; if(!gest) return;
  if(gest.type==='pinch'){ if(Object.keys(ptrs).length===0) gest=null; else gest={type:'none'}; return; }
  if(gest.type==='tap'&&S.step==='mark'&&S.tool==='poly'){ var z=Z(), p=gest.p;
    if(!z||z.closed){ // tap inside another zone selects it
      var hit=-1; S.zones.forEach(function(zz,i){ if(zz.closed&&inPoly(p,zz.pts)) hit=i; }); if(hit>=0&&hit!==S.active){ S.active=hit; S.sel=-1; renderPanel(); drawOverlay(); gest=null; return; }
      if(!z||z.closed){ if(z&&z.closed){ toast('Tap \u201c+ Add zone\u201d to outline another area'); gest=null; return; } } }
    if(!z) z=newZone(); pushHist(); z.pts.push([snapE(clamp(p[0],0,1)),snapE(clamp(p[1],0,1))]); S.sel=-1; changed(); }
  if(gest.type==='drag'){ var zd=Z(); if(!gest.moved){ if(zd&&!zd.closed&&gest.p){ zd.pts.push([snapE(clamp(gest.p[0],0,1)),snapE(clamp(gest.p[1],0,1))]); S.sel=-1; changed(); } else hist.pop(); } renderPanel(); }
  if(gest.type==='stroke'){ renderPanel(); }
  if(gest.type==='hz'){ renderPanel(); }
  gest=null; if(e.pointerType!=='mouse'){ brushPos=null; drawOverlay(); }
}
stage.addEventListener('pointerup',endPtr); stage.addEventListener('pointercancel',endPtr);
stage.addEventListener('pointerleave',function(e){ if(e.pointerType==='mouse'&&brushPos&&!gest){brushPos=null;drawOverlay();} });
stage.addEventListener('wheel',function(e){ if(!S.img) return; e.preventDefault(); var r=stage.getBoundingClientRect(); var cx=e.clientX-r.left-base.ox, cy=e.clientY-r.top-base.oy; var v=S.view;
  var s=clamp(v.s*Math.exp(-e.deltaY*0.0015),1,6); var ix=(cx-v.tx)/v.s, iy=(cy-v.ty)/v.s; S.view={s:s,tx:cx-ix*s,ty:cy-iy*s}; clampView(); applyView(); },{passive:false});
function clampView(){ var v=S.view; if(v.s<=1.001){v.s=1;v.tx=0;v.ty=0;return;} v.tx=clamp(v.tx,base.w*(1-v.s),0); v.ty=clamp(v.ty,base.h*(1-v.s),0); }
function snapE(v){ return v<0.02?0:v>0.98?1:v; }
function inPoly(p,pts){ var c=false; for(var i=0,j=pts.length-1;i<pts.length;j=i++){ var a=pts[i],b=pts[j]; if(((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])) c=!c; } return c; }
function minZoneTop(){ var m=1; S.zones.forEach(function(z){ z.pts.forEach(function(p){ m=Math.min(m,p[1]); }); z.strokes.forEach(function(s){ if(s.mode!=='erase') s.pts.forEach(function(p){ m=Math.min(m,p[1]-s.r); }); }); }); return m; }
function autoHorizon(){ if(!S.horizonAuto) return; var ys=[]; S.zones.forEach(function(z){z.pts.forEach(function(p){ys.push(p[1]);});}); if(!ys.length) return; var top=Math.min.apply(null,ys), bot=Math.max.apply(null,ys);
  S.horizon=clamp(top-0.06-0.3*(bot-top),-2,top-0.02); }

/* ------------------------------------------------------------------ compare slider */
function setCompare(on){ S.compare=on; $('#compare').hidden=!on; $('#btn-compare').classList.toggle('on',on); placeCompare(); drawOverlay(); if(on&&S.step==='mark') goStep('look'); }
function placeCompare(){ if(!S.compare){ cvG.style.clipPath='inset(0 0 0 0)'; return; }
  var r=stage.getBoundingClientRect(), ir=inner.getBoundingClientRect(); var x=clamp(S.cmpX,0,1)*r.width; $('.cmp-line').style.left=x+'px';
  var f=clamp((x+r.left-ir.left)/ir.width,0,1); cvG.style.clipPath='inset(0 0 0 '+(f*100).toFixed(2)+'%)'; }
$('#btn-compare').onclick=function(){ setCompare(!S.compare); };
(function(){ var line=$('.cmp-line'), on=false; line.addEventListener('pointerdown',function(e){on=true;line.setPointerCapture(e.pointerId);e.stopPropagation();});
  line.addEventListener('pointermove',function(e){ if(!on) return; var r=stage.getBoundingClientRect(); S.cmpX=clamp((e.clientX-r.left)/r.width,0.02,0.98); placeCompare(); });
  line.addEventListener('pointerup',function(){on=false;}); line.addEventListener('pointercancel',function(){on=false;}); })();

/* ------------------------------------------------------------------ steps + panel */
var STEPS=[['photo','Photo'],['mark','Mark'],['rock','Rock'],['look','Look'],['est','Estimate']];
function goStep(s){ S.step=s; S.sel=-1; if(s!=='mark') brushPos=null; renderSteps(); renderPanel(); drawOverlay(); $('#panel-body').scrollTop=0; }
function renderSteps(){ var n=$('#steps'); n.innerHTML=''; var idx=STEPS.findIndex(function(x){return x[0]===S.step;});
  STEPS.forEach(function(st,i){ var b=el('button',{type:'button',class:'step'+(st[0]===S.step?' on':'')+(i<idx?' done':''),role:'tab'},'<span class="num">'+(i+1)+'</span>'+st[1]); if(!S.img&&i>0) b.disabled=true; b.onclick=function(){goStep(st[0]);}; n.appendChild(b); }); }
function zoneChips(withAdd){ var h='<div class="zones">'; S.zones.forEach(function(z,i){ var p=z.product&&PBY[z.product]; h+='<button type="button" class="zone-chip'+(i===S.active?' on':'')+'" data-zone="'+i+'" style="--zc:'+z.color+'"><span class="zsw" style="'+(p?'background-image:url(sw/'+p.id+'.jpg)':'background:'+z.color+'33')+'"></span><span>'+esc(z.name)+'<small>'+(p?esc(p.name):z.closed?'No rock yet':'Outlining\u2026')+'</small></span></button>'; });
  if(withAdd) h+='<button type="button" class="zone-chip zone-add" data-add="1">+ Add zone</button>'; return h+'</div>'; }
function bindZoneChips(root){ root.querySelectorAll('[data-zone]').forEach(function(b){ b.onclick=function(){ S.active=+b.getAttribute('data-zone'); S.sel=-1; renderPanel(); drawOverlay(); }; });
  var a=root.querySelector('[data-add]'); if(a) a.onclick=function(){ var z=Z(); if(z&&!z.closed&&z.pts.length<3){ toast('Finish '+z.name+' first'); return; } if(z&&!z.closed){ z.closed=true; } pushHist(); newZone(); S.tool='poly'; if(S.step!=='mark') goStep('mark'); else { renderPanel(); drawOverlay(); } toast('Tap around the next area'); }; }
function nextBtn(label,step,dis){ return '<div class="row mt"><button type="button" class="btn copper block" data-next="'+step+'"'+(dis?' disabled':'')+'>'+label+' <svg viewBox="0 0 24 24"><path d="M9 6l6 6l-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>'; }
function rangeVal(i){ var p=(i.value-i.min)/(i.max-i.min)*100; i.style.setProperty('--p',p+'%'); }
var ICON={poly:'<svg viewBox="0 0 24 24"><path d="M5 18L4 7l8-3l8 6l-4 9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="4" cy="7" r="1.8" fill="currentColor"/><circle cx="12" cy="4" r="1.8" fill="currentColor"/><circle cx="20" cy="10" r="1.8" fill="currentColor"/></svg>',
  brush:'<svg viewBox="0 0 24 24"><path d="M14 4l6 6l-8 8l-6-6zM6 12l-2 6l6-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  erase:'<svg viewBox="0 0 24 24"><path d="M4 16l9-9l6 6l-6 6H7zM10 19h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'};

function renderPanel(){
  var b=$('#panel-body'); var z=Z(); var h='';
  if(S.step==='photo'){
    h+='<div class="ph"><h2>Your photo</h2><span class="sub">'+(S.img?(S.sample?esc(S.sample.en):'Your upload')+' · '+S.W+'×'+S.H:'')+'</span></div>';
    h+='<p class="help">Stand back and shoot the whole area. Phone photos work great. Everything stays on your device; nothing is uploaded.</p>';
    h+='<div class="row"><label class="btn copper grow" for="file-cam">'+'Take a photo</label><label class="btn sand grow" for="file-up">Upload</label></div>';
    h+='<div class="or">ABC yard photos</div><div class="samples">'+SAMPLES.map(function(s,i){return '<button type="button" class="sample" data-sample="'+i+'" style="background-image:url('+s.th+')"><span>'+esc(s.en)+'</span></button>';}).join('')+'</div>';
    if(S.img) h+=nextBtn('Mark the area','mark');
  }
  if(S.step==='mark'){
    h+='<div class="ph"><h2>Mark the area</h2><span class="sub">Pinch to zoom</span></div>';
    h+=zoneChips(true);
    h+='<div class="seg" role="radiogroup">'+['poly','brush','erase'].map(function(t){return '<button type="button" data-tool="'+t+'" class="'+(S.tool===t?'on':'')+'">'+ICON[t]+({poly:'Outline',brush:'Brush',erase:'Eraser'})[t]+'</button>';}).join('')+'</div>';
    if(S.tool!=='poly') h+='<div class="field"><label>Brush size <span>'+S.brush+' px</span></label><input type="range" id="r-brush" min="6" max="80" value="'+S.brush+'"></div>';
    h+='<div class="row mt">';
    h+='<button type="button" class="btn dark sm grow" data-act="undo">Undo</button>';
    if(z&&!z.closed&&S.tool==='poly') h+='<button type="button" class="btn sage sm grow" data-act="close"'+(z.pts.length<3?' disabled':'')+'>Done</button>';
    if(S.sel>=0&&z&&z.pts.length>3) h+='<button type="button" class="btn dark sm grow" data-act="delpt">Delete point</button>';
    h+='<button type="button" class="btn dark sm grow" data-act="clear">Clear</button>';
    if(S.zones.length>1) h+='<button type="button" class="btn dark sm grow" data-act="delzone">Delete zone</button>';
    h+='</div>';
    if(S.sample) h+='<div class="row mt"><button type="button" class="btn ghost sm grow" data-act="suggest">Use the suggested area for this photo</button></div>';
    h+='<p class="help" style="margin-top:12px">Tap the corners of the ground you want covered, then <b>tap the first point</b> to close it. Drag any point to adjust. Use <b>Brush</b> and <b>Eraser</b> to refine around plants and edges. Add a zone for each area that gets a different rock.</p>';
    h+=nextBtn('Choose a rock','rock',!(z&&z.closed&&(z.pts.length>2||z.strokes.length)));
  }
  if(S.step==='rock'){
    var p=z&&z.product&&PBY[z.product];
    h+='<div class="ph"><h2>Choose a rock</h2><span class="sub">'+PRODUCTS.length+' real ABC products</span></div>';
    if(S.zones.length>1) h+=zoneChips(false);
    if(p) h+='<div class="picked"><div class="img" style="background-image:url(sw/'+p.id+'.jpg)"></div><div><div class="t">'+esc(p.name)+'</div><div class="d">'+esc(CATL[p.cat])+(p.sizes.length?' · '+esc(p.sizes.join(', ')):'')+'</div><a href="'+esc(p.url)+'" target="_blank" rel="noopener">View on abcsandrock.com \u2197</a></div></div>';
    h+='<div class="filters">'+[['all','All types'],['stone','Decorative Stone'],['dg','DG'],['river','River Rock']].map(function(t){return '<button type="button" class="fchip'+(S.type===t[0]?' on':'')+'" data-type="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>';
    h+='<div class="filters" style="margin-top:-4px">'+FAMS.map(function(f){return '<button type="button" class="fchip'+(S.fam===f[0]?' on':'')+'" data-fam="'+f[0]+'">'+(f[2]?'<i style="background:'+f[2]+'"></i>':'')+f[1]+'</button>';}).join('')+'</div>';
    h+='<input class="search" id="q" type="search" placeholder="Search by name, e.g. Desert Gold" value="'+esc(S.q)+'" autocomplete="off">';
    var list=PRODUCTS.filter(function(x){ return (S.type==='all'||x.cat===S.type)&&(S.fam==='all'||x.fam===S.fam)&&(!S.q||x.name.toLowerCase().indexOf(S.q.toLowerCase())>=0); });
    h+='<div class="swgrid">'+list.map(function(x){return '<button type="button" class="sw'+(z&&z.product===x.id?' on':'')+'" data-p="'+x.id+'"><div class="img" style="background-image:url(sw/'+x.id+'.jpg)"></div><div class="nm">'+esc(x.name)+'</div><div class="ct">'+({stone:'Decorative',dg:'DG',river:'River rock'})[x.cat]+'</div></button>';}).join('')+'</div>';
    if(!list.length) h+='<p class="help">No matches. Try another color or type.</p>';
    h+=nextBtn('Fine-tune the look','look',!(z&&z.product));
  }
  if(S.step==='look'){
    h+='<div class="ph"><h2>Fine-tune</h2><span class="sub">'+(z&&z.product?esc(PBY[z.product].name):'')+'</span></div>';
    if(S.zones.length>1) h+=zoneChips(false);
    h+='<div class="row"><button type="button" class="btn '+(S.compare?'copper':'dark')+' sm grow" data-act="cmp">'+(S.compare?'Hide before / after':'Compare before / after')+'</button></div>';
    h+='<div class="field"><label>Perspective depth <span>'+(S.flat?'Flat':'Horizon at '+Math.round(S.horizon*100)+'%')+'</span></label><input type="range" id="r-hz" min="0" max="100" value="'+hzToSlider()+'"'+(S.flat?' disabled':'')+'></div>';
    h+='<label class="toggle"><span>Top-down photo (no perspective)</span><input type="checkbox" id="c-flat"'+(S.flat?' checked':'')+'></label>';
    h+='<div class="row mt"><button type="button" class="btn ghost sm grow" data-act="autohz"'+(S.flat?' disabled':'')+'>Auto depth from my outline</button></div>';
    if(z){ h+='<div class="field"><label>Stone size <span>'+(z.scale<1?'Larger':'Smaller')+' \u00b7 '+Math.round(100/z.scale)+'%</span></label><input type="range" id="r-scale" min="-100" max="100" value="'+Math.round(-Math.log2(z.scale)*60)+'"></div>';
      h+='<div class="field"><label>Rotation <span>'+z.rot+'\u00b0</span></label><input type="range" id="r-rot" min="0" max="180" value="'+z.rot+'"></div>'; }
    h+='<div class="field"><label>Keep photo shadows <span>'+Math.round(S.shadow*100)+'%</span></label><input type="range" id="r-shadow" min="0" max="100" value="'+Math.round(S.shadow*100)+'"></div>';
    h+='<div class="field"><label>Edge softness <span>'+S.feather+'</span></label><input type="range" id="r-feather" min="0" max="12" value="'+S.feather+'"></div>';
    h+=nextBtn('Estimate tons','est');
  }
  if(S.step==='est'){ h+=estimateHTML(); }
  b.innerHTML=h; bindPanel(b);
}
function hzToSlider(){ // horizon (normalized y) <-> 0..100 "depth"
  var top=minZoneTop(); var gap=clamp(top-S.horizon,0.015,6); return Math.round(clamp(100-Math.sqrt((gap-0.015)/6)*100,0,100)); }
function sliderToHz(v){ var top=minZoneTop(); var g=Math.pow((100-v)/100,2)*6+0.015; return top-g; }
function syncLookSliders(){ var r=$('#r-hz'); if(r){ r.value=hzToSlider(); rangeVal(r); var l=r.parentNode.querySelector('label span'); if(l) l.textContent='Horizon at '+Math.round(S.horizon*100)+'%'; } }
function bindPanel(b){
  b.querySelectorAll('input[type=range]').forEach(rangeVal);
  bindZoneChips(b);
  b.querySelectorAll('[data-sample]').forEach(function(x){x.onclick=function(){loadSample(+x.getAttribute('data-sample'));};});
  b.querySelectorAll('[data-next]').forEach(function(x){x.onclick=function(){ var z=Z(); if(x.getAttribute('data-next')==='rock'&&z&&!z.closed&&z.pts.length>2){z.closed=true;autoHorizon();changed();} goStep(x.getAttribute('data-next')); };});
  b.querySelectorAll('[data-tool]').forEach(function(x){x.onclick=function(){ S.tool=x.getAttribute('data-tool'); var z=Z(); if(S.tool!=='poly'&&z&&!z.closed&&z.pts.length>2){z.closed=true; autoHorizon(); z.dirty=true; schedule();} renderPanel(); drawOverlay(); };});
  b.querySelectorAll('[data-act]').forEach(function(x){x.onclick=function(){ var a=x.getAttribute('data-act'), z=Z();
    if(a==='undo') undo();
    if(a==='close'&&z&&z.pts.length>2){ pushHist(); z.closed=true; autoHorizon(); changed(); toast(z.name+' closed. Now pick a rock.'); }
    if(a==='delpt'&&z&&S.sel>=0){ pushHist(); z.pts.splice(S.sel,1); S.sel=-1; changed(); }
    if(a==='clear'&&z){ pushHist(); z.pts=[]; z.strokes=[]; z.closed=false; changed(); }
    if(a==='delzone'&&z){ pushHist(); S.zones.splice(S.active,1); S.active=Math.max(0,S.active-1); S.zones.forEach(function(zz,i){zz.name='Zone '+String.fromCharCode(65+i);}); changed(true); }
    if(a==='suggest') { useSuggested(); goStep('rock'); }
    if(a==='cmp') { setCompare(!S.compare); renderPanel(); }
    if(a==='autohz'){ S.horizonAuto=true; autoHorizon(); if(S.sample&&S.sample.horizon>-1){ S.horizon=Math.min(S.sample.horizon,minZoneTop()-0.015); } schedule(); renderPanel(); }
    if(a==='copy') copyQuote();
  };});
  b.querySelectorAll('[data-type]').forEach(function(x){x.onclick=function(){S.type=x.getAttribute('data-type');renderPanel();};});
  b.querySelectorAll('[data-fam]').forEach(function(x){x.onclick=function(){S.fam=x.getAttribute('data-fam');renderPanel();};});
  b.querySelectorAll('[data-p]').forEach(function(x){x.onclick=function(){ applyProduct(x.getAttribute('data-p'),true); };});
  var q=$('#q',b); if(q) q.oninput=function(){ S.q=q.value; var pos=q.selectionStart; renderPanel(); var n=$('#q'); n.focus(); try{n.setSelectionRange(pos,pos);}catch(e){} };
  var on=function(id,f){ var i=$('#'+id,b); if(i) i.oninput=function(){ rangeVal(i); f(+i.value,i); }; };
  on('r-brush',function(v,i){ S.brush=v; i.parentNode.querySelector('label span').textContent=v+' px'; });
  on('r-hz',function(v,i){ S.horizon=sliderToHz(v); S.horizonAuto=false; i.parentNode.querySelector('label span').textContent='Horizon at '+Math.round(S.horizon*100)+'%'; schedule(); });
  on('r-scale',function(v,i){ var z=Z(); z.scale=Math.pow(2,-v/60); i.parentNode.querySelector('label span').textContent=(z.scale<1?'Larger':'Smaller')+' \u00b7 '+Math.round(100/z.scale)+'%'; schedule(); });
  on('r-rot',function(v,i){ Z().rot=v; i.parentNode.querySelector('label span').textContent=v+'\u00b0'; schedule(); });
  on('r-shadow',function(v,i){ S.shadow=v/100; i.parentNode.querySelector('label span').textContent=v+'%'; schedule(); });
  on('r-feather',function(v,i){ S.feather=v; i.parentNode.querySelector('label span').textContent=v; schedule(); });
  var cf=$('#c-flat',b); if(cf) cf.onchange=function(){ S.flat=cf.checked; if(!S.flat&&S.horizon<-1){ S.horizonAuto=true; autoHorizon(); } schedule(); renderPanel(); };
  b.querySelectorAll('[data-zf]').forEach(function(i){ i.oninput=function(){ var z=S.zones[+i.getAttribute('data-zi')]; z[i.getAttribute('data-zf')]=i.type==='number'?i.value:i.value; updateEstimate(); }; i.onchange=i.oninput; });
  b.querySelectorAll('[data-lw]').forEach(function(x){x.onclick=function(){ var z=S.zones[+x.getAttribute('data-lw')]; z.useLW=!z.useLW; renderPanel(); };});
  var zp=$('#q-zip',b); if(zp) zp.oninput=function(){S.zip=zp.value; updateEstimate();};
  var dt=$('#q-date',b); if(dt) dt.oninput=function(){S.date=dt.value; updateEstimate();};
}

/* ------------------------------------------------------------------ products */
function applyProduct(id,fromGallery){
  var p=PBY[id]; if(!p) return false;
  if(!S.img){ loadSample(0,function(){ useSuggested(id); goStep('look'); toast(p.name+' in an ABC yard photo'); }); return true; }
  var z=Z(); if(!z||!(z.closed&&(z.pts.length>2||z.strokes.length))){ if(S.sample){ useSuggested(id); z=Z(); } else { toast('Outline an area first, then pick '+p.name); goStep('mark'); return false; } }
  pushHist(); z.product=id; z.dens=null; loadRock(id,function(){schedule();}); schedule(); renderPanel(); drawOverlay();
  if(!fromGallery){ goStep('look'); }
  return true;
}

/* ------------------------------------------------------------------ estimate */
function zoneArea(z){ if(z.useLW){ var l=parseFloat(z.L),w=parseFloat(z.Wd); return (l>0&&w>0)?l*w:0; } var a=parseFloat(z.area); return a>0?a:0; }
function calc(z){ var p=z.product&&PBY[z.product]; var dk=z.dens||(p?p.dens:'ds'); var t=DENS[dk].t; var A=zoneArea(z), d=parseFloat(z.depth)||0;
  var cuft=A*d/12, yd=r2(cuft/27), tons=r2(yd*t); return {p:p,dk:dk,t:t,A:A,d:d,cuft:cuft,yd:yd,tons:tons,ok:A>0&&d>0}; }
function fmt(n){ return (Math.round(n*100)/100).toLocaleString('en-US',{maximumFractionDigits:2}); }
function estimateHTML(){
  var h='<div class="ph"><h2>Estimate</h2><span class="est-tag">Estimate</span></div>';
  h+='<p class="help">Enter the real size of each area. The math uses ABC\u2019s own published weights (tons per cubic yard), the same ones in ABC\u2019s online calculator.</p>';
  var zs=S.zones.filter(function(z){return z.closed;});
  if(!zs.length) h+='<p class="help">Outline an area first.</p>';
  S.zones.forEach(function(z,i){ if(!z.closed) return; var c=calc(z);
    h+='<div class="card" style="--zc:'+z.color+'"><h3><span class="zsw" style="'+(c.p?'background-image:url(sw/'+c.p.id+'.jpg)':'background:'+z.color+'44')+'"></span>'+esc(z.name)+(c.p?' \u00b7 '+esc(c.p.name):'')+'</h3>';
    h+='<div class="inputs">';
    if(z.useLW){ h+='<div class="inp"><label>Length</label><div class="unit"><input type="number" inputmode="decimal" min="0" step="any" data-zi="'+i+'" data-zf="L" value="'+esc(z.L)+'" placeholder="20"><span>ft</span></div></div><div class="inp"><label>Width</label><div class="unit"><input type="number" inputmode="decimal" min="0" step="any" data-zi="'+i+'" data-zf="Wd" value="'+esc(z.Wd)+'" placeholder="15"><span>ft</span></div></div>'; }
    else h+='<div class="inp"><label>Area</label><div class="unit"><input type="number" inputmode="decimal" min="0" step="any" data-zi="'+i+'" data-zf="area" value="'+esc(z.area)+'" placeholder="300"><span>sq ft</span></div></div>';
    h+='<div class="inp"><label>Depth</label><div class="unit"><input type="number" inputmode="decimal" min="0" step="any" data-zi="'+i+'" data-zf="depth" value="'+esc(z.depth)+'"><span>in</span></div></div>';
    h+='<div class="inp" style="grid-column:1/-1"><label>Material weight (ABC published)</label><select data-zi="'+i+'" data-zf="dens">'+Object.keys(DENS).map(function(k){return '<option value="'+k+'"'+(c.dk===k?' selected':'')+'>'+DENS[k].l+' \u00b7 '+DENS[k].t+' t/yd\u00b3</option>';}).join('')+'</select></div>';
    h+='</div><button type="button" class="lw-toggle" data-lw="'+i+'">'+(z.useLW?'Enter square feet instead':'Enter length \u00d7 width instead')+'</button>';
    h+='<div id="calc-'+i+'"></div></div>'; });
  h+='<div id="est-total"></div>';
  h+='<div class="callout"><div class="t">Call ABC for a quote: '+PHONE+'</div><p>ABC doesn\u2019t publish prices online. Call the yard or bring this summary to the counter in Phoenix. Next-day delivery across the Valley, 1 to 24 tons per truck.</p><a class="btn copper block" href="tel:'+PHONE_TEL+'"><svg viewBox="0 0 24 24"><path d="M6 3h3l2 5l-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>Call '+PHONE+'</a></div>';
  h+='<div class="card"><h3>Request a quote</h3><div class="inputs"><div class="inp"><label>Delivery ZIP (optional)</label><input id="q-zip" inputmode="numeric" maxlength="10" value="'+esc(S.zip)+'" placeholder="85009"></div><div class="inp"><label>Preferred date (optional)</label><input id="q-date" type="date" value="'+esc(S.date)+'"></div></div>';
  h+='<p class="fine" style="margin:10px 0 8px">Copy this and text, email or read it to ABC. Nothing is sent from this page.</p><textarea class="quote-text" id="quote" readonly></textarea><div class="row mt"><button type="button" class="btn sand grow" data-act="copy">Copy summary</button></div></div>';
  h+='<p class="fine">All results are estimates only. Material weight is estimated from ABC\u2019s published average densities; actual weight may vary with moisture and compaction. Sources: abcsandrock.com product calculator and terms.</p>';
  setTimeout(updateEstimate,0); return h;
}
function updateEstimate(){ var total=0, any=false;
  S.zones.forEach(function(z,i){ var box=$('#calc-'+i); if(!box) return; var c=calc(z);
    if(!c.ok){ box.innerHTML='<p class="fine" style="margin:10px 0 0">Enter the '+(z.useLW?'length and width':'area')+' to see cubic yards and tons.</p>'; return; }
    any=true; total+=c.tons;
    box.innerHTML='<div class="math">'+(z.useLW?fmt(parseFloat(z.L))+' ft \u00d7 '+fmt(parseFloat(z.Wd))+' ft = '+fmt(c.A)+' sq ft\n':'')+fmt(c.A)+' sq ft \u00d7 '+fmt(c.d)+' in \u00f7 12 = '+fmt(c.cuft)+' cu ft\n'+fmt(c.cuft)+' cu ft \u00f7 27 = '+fmt(c.yd)+' cu yd\n'+fmt(c.yd)+' cu yd \u00d7 '+c.t+' t/yd\u00b3 = '+fmt(c.tons)+' tons</div><div class="big"><div><span>Cubic yards</span><b>'+fmt(c.yd)+'</b></div><div><span>Tons (est.)</span><b>'+fmt(c.tons)+'</b></div></div>'; });
  var t=$('#est-total'); if(t){ total=r2(total);
    var note=!any?'':total<1?'ABC\u2019s delivery minimum is one ton. Smaller amounts: ask about pickup at the Phoenix retail store.':total>24?'That\u2019s more than one truck: ABC\u2019s single loads go up to 24 tons.':'Fits in one ABC delivery (1 to 24 tons per truck).';
    t.innerHTML=any&&S.zones.filter(function(z){return calc(z).ok;}).length>1?'<div class="card"><h3>Total</h3><div class="big" style="margin-top:0"><div><span>All zones (est.)</span><b>'+fmt(total)+' tons</b></div></div><p class="fine" style="margin:10px 0 0">'+note+'</p></div>':(any?'<p class="fine" style="margin:-4px 0 12px">'+note+'</p>':''); }
  var q=$('#quote'); if(q) q.value=quoteText(); }
function quoteText(){ var L=['ABC Sand & Rock \u2014 Quote request','(from the Yard Visualizer preview)','']; var total=0,n=0;
  S.zones.forEach(function(z){ if(!z.closed) return; var c=calc(z); L.push(z.name+': '+(c.p?c.p.name+' ('+CATL[c.p.cat]+')':'material not chosen yet'));
    if(c.ok){ L.push('  '+fmt(c.A)+' sq ft at '+fmt(c.d)+' in deep = '+fmt(c.yd)+' cu yd \u2248 '+fmt(c.tons)+' tons (est.)'); total+=c.tons; n++; } else L.push('  Size: not entered yet'); });
  if(n>1) L.push('','Estimated total: '+fmt(r2(total))+' tons');
  L.push('','Delivery ZIP: '+(S.zip||'________'),'Preferred date: '+(S.date||'________'),'','Estimates use ABC\u2019s published densities; actual weight varies with moisture and compaction.','Call ABC for a quote: '+PHONE);
  return L.join('\n'); }
function copyText(s,ok){ var done=function(){toast(ok||'Copied');}; if(navigator.clipboard&&window.isSecureContext){ navigator.clipboard.writeText(s).then(done,function(){fallback();}); } else fallback();
  function fallback(){ var t=el('textarea',{style:'position:fixed;opacity:0'}); t.value=s; document.body.appendChild(t); t.select(); try{document.execCommand('copy');done();}catch(e){toast('Select the text and copy it');} t.remove(); } }
function copyQuote(){ copyText(quoteText(),'Quote summary copied'); }

/* ------------------------------------------------------------------ save image */
$('#btn-save').onclick=function(){
  render(); var c=document.createElement('canvas'); c.width=S.W; c.height=S.H; var x=c.getContext('2d'); x.drawImage(cvG,0,0);
  var names=[]; S.zones.forEach(function(z){ if(z.product&&z.hasArea&&names.indexOf(PBY[z.product].name)<0) names.push(PBY[z.product].name); });
  var u=Math.max(1,S.W/1200), pad=14*u; x.font='700 '+(17*u)+'px Georgia, serif'; var t1='ABC Sand & Rock'; var t2=names.join(' + ');
  x.font='700 '+(17*u)+'px Georgia, serif'; var w1=x.measureText(t1).width; x.font='500 '+(13*u)+'px -apple-system, Helvetica, Arial, sans-serif'; var w2=x.measureText(t2).width;
  var bw=Math.max(w1,w2)+pad*2+12*u, bh=58*u, bx=pad, by=S.H-bh-pad;
  x.fillStyle='rgba(11,16,24,.78)'; roundRect(x,bx,by,bw,bh,10*u); x.fill(); x.fillStyle='#C8642B'; x.fillRect(bx,by+10*u,4*u,bh-20*u);
  x.fillStyle='#FBF5EA'; x.font='700 '+(17*u)+'px Georgia, serif'; x.textBaseline='alphabetic'; x.fillText(t1,bx+pad+4*u,by+25*u);
  x.fillStyle='#E9D8B8'; x.font='500 '+(13*u)+'px -apple-system, Helvetica, Arial, sans-serif'; x.fillText(t2,bx+pad+4*u,by+45*u);
  x.font='500 '+(11*u)+'px -apple-system, Helvetica, Arial, sans-serif'; x.textAlign='right'; x.fillStyle='rgba(251,245,234,.8)'; x.fillText('Visualization \u00b7 preview by JayCo',S.W-pad,S.H-pad); x.textAlign='left';
  var fn='abc-yard-visualizer-'+(S.zones[0]&&S.zones[0].product||'yard')+'.png';
  c.toBlob(function(b){ var a=el('a',{download:fn}); a.href=URL.createObjectURL(b); document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},4000); toast('Image saved'); },'image/png');
};
function roundRect(x,a,b,w,h,r){ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }

/* ------------------------------------------------------------------ boot */
$('#app').classList.add('empty');
var hasGL=initGL(); if(!hasGL) console.info('2D fallback');
renderSteps(); renderPanel(); layout();
if(window.ResizeObserver) new ResizeObserver(function(){layout();}).observe(stage);
window.VIZ={ applyProduct:applyProduct, hasPhoto:function(){return !!S.img;}, products:PRODUCTS, byId:PBY,
  activeProduct:function(){var z=Z();return z&&z.product;}, totals:function(){ return S.zones.map(function(z){var c=calc(z);return {name:z.name,product:c.p&&c.p.name,tons:c.ok?c.tons:null,yd:c.ok?c.yd:null};}); },
  state:S, loadSample:loadSample, goStep:goStep, setCompare:setCompare, render:render, gl:function(){return !!gl;} };
})();
