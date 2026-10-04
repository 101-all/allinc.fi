import { R } from './core.js';
export default {
  build(w, h) {
    const P = []; let i = 0;
    for (let x = w * 0.62; x < w - 20; x += 16)
      for (let y = h * 0.1; y < h * 0.9; y += 16) { i++; P.push([x + (R(i) - 0.5) * 6, y + (R(i + 7) - 0.5) * 6, R(i + 3) * 6.283]); }
    return P;
  },
  frame(ctx, w, h, t, P) {
    const LN = 12, y0 = h * 0.16, y1 = h * 0.84, sx = 60, ex = w * 0.6;
    ctx.fillStyle = '#000'; ctx.fillRect(20, h * 0.1, 16, h * 0.8);
    for (let i = 0; i < LN; i++) {
      const y = y0 + (y1 - y0) * i / (LN - 1);
      const u = (t * 0.3 + R(i)) % 1, v = (t * 0.3 + R(i + 50)) % 1;
      ctx.fillStyle = '#ededed'; ctx.fillRect(sx, y, ex - sx, 1);
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sx + u * (ex - sx), y - 6, 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#6b6b6b'; ctx.beginPath(); ctx.arc(ex - v * (ex - sx), y + 6, 4, 0, 6.283); ctx.fill();
    }
    for (const q of P) {
      const e = Math.pow(0.5 + 0.5 * Math.sin(t * 2.2 - q[0] * 0.012 + q[2]), 4), g = Math.round(205 * (1 - e));
      ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.beginPath(); ctx.arc(q[0], q[1], 1.4 + 2.6 * e, 0, 6.283); ctx.fill();
    }
  }
};
