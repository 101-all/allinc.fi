import { R, dot } from './core.js';
const curve = (u, k) => { const s = Math.floor(u * 4), f = u * 4 - s; return 0.3 + 0.6 * Math.pow(Math.sin(Math.PI * f), 0.7) * (0.75 + 0.25 * R(s * 3.3)) + 0.03 * Math.sin(u * 60 + k); };

// each panel is its own canvas, so it sits directly above its column at every width

// 1 known cause
export const cause = {
  frame(ctx, pw, h, t) {
    const cx = pw / 2, cy = h / 2, r = Math.min(pw, h) * 0.38, a = t * 1.2;
    ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, a - 1.1, a); ctx.stroke();
    dot(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 8, 0);
    const bw = Math.min(92, r * 1.2), bh = Math.min(20, r * 0.25);
    ctx.fillStyle = '#000'; ctx.fillRect(cx - bw / 2, cy - r - bh / 2, bw, bh);
    for (let k = 0; k < 40; k++) {
      const an = Math.PI / 2 + (R(k) - 0.5) * 0.9, rd = r + (R(k + 40) - 0.5) * 26, e = 0.5 + 0.5 * Math.sin(t * 3 + k);
      dot(ctx, cx + Math.cos(an) * rd, cy + Math.sin(an) * rd, 2 + 2 * e, 200 * (1 - e));
    }
  }
};

// 2 live a/b tests
export const ab = {
  frame(ctx, pw, h, t) {
    const X0 = 0, N = 6, y0 = Math.min(40, h * 0.09), lh = (h - 2 * y0) / N, amp = lh * 0.78, pg = Math.min(1, (t % 7) / 4);
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(X0 + pw * 0.42, y0 * 0.75, pw * 0.16, h - y0 * 1.5);
    for (let i = 0; i < N; i++) {
      const base = y0 + lh * (i + 1) - lh * 0.12, last = i === N - 1, lim = last ? pg : 1;
      ctx.strokeStyle = last ? '#000' : '#c4c4c4'; ctx.lineWidth = last ? 3 : 1.5; ctx.beginPath();
      for (let j = 0; j <= 200 * lim; j++) {
        const u = j / 200; let v = curve(u, i);
        if (last) { const wgt = Math.exp(-Math.pow((u - 0.5) / 0.05, 2)); v = v * (1 - wgt) + 0.95 * wgt; }
        const x = X0 + u * pw, y = base - v * amp; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
};

// 3 field iteration
export const field = {
  frame(ctx, pw, h, t) {
    const vw = Math.min((pw - 56) / 3, h * 0.75), X1 = (pw - 3 * vw - 48) / 2, vy = h / 2;
    for (let k = 0; k < 3; k++) {
      const bx = X1 + k * (vw + 24), bcx = bx + vw / 2;
      ctx.fillStyle = '#000'; ctx.fillRect(bcx - vw * 0.2, vy - vw * 0.62, vw * 0.4, 6);
      for (let j = 0; j < 70; j++) {
        let px, py;
        if (k === 0) { const an = -0.2 * Math.PI + R(j) * 1.4 * Math.PI, rr = vw * (0.32 + 0.16 * R(j + 9)); px = bcx + Math.cos(an) * rr; py = vy - vw * 0.1 + Math.sin(an) * rr * 0.9; }
        else if (k === 1) { px = bx + vw * 0.2 + R(j) * vw * 0.6; py = vy - vw * 0.45 + R(j + 9) * vw * 0.55; }
        else { px = bx + R(j) * vw; py = vy - vw * 0.5 + R(j + 9) * vw * 1.1; }
        const e = 0.5 + 0.5 * Math.sin(t * 2.6 + j * 0.7 + k * 2);
        dot(ctx, px, py, 1.6 + 2.2 * e, 200 * (1 - e));
      }
    }
  }
};
