import { R, clamp01, mobile } from './core.js';
function tile(ox, oy, bw, bh, seed) {
  const aw = Math.min(bw, bh * 1.45), ah = aw / 1.45; ox += (bw - aw) / 2; oy += (bh - ah) / 2;
  const cx = ox + aw / 2, s = Math.max(4, aw / 22), p = [];
  const st = { x: cx - aw * 0.17, y: oy + ah * 0.03, w: aw * 0.34, h: Math.max(2, ah * 0.07) };
  const f = [ox + aw * 0.3, oy + ah * 0.2, ox + aw * 0.7, oy + ah * 0.66], fm = (f[1] + f[3]) / 2, ecy = oy + ah * 0.42;
  let i = seed * 1000;
  for (let y = f[1]; y < f[3]; y += s) for (let x = f[0]; x < f[2]; x += s) { i++; p.push({ x, y, sec: (y > fm ? 2 : 0) + (x > cx ? 1 : 0), ph: R(i) * 6.283 }); }
  for (let k = 0; k < 3; k++) {
    const g = 0.68 + k * 0.14, rx = aw * 0.5 * g, ry = ah * 0.58 * g, n = Math.floor(Math.PI * rx / s * 1.2);
    for (let j = 0; j <= n && n > 0; j++) { const a = (-0.18 + j / n * 1.36) * Math.PI; i++; p.push({ x: cx + Math.cos(a) * rx, y: ecy + Math.sin(a) * ry, sec: a > 0.72 * Math.PI ? 4 : (a > 0.28 * Math.PI ? 5 : 6), ph: R(i) * 6.283 }); }
  }
  for (const q of p) q.d = Math.hypot(q.x - cx, q.y - st.y) / aw;
  const pr = Array.from({ length: 7 }, (_, k) => 0.25 + 0.75 * R(seed * 11 + k * 3.1));
  return { p, st, s, pr };
}
// 10 × 3 on desktop, 5 × 6 on mobile
export const learn = (cols, rows) => ({
  build(w, h) {
    const c = cols || (mobile() ? 5 : 10), r = rows || (mobile() ? 6 : 3);
    const tw = w / c, th = h / r, T = [];
    for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) T.push(tile(i * tw + 10, j * th + 8, tw - 20, th - 16, j * c + i + 1));
    return T;
  },
  frame(ctx, w, h, t, T) {
    const cnt = Math.min(T.length, Math.floor((t % 14) * 3) + 1);
    for (let m = 0; m < cnt; m++) {
      const o = T[m];
      ctx.fillStyle = '#000'; ctx.fillRect(o.st.x, o.st.y, o.st.w, o.st.h);
      for (const q of o.p) {
        const e = clamp01(o.pr[q.sec] * (0.65 + 0.35 * Math.sin(q.d * 18 - t * 2.5 + q.ph * 0.5)));
        const g = Math.round(210 * (1 - e)), r = o.s * (0.12 + 0.22 * e);
        ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
      }
    }
  }
});
