'use strict';
(() => {
  const root=document.querySelector('.tracking-comparison'),data=document.getElementById('tracking-comparison-data');if(!root||!data)return;
  const cases=JSON.parse(data.textContent),videos=[...root.querySelectorAll('video')],dots=[...root.querySelectorAll('.tracking-dot')];
  const playButton=root.querySelector('.tracking-play'),slider=root.querySelector('.tracking-timeline'),status=root.querySelector('.tracking-status');
  let index=0,method='t4w',visible=false,loaded=false,wantPlay=true,generation=0;
  const kind=v=>v.dataset.kind==='tracker'?method:v.dataset.kind;
  const allowed=()=>visible&&!document.hidden&&wantPlay;
  function pause(){videos.forEach(v=>v.pause());playButton.textContent='Play';}
  function play(){
    if(!loaded||!allowed()||videos.some(v=>v.readyState<3))return;
    const t=videos[0].currentTime,gen=generation;
    videos.slice(1).forEach(v=>{if(Math.abs(v.currentTime-t)>.05)v.currentTime=t});
    Promise.all(videos.map(v=>v.play())).then(()=>{if(gen!==generation)return;if(!allowed()){pause();return}playButton.textContent='Pause';status.textContent=''}).catch(e=>{if(gen===generation&&e.name!=='AbortError'){pause();status.textContent='Press Play to start'}});
  }
  function load(){if(loaded)return;loaded=true;status.textContent='Loading…';videos.forEach(v=>{v.preload='auto';v.src=cases[index].videos[kind(v)];v.load()})}
  function seek(t){load();videos.forEach(v=>{if(v.readyState>=1)v.currentTime=Math.min(t,v.duration-.01)});slider.value=t}
  function show(next){
    generation++;pause();loaded=false;index=Math.max(0,Math.min(cases.length-1,next));const c=cases[index];root.dataset.caseId=c.id;
    root.querySelector('.tracking-prompt p').textContent=c.prompt;
    videos.forEach(v=>{const key=kind(v),panel=v.closest('figure'),m=c.metrics[key];v.removeAttribute('src');v.poster=c.posters[key];v.preload='none';v.load();const metric=panel.querySelector('.tracking-metric');metric.hidden=!!c.referenceUnderReview;metric.textContent=c.referenceUnderReview?'':m?`ADE ${m.ade.toFixed(3)} m · FDE ${m.fde.toFixed(3)} m`:'Ground truth'});
    const note=root.querySelector('.tracking-case-note');note.textContent=c.note||'';note.hidden=!c.note;
    const gtLabel=c.referenceUnderReview?'GT video + reference flow':'GT video + GT flow';videos[2].closest('figure').querySelector('figcaption').textContent=gtLabel;videos[2].setAttribute('aria-label',gtLabel);
    const label=`WorldFlow video + ${method==='t4w'?'T4W':'4RC'}`;videos[0].closest('figure').querySelector('figcaption').textContent=label;videos[0].setAttribute('aria-label',label);
    dots.forEach((b,i)=>{b.setAttribute('aria-current',String(i===index));b.tabIndex=i===index?0:-1});
    root.querySelector('.tracking-prev').disabled=index===0;root.querySelector('.tracking-next').disabled=index===cases.length-1;root.querySelector('.tracking-position').textContent=`${index+1} / ${cases.length}`;slider.value=0;root.querySelector('.tracking-time').textContent='0 / 48';status.textContent='';if(visible)load();
  }
  videos.forEach(v=>{v.addEventListener('canplay',play);v.addEventListener('waiting',pause);v.addEventListener('error',()=>{if(loaded){pause();status.textContent='Video could not load'}})});
  videos[0].addEventListener('ended',()=>{seek(0);play()});
  playButton.onclick=()=>{wantPlay=!wantPlay;if(wantPlay){load();play()}else pause()};
  slider.oninput=()=>{pause();seek(Number(slider.value))};slider.onchange=play;
  root.querySelector('.tracking-prev').onclick=()=>show(index-1);root.querySelector('.tracking-next').onclick=()=>show(index+1);
  dots.forEach((b,i)=>b.onclick=()=>{show(i);b.focus({preventScroll:true})});
  root.querySelector('.tracking-dots').onkeydown=e=>{const next={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:cases.length-1}[e.key];if(next!==undefined){e.preventDefault();show(next);dots[index].focus({preventScroll:true})}};
  root.querySelector('.tracking-method').onchange=e=>{method=e.target.value;show(index)};
  let touch;root.querySelector('.tracking-panels').addEventListener('touchstart',e=>{touch=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});root.querySelector('.tracking-panels').addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)*1.8)show(index+(dx<0?1:-1));touch=null},{passive:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){load();play()}else pause()},{threshold:.08}).observe(root);
  document.addEventListener('visibilitychange',()=>document.hidden?pause():play());
  function tick(){if(loaded&&visible){const t=videos[0].currentTime;if(!videos[0].paused&&!videos[0].seeking)videos.slice(1).forEach(v=>{if(v.readyState>=3&&!v.seeking&&Math.abs(v.currentTime-t)>.09)v.currentTime=t});if(!slider.matches(':active'))slider.value=t;root.querySelector('.tracking-time').textContent=`${Math.min(48,Math.floor(t*12))} / 48`}requestAnimationFrame(tick)}
  show(0);requestAnimationFrame(tick);
})();
