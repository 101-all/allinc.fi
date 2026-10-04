import { mount } from './core.js';
import wave from './wave.js';
import loop from './loop.js';
import { device } from './device.js';
import software from './software.js';
import { foh, screen } from './live.js';
import { learn } from './learn.js';
import { cause, ab, field } from './why.js';

const $ = s => document.getElementById(s);
const mounted = [
  mount($('cv-hero'), wave), mount($('cv-loop'), loop), mount($('cv-device'), device(() => ({ mobile: true }))),
  mount($('cv-software'), software), mount($('cv-foh'), foh), mount($('cv-stage'), screen), mount($('cv-learn'), learn()),
  mount($('cv-why1'), cause), mount($('cv-why2'), ab), mount($('cv-why3'), field), mount($('cv-close'), wave)
];
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => mounted.forEach(m => m.resize()));

/* one page per screen. dots, wheel, swipe and keys step between them. */
const pages = [...document.querySelectorAll('.page')].map(p => p.id);
const dots = document.querySelector('.dots');
dots.innerHTML = pages.map(id => `<a href="#${id}" aria-label="${document.getElementById(id).getAttribute('aria-label')}"></a>`).join('');
const current = () => { const h = location.hash.slice(1); return pages.includes(h) ? h : pages[0]; };
function show() {
  const id = current();
  document.body.dataset.page = id;
  pages.forEach(p => document.getElementById(p).classList.toggle('active', p === id));
  [...dots.children].forEach((a, i) => pages[i] === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
}
function go(step) {
  const i = Math.max(0, Math.min(pages.length - 1, pages.indexOf(current()) + step));
  if (pages[i] !== current()) location.replace('#' + pages[i]);
}
addEventListener('hashchange', show);
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
  if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
  if (e.key === 'Home') go(-pages.length);
  if (e.key === 'End') go(pages.length);
});
let acc = 0, lock = 0;   /* a trackpad keeps sending events after a flick; wait until they stop */
addEventListener('wheel', e => {
  e.preventDefault();
  const now = performance.now();
  if (now < lock) { lock = Math.max(lock, now + 180); return; }
  acc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (Math.abs(acc) > 40) { go(acc > 0 ? 1 : -1); acc = 0; lock = now + 650; }
}, { passive: false });
let tx = null, ty = null;
addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
addEventListener('touchend', e => {
  if (tx === null) return;
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = ty = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 50) return;
  go(Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 1 : -1) : (dx < 0 ? 1 : -1));
}, { passive: true });
show();
