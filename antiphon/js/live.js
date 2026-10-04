import { arena, dot, stage, clamp01 } from './core.js';
const en = t => clamp01(0.55 + 0.3 * Math.sin(t * 0.9) + 0.12 * Math.sin(t * 2.3));

// front of house: the arena breathing with the room, one bowl sector deliberately quieter
export const foh = {
  build: (w, h) => arena(0, 0, w, h),
  frame(ctx, w, h, t, o) {
    const lv = en(t);
    for (const q of o.p) {
      const e = clamp01(lv * (0.6 + 0.4 * Math.sin(q.d * 22 - t * 3 + q.ph * 0.4)) * (q.sec === 6 ? 0.5 : 1));
      dot(ctx, q.x, q.y, o.s * (0.13 + 0.27 * e), 205 * (1 - e));
    }
    stage(ctx, o);
  }
};

// stage: the screen, with a level ring and a scrolling energy trace with cue ticks
export const screen = {
  frame(ctx, w, h, t) {
    const lv = en(t), SX = 1, SW = w - 2;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(SX, 8, SW, h - 16, 24); ctx.stroke();
    const rcx = SX + SW * 0.27, rcy = h / 2, rr = Math.min(SW * 0.19, h * 0.32);
    ctx.lineWidth = 16; ctx.strokeStyle = '#e6e6e6'; ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.arc(rcx, rcy, rr, -Math.PI / 2, -Math.PI / 2 + lv * 6.283); ctx.stroke();
    const gx = SX + SW * 0.52, gw = SW * 0.42, gy0 = h * 0.22, gy1 = h * 0.78, N = 120;
    ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < N; i++) { const x = gx + i / (N - 1) * gw, y = gy1 - en(t - (N - 1 - i) * 0.08) * (gy1 - gy0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = '#e6e6e6'; ctx.fillRect(gx, gy1 + 12, gw, 1);
    ctx.fillStyle = '#000';
    for (let i = 0; i < 6; i++) ctx.fillRect(gx + gw - ((t * 0.8 + i * 3.1) % 20) / 20 * gw, gy1 + 4, 2, 16);
  }
};
