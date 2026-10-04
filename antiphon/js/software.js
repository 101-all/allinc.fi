import { arena, dot, stage, clamp01, mobile } from './core.js';
const lv = t => clamp01(0.55 + 0.28 * Math.sin(t * 0.7) + 0.12 * Math.sin(t * 1.9));
const CN = ['energy', 'hold', 'spread', 'response', 'recovery'];
const F = '"Helvetica Neue", Arial, sans-serif';
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

function room(ctx, t, o, L) {
  for (const q of o.p) {
    const e = clamp01(L * (0.62 + 0.38 * Math.sin(q.d * 22 - t * 3 + q.ph * 0.4)) * (1 - 0.08 * q.sec));
    dot(ctx, q.x, q.y, o.s * (0.13 + 0.27 * e), 205 * (1 - e));
  }
  stage(ctx, o);
}
function set(ctx, t, X1, XR, gy0, gy1, N) {
  const gw = (XR - X1) * 0.82;
  ctx.fillStyle = '#e6e6e6'; ctx.fillRect(X1, gy1, XR - X1, 1);
  ctx.fillStyle = '#ededed'; ctx.beginPath(); ctx.moveTo(X1, gy1);
  for (let i = 0; i < N; i++) ctx.lineTo(X1 + i / (N - 1) * gw, gy1 - lv(t - (N - 1 - i) * 0.1) * (gy1 - gy0));
  ctx.lineTo(X1 + gw, gy1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < N; i++) { const x = X1 + i / (N - 1) * gw, y = gy1 - lv(t - (N - 1 - i) * 0.1) * (gy1 - gy0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  ctx.fillStyle = '#000'; ctx.fillRect(X1 + gw, gy0 - 8, 2, gy1 - gy0 + 8);
  ctx.fillStyle = '#bfbfbf';
  for (let i = 1; i < 7; i++) ctx.fillRect(X1 + (((i * 2.9 - t * 0.1) % 17 + 17) % 17) / 17 * gw, gy0, 1, gy1 - gy0);
}

// the dashboard as specified, drawn at its own size
function desk(ctx, w, h, t, o) {
  const L = lv(t);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2; rr(ctx, 1, 1, w - 2, h - 2, 24); ctx.stroke();
  room(ctx, t, o, L);
  const X1 = w * 0.46, X2 = w * 0.66, XR = w - 40;
  ctx.fillStyle = '#bfbfbf'; ctx.fillRect(X1 - 28, 32, 1, h - 64);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '24px ' + F; ctx.fillStyle = '#6b6b6b'; ctx.fillText('show score', X1, 52);
  ctx.font = '600 120px ' + F; ctx.fillStyle = '#000'; ctx.fillText(String(Math.round(70 + L * 25)), X1 - 6, 150);
  ctx.font = '24px ' + F; ctx.fillStyle = '#6b6b6b'; ctx.fillText('song 07  ·  01:42:18', X1, 238);
  CN.forEach((name, i) => {
    const y = 40 + i * 48, v = clamp01(L * (0.75 + 0.25 * Math.sin(t * (0.6 + i * 0.17) + i * 2)));
    ctx.font = '500 24px ' + F; ctx.fillStyle = '#000'; ctx.fillText(name, X2, y + 8);
    ctx.fillStyle = '#ececec'; ctx.fillRect(X2 + 150, y + 4, XR - X2 - 150, 8);
    ctx.fillStyle = '#000'; ctx.fillRect(X2 + 150, y + 4, (XR - X2 - 150) * v, 8);
  });
  const gy0 = 320, gy1 = h - 70;
  ctx.font = '24px ' + F; ctx.fillStyle = '#6b6b6b'; ctx.fillText('the set', X1, gy0 - 24);
  set(ctx, t, X1, XR, gy0, gy1, 180);
}

// on a phone the same dashboard, stacked: the room on top, then score, contributors and the set
function phone(ctx, w, h, t, o) {
  const L = lv(t), X = 24, XR = w - 24, y = o.y;
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2; rr(ctx, 1, 1, w - 2, h - 2, 24); ctx.stroke();
  room(ctx, t, o, L);
  ctx.fillStyle = '#bfbfbf'; ctx.fillRect(X, y, XR - X, 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '15px ' + F; ctx.fillStyle = '#6b6b6b'; ctx.fillText('show score', X, y + 22);
  ctx.font = '600 64px ' + F; ctx.fillStyle = '#000'; ctx.fillText(String(Math.round(70 + L * 25)), X - 3, y + 68);
  ctx.font = '15px ' + F; ctx.fillStyle = '#6b6b6b'; ctx.fillText('song 07  ·  01:42:18', X, y + 112);
  CN.forEach((name, i) => {
    const ry = y + 148 + i * 30, v = clamp01(L * (0.75 + 0.25 * Math.sin(t * (0.6 + i * 0.17) + i * 2)));
    ctx.font = '500 15px ' + F; ctx.fillStyle = '#000'; ctx.fillText(name, X, ry);
    ctx.fillStyle = '#ececec'; ctx.fillRect(X + 96, ry - 3, XR - X - 96, 6);
    ctx.fillStyle = '#000'; ctx.fillRect(X + 96, ry - 3, (XR - X - 96) * v, 6);
  });
  const gy0 = y + 334;
  ctx.font = '15px ' + F; ctx.fillStyle = '#6b6b6b'; ctx.fillText('the set', X, gy0 - 16);
  set(ctx, t, X, XR, gy0, Math.max(gy0 + 40, h - 28), 120);
}

export default {
  build(w, h) {
    if (mobile()) { const aw = w - 32, ah = aw / 1.45, o = arena(16, 16, aw, ah); o.mob = true; o.y = 16 + ah + 18; return o; }
    const k = Math.min(1, w / 1200), o = arena(32, 32, (w / k) * 0.4, h / k - 64); o.k = k; return o;
  },
  frame(ctx, w, h, t, o) {
    if (o.mob) return phone(ctx, w, h, t, o);
    if (o.k < 1) { ctx.save(); ctx.scale(o.k, o.k); desk(ctx, w / o.k, h / o.k, t, o); ctx.restore(); }
    else desk(ctx, w, h, t, o);
  }
};
