/* Orthographic metric XYZ viewer. RGB comes from the observed frame;
   exported trajectories omit only initial-query geometric outliers. */
window.createRobot3D = function(host,url) {
 const canvas=document.createElement('canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label','Interactive 3D trajectories. Drag to rotate, scroll to zoom; arrow keys rotate, plus and minus zoom.');
 const bar=document.createElement('div');bar.className='flow3d-controls';
 bar.innerHTML='<button type="button" class="flow3d-toggle">Pause</button><button type="button" class="flow3d-reset">Reset view</button><label><input type="checkbox" checked class="flow3d-cloud"> Point cloud</label><label>Point size <input class="flow3d-size" type="range" min="0.5" max="3" step="0.25" value="1.25"></label><label class="flow3d-time">Time step <input type="range" min="0" value="0" step="1"><output></output></label>';
 const hint=document.createElement('p');hint.className='flow3d-hint';hint.textContent='Drag to rotate · Scroll to zoom · Shift-drag to pan';
 const status=document.createElement('p');status.className='flow3d-loading';status.textContent='Loading 3D scene…';status.setAttribute('role','status');
 host.append(canvas,hint,bar,status);
 const ctx=canvas.getContext('2d'),slider=bar.querySelector('.flow3d-time input'),output=bar.querySelector('output'),toggle=bar.querySelector('.flow3d-toggle'),cloudToggle=bar.querySelector('.flow3d-cloud'),size=bar.querySelector('.flow3d-size');
 let data=null,dead=false,running=false,localPaused=false,frame=0,last=0,raf=0,az=-Math.PI/3,el=28*Math.PI/180,zoom=1.4,pan=[0,0],drag=null,width=0,height=0,dirty=true;
 const abort=new AbortController();
 function project(a,i){const x=a[i]-data.center[0],y=a[i+1]-data.center[1],z=a[i+2]-data.center[2],s=Math.min(width,height)*.43/data.radius*zoom;
 return [width/2+pan[0]+(-Math.sin(az)*x+Math.cos(az)*y)*s,height/2+pan[1]-(-Math.sin(el)*Math.cos(az)*x-Math.sin(el)*Math.sin(az)*y+Math.cos(el)*z)*s];}
 function draw(){if(!data||dead)return;ctx.clearRect(0,0,width,height);ctx.fillStyle='#f5f8f7';ctx.fillRect(0,0,width,height);
 if(cloudToggle.checked){for(const [a,colors,fallback,alpha] of [[data.cloud,data.cloudColors,'#718e91',.5],[data.object,data.objectColors,'#38757e',.5]]){ctx.globalAlpha=alpha;const psize=Number(size.value);for(let i=0;i<a.length;i+=3){const p=project(a,i);ctx.fillStyle=colors?colors[i/3]:fallback;ctx.fillRect(p[0],p[1],psize,psize);}}}
 ctx.lineWidth=1.3;ctx.globalAlpha=.72;
 for(let t=1;t<=frame;t++)for(let n=0;n<data.N;n++){const j=t*data.N+n,i=j-data.N;if(!data.total[n])continue;const a=project(data.tracks,i*3),b=project(data.tracks,j*3);ctx.strokeStyle=data.colors[j];ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
 ctx.globalAlpha=1;ctx.fillStyle='#168fa4';for(let n=0;n<data.N;n++){const p=project(data.tracks,(frame*data.N+n)*3);ctx.beginPath();ctx.arc(...p,1.8,0,2*Math.PI);ctx.fill();}
 slider.value=frame;output.textContent=`${frame+1} / ${data.T}`;dirty=false;
 }
 function tick(now){if(dead)return;if(running&&!localPaused&&data&&now-last>=62.5){frame=(frame+1)%data.T;last=now;dirty=true;}if(dirty)draw();raf=requestAnimationFrame(tick);}
 function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);dirty=true;}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.pan){pan[0]+=dx;pan[1]+=dy;}else{az-=dx*.008;el=Math.max(-Math.PI/2,Math.min(Math.PI/2,el+dy*.008));}drag.x=e.clientX;drag.y=e.clientY;dirty=true;});
 for(const evt of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(evt,()=>drag=null);
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.3,Math.min(8,zoom*Math.exp(-e.deltaY*.001)));dirty=true;},{passive:false});
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')az-=.1;if(e.key==='ArrowRight')az+=.1;if(e.key==='ArrowUp')el=Math.min(Math.PI/2,el+.1);if(e.key==='ArrowDown')el=Math.max(-Math.PI/2,el-.1);if(e.key==='+'||e.key==='=')zoom=Math.min(8,zoom*1.1);if(e.key==='-')zoom=Math.max(.3,zoom/1.1);dirty=true;});
 toggle.onclick=()=>{localPaused=!localPaused;toggle.textContent=localPaused?'Play':'Pause';};
 bar.querySelector('.flow3d-reset').onclick=()=>{az=-Math.PI/3;el=28*Math.PI/180;zoom=1.4;pan=[0,0];dirty=true;};
 slider.oninput=()=>{frame=Number(slider.value);localPaused=true;toggle.textContent='Play';dirty=true;};cloudToggle.onchange=size.oninput=()=>dirty=true;
 fetch(url,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();}).then(buffer=>{if(dead)return;const [T,N,C,O]=new Uint32Array(buffer,0,4),meta=new Float32Array(buffer,16,4);const geometryBytes=32+(T*N+C+O)*12,hasRGB=buffer.byteLength===geometryBytes+(C+O)*3;if(!hasRGB&&buffer.byteLength!==geometryBytes)throw Error('Invalid scene');
 let offset=32;const tracks=new Float32Array(buffer,offset,T*N*3);offset+=tracks.byteLength;const cloud=new Float32Array(buffer,offset,C*3);offset+=cloud.byteLength;const object=new Float32Array(buffer,offset,O*3),arc=new Float32Array(T*N),total=new Float32Array(N),colors=[];
 for(let t=1;t<T;t++)for(let n=0;n<N;n++){const j=t*N+n,i=j-N;arc[j]=arc[i]+Math.hypot(...[0,1,2].map(k=>tracks[j*3+k]-tracks[i*3+k]));}
 for(let n=0;n<N;n++)total[n]=arc[(T-1)*N+n];
 for(let t=1;t<T;t++)for(let n=0;n<N;n++){const j=t*N+n,u=total[n]?((arc[j]+arc[j-N])/2)/total[n]:0;colors[j]=`rgb(${Math.round(Math.abs(2*u-.5)*255)},${Math.round(Math.sin(Math.PI*u)*255)},${Math.round(Math.cos(Math.PI*u/2)*255)})`;}
 let cloudColors=null,objectColors=null;if(hasRGB){const rgb=new Uint8Array(buffer,geometryBytes,(C+O)*3),allColors=Array.from({length:C+O},(_,i)=>`rgb(${rgb[i*3]},${rgb[i*3+1]},${rgb[i*3+2]})`);cloudColors=allColors.slice(0,C);objectColors=allColors.slice(C);}
 data={T,N,tracks,cloud,object,cloudColors,objectColors,center:meta.slice(0,3),radius:meta[3],total,colors};slider.max=T-1;status.remove();dirty=true;
 }).catch(error=>{if(!dead){status.textContent='Unable to load 3D data. Reload to retry.';console.error(error);}});
 raf=requestAnimationFrame(tick);
 return {play(restart=false){running=true;if(restart){frame=0;localPaused=false;toggle.textContent='Pause';dirty=true;}},pause(){running=false;},destroy(){dead=true;abort.abort();cancelAnimationFrame(raf);observer.disconnect();}};
};
