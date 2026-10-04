// seeded pseudo-random in [0, 1)
export const R = s => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
export const clamp01 = v => Math.max(0, Math.min(1, v));
export const mobile = () => matchMedia('(max-width: 759px)').matches;

// older browsers: a plain roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}

// grey dot: g = 0 black … 255 white
export function dot(ctx, x, y, r, g) {
  g = Math.round(Math.max(0, Math.min(255, g)));
  ctx.fillStyle = `rgb(${g},${g},${g})`;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// top-down arena in a box: stage, standing floor, bowl of six tiers.
// returns points with sector (0–3 floor quadrants, 4 bowl left, 5 bowl end, 6 bowl right),
// phase, and distance from the stage normalised to arena width.
export function arena(ox, oy, bw, bh) {
  const aw = Math.min(bw, bh * 1.45), ah = aw / 1.45;
  ox += (bw - aw) / 2; oy += (bh - ah) / 2;
  const cx = ox + aw / 2, s = Math.max(5, aw / 115), p = [];
  const st = { x: cx - aw * 0.17, y: oy + ah * 0.03, w: aw * 0.34, h: ah * 0.07 };
  const f = [ox + aw * 0.3, oy + ah * 0.2, ox + aw * 0.7, oy + ah * 0.66];
  const fm = (f[1] + f[3]) / 2, ecy = oy + ah * 0.42;
  let i = 0;
  for (let y = f[1]; y < f[3]; y += s)
    for (let x = f[0]; x < f[2]; x += s) {
      i++;
      p.push({ x: x + (R(i) - 0.5) * s * 0.35, y: y + (R(i + 9) - 0.5) * s * 0.35,
               sec: (y > fm ? 2 : 0) + (x > cx ? 1 : 0), ph: R(i + 3) * Math.PI * 2 });
    }
  for (let k = 0; k < 6; k++) {
    const g = 0.66 + k * 0.065, rx = aw * 0.5 * g, ry = ah * 0.58 * g;
    const n = Math.floor(Math.PI * rx / s * 1.2);
    for (let j = 0; j <= n && n > 0; j++) {
      const a = (-0.18 + j / n * 1.36) * Math.PI; i++;
      p.push({ x: cx + Math.cos(a) * rx, y: ecy + Math.sin(a) * ry,
               sec: a > 0.72 * Math.PI ? 4 : (a > 0.28 * Math.PI ? 5 : 6), ph: R(i + 3) * Math.PI * 2 });
    }
  }
  for (const q of p) q.d = Math.hypot(q.x - cx, q.y - st.y - st.h) / aw;
  return { p, st, s, f, cx, ecy, aw, ah, fm };
}

export function stage(ctx, o) { ctx.fillStyle = '#000'; ctx.fillRect(o.st.x, o.st.y, o.st.w, o.st.h); }

// mount an animation: { build(w, h) → state, frame(ctx, w, h, t, state) }
export function mount(canvas, anim) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, state = null, running = false, raf = 0, t0 = performance.now();
  const resize = () => {
    const d = devicePixelRatio || 1, r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    state = anim.build && w && h ? anim.build(w, h) : null;
    if (reduce) draw(2000);
  };
  const draw = now => { if (!w || !h || (anim.build && !state)) return; ctx.clearRect(0, 0, w, h); anim.frame(ctx, w, h, now / 1000, state); };
  const loop = now => { draw(now - t0); if (running) raf = requestAnimationFrame(loop); };
  new ResizeObserver(resize).observe(canvas);
  resize();
  if (!reduce) new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(loop); }
    if (!e.isIntersecting) { running = false; cancelAnimationFrame(raf); }
  }).observe(canvas);
  return { resize };
}
