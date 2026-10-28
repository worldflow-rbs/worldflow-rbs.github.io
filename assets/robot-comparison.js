(() => {
 const root=document.querySelector('#robot-categories');if(!root)return;
 const cases=JSON.parse(document.querySelector('#robot-comparison-data').textContent),groups=[];
 function play(g,restart=false){g.viewers.forEach(v=>v.play(restart));for(const v of g.videos){if(!v.src){v.src=v.dataset.src;v.load();}if(restart)v.currentTime=0;v.play().catch(()=>{});}}
 function pause(g){g.viewers.forEach(v=>v.pause());g.videos.forEach(v=>v.pause());}
 function badge(c,m,kind){const result=c.outcomes[kind][m],b=document.createElement('span');b.className=`robot-outcome ${result}`;b.textContent=`${kind==='robot_execution'?'Execution':'Flow'}: ${result==='success'?'✓ Success':'✕ Failure'}`;return b;}

 function panel(g,c,m,kind,title){
  const fig=document.createElement('figure');fig.className=`robot-panel robot-${kind}`;
  const cap=document.createElement('figcaption');cap.textContent=title;
  if(kind!=='generated')cap.append(badge(c,m,kind==='execution'?'robot_execution':'flow_prediction'));
  if(kind==='cloud'){const view=document.createElement('div');view.className='flow3d';fig.append(cap,view);g.viewers.push(window.createRobot3D(view,c.models[m].cloud));return fig;}
  const v=document.createElement('video');v.dataset.src=c.models[m][kind];v.muted=true;v.loop=true;v.playsInline=true;v.controls=true;v.preload='none';v.setAttribute('aria-label',`${c.id} ${m==='worldflow'?'WorldFlow':'μ₀'} ${title}`);
  if(kind==='overlay')v.poster=c.models[m].overlay_poster;
  if(kind==='cloud')v.poster=c.models[m].cloud_poster;
  v.addEventListener('canplay',()=>{if(g.visible&&!g.paused&&!document.hidden)v.play().catch(()=>{});});
  v.addEventListener('error',()=>{if(v.hasAttribute('src'))g.status.textContent='Unable to load a video.';});
  fig.append(cap,v);g.videos.push(v);return fig;
 }
 function show(g,index){
  pause(g);g.viewers.forEach(v=>v.destroy());g.viewers=[];for(const v of g.videos){v.removeAttribute('src');v.load();}g.videos=[];
  g.index=Math.max(0,Math.min(index,g.cases.length-1));const c=g.cases[g.index];g.stage.replaceChildren();g.status.textContent='';
  g.info.textContent=`Task ${String(c.task).padStart(2,'0')} · Trial ${c.trial}`;g.prompt.textContent=c.prompt;
  g.stage.className=`robot-stage ${g.mode}`;
  if(g.mode==='execution'){
   for(const m of ['worldflow','mu0']){
    const col=document.createElement('div');col.className='robot-method';const header=document.createElement('h5');header.textContent=m==='worldflow'?'WorldFlow':'μ₀';col.append(header,panel(g,c,m,'execution','Robot execution'),panel(g,c,m,'overlay','2D flow prediction'));g.stage.append(col);
   }
  }else{
   const flow=document.createElement('div');flow.className='robot-cloud-pair';
   for(const m of ['worldflow','mu0']){const fig=panel(g,c,m,'cloud',`${m==='worldflow'?'WorldFlow':'μ₀'} · 3D flow prediction`);flow.append(fig);}
   g.stage.append(flow,panel(g,c,'worldflow','generated','WorldFlow · generated video'));
  }
  g.dots.forEach((b,i)=>{b.setAttribute('aria-current',String(i===g.index));b.tabIndex=i===g.index?0:-1;});g.prev.disabled=g.index===0;g.next.disabled=g.index===g.cases.length-1;g.count.textContent=`${g.index+1} / ${g.cases.length}`;
  if(g.visible&&!g.paused)play(g);
 }
 for(const [i,name] of ['Pick and Place','Stacking','Relative Placement'].entries()){
  const section=document.createElement('section');section.className='robot-category';section.id=`real-robot-${i+1}`;
  section.innerHTML='<header class="robot-category-heading"><h4></h4><span>4 tasks · 12 trials</span></header><div class="robot-view-switch" role="group"><button type="button" data-robot-view="generation" aria-pressed="true">3D flow + generated video</button><button type="button" data-robot-view="execution" aria-pressed="false">Robot execution + 2D flow</button></div><div class="robot-case"><span class="robot-trial-id"></span><p></p></div><div class="robot-stage"></div><div class="robot-playback"><button type="button" class="robot-pause">Pause</button><button type="button" class="robot-replay">Replay all views</button><span class="robot-status" role="status"></span></div><nav class="video-carousel"><button type="button" class="video-prev">←</button><div class="video-dots"></div><button type="button" class="video-next">→</button><span class="video-position" aria-live="polite"></span></nav>';
  section.querySelector('h4').textContent=name;section.querySelector('.robot-view-switch').setAttribute('aria-label',`${name} visualization`);section.querySelector('nav').setAttribute('aria-label',`${name} robot trials`);
  const g={el:section,cases:cases.filter(c=>c.category===name),index:0,mode:'generation',paused:false,visible:false,videos:[],viewers:[],dots:[],stage:section.querySelector('.robot-stage'),info:section.querySelector('.robot-trial-id'),prompt:section.querySelector('.robot-case p'),status:section.querySelector('.robot-status'),prev:section.querySelector('.video-prev'),next:section.querySelector('.video-next'),count:section.querySelector('.video-position')};
  g.prev.setAttribute('aria-label',`Previous ${name} robot trial`);g.next.setAttribute('aria-label',`Next ${name} robot trial`);
  g.cases.forEach((c,j)=>{const b=document.createElement('button');b.className='video-dot';b.type='button';b.setAttribute('aria-label',`${name} robot task ${c.task} trial ${c.trial}`);b.title=`Task ${c.task} · Trial ${c.trial}`;b.onclick=()=>show(g,j);g.dots.push(b);section.querySelector('.video-dots').append(b);});
  g.prev.onclick=()=>show(g,g.index-1);g.next.onclick=()=>show(g,g.index+1);
  section.querySelector('.video-dots').onkeydown=e=>{const n={ArrowLeft:g.index-1,ArrowRight:g.index+1,Home:0,End:g.cases.length-1}[e.key];if(n!==undefined){e.preventDefault();show(g,n);g.dots[g.index].focus();}};
  section.querySelectorAll('[data-robot-view]').forEach(b=>b.onclick=()=>{g.mode=b.dataset.robotView;section.querySelectorAll('[data-robot-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));show(g,g.index);});
  const toggle=section.querySelector('.robot-pause');toggle.onclick=()=>{g.paused=!g.paused;toggle.textContent=g.paused?'Play':'Pause';if(g.paused)pause(g);else play(g);};
  section.querySelector('.robot-replay').onclick=()=>{g.paused=false;toggle.textContent='Pause';play(g,true);};
  root.append(section);groups.push(g);show(g,0);
 }
 const lookup=new Map(groups.map(g=>[g.el,g]));
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{const g=lookup.get(e.target);g.visible=e.isIntersecting;if(g.visible&&!g.paused&&!document.hidden)play(g);else pause(g);}),{threshold:.1});groups.forEach(g=>observer.observe(g.el));
 document.addEventListener('visibilitychange',()=>groups.forEach(g=>{if(!document.hidden&&g.visible&&!g.paused)play(g);else pause(g);}));
})();
