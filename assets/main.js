/* Replace each remaining # with the final resource URL when it is ready. */
const resourceLinks = { paper: 'https://arxiv.org/pdf/2610.39278', arxiv: 'https://arxiv.org/pdf/2610.39278', code: 'https://github.com/worldflow-rbs/worldflow', data: '#', model: '#' };
let toastTimer;
document.querySelectorAll('[data-resource]').forEach(link => {
  const resource = link.dataset.resource;
  link.href = resourceLinks[resource];
  link.addEventListener('click', event => {
    if (resourceLinks[resource] !== '#') return;
    event.preventDefault();
    const toast = document.querySelector('.toast');
    toast.textContent = `${{ paper: 'Paper', arxiv: 'arXiv', code: 'Code', data: 'Data', model: 'Model' }[resource]} link coming soon.`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
  });
});

// The composed background loops silently without on-page controls.
const heroVideo = document.querySelector('.hero-video');
function resumeBackground() {
  if (!document.hidden) heroVideo.play().catch(() => {});
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) heroVideo.pause();
  else resumeBackground();
});
resumeBackground();
