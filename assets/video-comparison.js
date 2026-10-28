'use strict';
(() => {
  const data=document.getElementById('result-video-data');if(!data)return;
  const cases=JSON.parse(data.textContent),dialog=document.querySelector('.result-video-dialog');
  let dialogGroup=null;
  const groups=[...document.querySelectorAll('.video-dataset')].map(el=>({el,cases:cases.filter(c=>c.source===el.dataset.source),index:0,videos:[...el.querySelectorAll('video')],loaded:false,near:false,visible:false,pausedByUser:false,playing:false,time:0,initialized:new Set(),generation:0}));
  const byEl=new Map(groups.map(g=>[g.el,g]));
  function allowed(g){return !g.el.hidden&&!document.hidden&&!dialog.open&&g.visible&&!g.pausedByUser;}
  function pause(g){g.videos.forEach(v=>v.pause());g.playing=false;g.el.querySelector('.video-play').textContent='Play';}
  function play(g){
    if(!g.loaded||!allowed(g)||g.videos.some(v=>v.readyState<2))return;
    const t=g.videos[0].currentTime,gen=g.generation;
    g.videos.slice(1).forEach(v=>{if(Math.abs(v.currentTime-t)>.065)v.currentTime=t;});
    Promise.all(g.videos.map(v=>v.play())).then(()=>{
      if(gen!==g.generation)return;
      if(!allowed(g)){pause(g);return;}g.playing=true;g.el.querySelector('.video-play').textContent='Pause';g.el.querySelector('.video-loading').textContent='';
    }).catch(e=>{if(gen===g.generation&&e.name!=='AbortError'){pause(g);g.el.querySelector('.video-loading').textContent='Press Play to start';}});
  }
  function load(g){
    if(g.el.hidden||g.loaded)return;g.loaded=true;g.initialized.clear();g.el.querySelector('.video-loading').textContent='Loading…';
    const c=g.cases[g.index];
    g.videos.forEach(v=>{v.muted=true;v.preload='auto';v.poster=c.posters[v.dataset.kind];v.src=c.videos[v.dataset.kind];v.load();});
  }
  function unload(g){
    if(!g.loaded)return;g.time=g.videos[0].currentTime;g.loaded=false;g.generation++;pause(g);g.initialized.clear();
    g.videos.forEach(v=>{v.preload='none';v.removeAttribute('src');v.load();});g.el.querySelector('.video-loading').textContent='';
  }
  function seek(g,t){g.time=t;g.videos.forEach(v=>{if(v.readyState>=1)v.currentTime=Math.min(t,Math.max(0,v.duration-.01));});}
  function sync(g){
    if(!g.loaded)return;const t=g.videos[0].currentTime;g.time=t;
    if(g.playing)g.videos.slice(1).forEach(v=>{if(v.readyState>=2&&Math.abs(v.currentTime-t)>.09)v.currentTime=t;});
    g.el.querySelector('.video-timeline').value=t;g.el.querySelector('.video-time').textContent=`${Math.min(48,Math.floor(t*16))} / 48`;
  }
  function show(g,index,focus=false){
    unload(g);g.index=Math.max(0,Math.min(index,g.cases.length-1));g.time=0;g.pausedByUser=false;
    const c=g.cases[g.index];g.el.dataset.caseId=c.id;
    g.el.querySelector('.video-instruction').textContent=c.instruction;
    const a=g.el.querySelector('.video-input');a.href=c.input;a.querySelector('img').src=c.input;
    g.videos.forEach(v=>{v.dataset.src=c.videos[v.dataset.kind];v.dataset.poster=c.posters[v.dataset.kind];v.poster=c.posters[v.dataset.kind];});
    const dots=[...g.el.querySelectorAll('.video-dot')];dots.forEach((b,i)=>{b.setAttribute('aria-current',String(i===g.index));b.tabIndex=i===g.index?0:-1;});
    g.el.querySelector('.video-position').textContent=`${g.index+1} / ${g.cases.length}`;
    g.el.querySelector('.video-prev').disabled=g.index===0;g.el.querySelector('.video-next').disabled=g.index===g.cases.length-1;
    g.el.querySelector('.video-timeline').value=0;g.el.querySelector('.video-time').textContent='0 / 48';
    if(g.near||g.visible)load(g);
    const strip=g.el.querySelector('.video-dots'),active=dots[g.index];
    strip.scrollLeft=Math.max(0,active.offsetLeft-strip.offsetLeft-strip.clientWidth/2+active.offsetWidth/2);
    if(focus)active.focus({preventScroll:true});
  }
  for(const g of groups){
    g.el.querySelector('.video-prev').onclick=()=>show(g,g.index-1);
    g.el.querySelector('.video-next').onclick=()=>show(g,g.index+1);
    g.el.querySelectorAll('.video-dot').forEach((b,i)=>b.onclick=()=>show(g,i,true));
    g.el.querySelector('.video-dots').onkeydown=e=>{
      const index={ArrowLeft:g.index-1,ArrowRight:g.index+1,Home:0,End:g.cases.length-1}[e.key];
      if(index!==undefined){e.preventDefault();show(g,index,true);}
    };
    for(const v of g.videos){
      v.addEventListener('loadeddata',()=>{
        if(!g.loaded)return;
        if(!g.initialized.has(v)){g.initialized.add(v);if(g.time>0)v.currentTime=Math.min(g.time,v.duration-.01);}
        if(g.videos.every(x=>x.readyState>=2)){g.el.querySelector('.video-loading').textContent='';play(g);}
      });
      v.addEventListener('canplay',()=>{if(g.loaded&&g.videos.every(x=>x.readyState>=2)){g.el.querySelector('.video-loading').textContent='';if(!g.playing)play(g);}});
      v.addEventListener('error',()=>{if(g.loaded){pause(g);g.el.querySelector('.video-loading').textContent='Video could not load. Press Play to retry.';}});
    }
    g.videos[0].addEventListener('timeupdate',()=>sync(g));
    g.videos[0].addEventListener('waiting',()=>g.videos.slice(1).forEach(v=>v.pause()));
    g.videos[0].addEventListener('playing',()=>{if(allowed(g))g.videos.slice(1).forEach(v=>{if(v.paused)v.play().catch(()=>{});});});
    g.el.querySelector('.video-play').onclick=()=>{
      if(g.playing){g.pausedByUser=true;pause(g);}else{g.pausedByUser=false;g.visible=true;if(g.videos.some(v=>v.error))unload(g);load(g);play(g);}
    };
    g.el.querySelector('.video-timeline').oninput=e=>{load(g);seek(g,Number(e.target.value));sync(g);};
    g.el.querySelectorAll('.video-expand').forEach(b=>b.onclick=()=>{
      dialogGroup=g;groups.forEach(pause);const c=g.cases[g.index],kind=b.dataset.kind;
      dialog.querySelector('h4').textContent=`${c.dataset} · ${g.index+1} / ${g.cases.length} · ${{comparison:'Flow comparison',joint:'WorldFlow RGB + flow',gt:'Ground truth video + flow'}[kind]}`;
      const v=dialog.querySelector('video');v.src=c.videos[kind];v.muted=true;v.onloadedmetadata=()=>{v.currentTime=Math.min(g.time,v.duration-.01);v.play().catch(()=>{});};
      dialog.showModal();document.body.classList.add('result-video-open');
    });
    let touch=null;
    g.el.querySelector('.video-comparison-layout').addEventListener('touchstart',e=>{touch=[e.touches[0].clientX,e.touches[0].clientY];},{passive:true});
    g.el.querySelector('.video-comparison-layout').addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)*1.8)show(g,g.index+(dx<0?1:-1));touch=null;},{passive:true});
    show(g,0);
  }
  const tabs=[...document.querySelectorAll('.dataset-tabs [role="tab"]')];
  function selectDataset(index,focus=false){
    groups.forEach((g,i)=>{g.el.hidden=i!==index;if(i!==index)unload(g);});
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
    if(focus)tabs[index].focus({preventScroll:true});
    tabs[index].scrollIntoView({block:'nearest',inline:'nearest'});
  }
  tabs.forEach((tab,i)=>{
    tab.onclick=()=>selectDataset(i);
    tab.onkeydown=e=>{const next={ArrowLeft:(i+tabs.length-1)%tabs.length,ArrowRight:(i+1)%tabs.length,Home:0,End:tabs.length-1}[e.key];if(next!==undefined){e.preventDefault();selectDataset(next,true);}};
  });
  function selectFromHash(){const index=groups.findIndex(g=>'#'+g.el.id===location.hash);if(index>=0)selectDataset(index);}
  window.addEventListener('hashchange',selectFromHash);selectFromHash();
  const near=new IntersectionObserver(entries=>entries.forEach(e=>{const g=byEl.get(e.target);g.near=e.isIntersecting;g.near?load(g):unload(g);}),{rootMargin:'500px'});
  const visible=new IntersectionObserver(entries=>entries.forEach(e=>{const g=byEl.get(e.target);g.visible=e.isIntersecting;if(g.visible){load(g);play(g);}else pause(g);}),{threshold:.12});
  groups.forEach(g=>{near.observe(g.el);visible.observe(g.el);});
  document.addEventListener('visibilitychange',()=>groups.forEach(g=>document.hidden?pause(g):play(g)));
  dialog.querySelector('button').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{const v=dialog.querySelector('video');if(dialogGroup)seek(dialogGroup,v.currentTime);v.pause();v.removeAttribute('src');v.load();document.body.classList.remove('result-video-open');dialogGroup=null;groups.forEach(play);});
})();
