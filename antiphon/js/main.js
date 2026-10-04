import { mount, mobile } from './core.js';
import wave from './wave.js';
import loop from './loop.js';
import { device } from './device.js';
import software from './software.js';
import { foh, screen } from './live.js';
import { learn } from './learn.js';
import { cause, ab, field } from './why.js';

const $ = s => document.querySelector(s);
const dc = $('#cv-device'), ul = $('.callouts');
const deviceLabels = () => {
  if (mobile()) return { mobile: true };
  const c = dc.getBoundingClientRect(), u = ul.getBoundingClientRect();
  return { labelX: u.left - c.left - 16, labelY: [...ul.children].map(li => { const r = li.getBoundingClientRect(); return r.top + r.height / 2 - c.top; }) };
};
const mounted = [
  mount($('#cv-hero'), wave),
  mount($('#cv-loop'), loop),
  mount(dc, device(deviceLabels)),
  mount($('#cv-software'), software),
  mount($('#cv-foh'), foh),
  mount($('#cv-stage'), screen),
  mount($('#cv-learn'), learn()),
  mount($('#cv-why1'), cause),
  mount($('#cv-why2'), ab),
  mount($('#cv-why3'), field),
  mount($('#cv-close'), wave)
];
// the callouts move when the font arrives; redraw so the hairlines meet them
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => mounted.forEach(m => m.resize()));
