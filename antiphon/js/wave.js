import { arena, dot, stage, clamp01 } from './core.js';
export default {
  build: (w, h) => arena(0, 0, w, h),
  frame(ctx, w, h, t, o) {
    for (const q of o.p) {
      let e = Math.pow(0.5 + 0.5 * Math.sin(q.d * 26 - t * 2.4 + q.ph * 0.3), 3);
      e = clamp01(0.06 + 0.94 * e * (0.75 + 0.25 * Math.sin(t * 0.7)));
      dot(ctx, q.x, q.y, o.s * (0.13 + 0.27 * e), 205 * (1 - e));
    }
    stage(ctx, o);
  }
};
