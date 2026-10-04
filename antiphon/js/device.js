// labels(w, h) returns { labelX, labelY[] } from the callout list, or { mobile: true }.
export const device = labels => ({
  build: (w, h) => labels(w, h),
  frame(ctx, w, h, t, L) {
    const mob = !!L.mobile;
    const cx = mob ? w / 2 : Math.min(430, w * 0.3), cy = h / 2;
    const R0 = mob ? Math.min(w * 0.42, h * 0.45) : Math.min(290, h * 0.45, cx - 4, L.labelX - 60 - cx), S = R0 * 0.655;
    const lv = 0.55 + 0.3 * Math.sin(t * 1.1) + 0.1 * Math.sin(t * 2.9);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#bfbfbf'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R0 - 24, 0, 6.283); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, S, 0, 6.283); ctx.fill();
    ctx.lineWidth = 14; ctx.strokeStyle = '#1c1c1c'; ctx.beginPath(); ctx.arc(cx, cy, S - 50, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, S - 50, -Math.PI / 2, -Math.PI / 2 + lv * 6.283); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '500 30px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('live', cx, cy);
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4); ctx.beginPath(); ctx.arc(cx, cy - S + 28, 6, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx - 20 + i * 20, cy - R0 + 12, 3, 0, 6.283); ctx.fill(); }
    if (mob) return;   // on mobile the callouts stack under the device, with no hairlines
    // the charging point sits above the screen point, so the lines keep the order of the callouts and never cross
    const pts = [[cx, cy - R0 + 12], [cx + R0 * 0.7, cy - R0 * 0.7], [cx + R0, cy], [cx + R0 * 0.87, cy + R0 * 0.5], [cx + S * 0.5, cy + S * 0.87]];
    ctx.strokeStyle = '#bfbfbf'; ctx.lineWidth = 1;
    pts.forEach((p, i) => {
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(L.labelX - 30, L.labelY[i]); ctx.lineTo(L.labelX, L.labelY[i]); ctx.stroke();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 6.283); ctx.fill();
    });
  }
});
