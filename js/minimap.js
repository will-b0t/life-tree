// ── minimap.js ───────────────────────────────────────────────
// The little overview in the bottom-right. Click to pan there.
// ─────────────────────────────────────────────────────────────

function schedMM() {
  clearTimeout(mmT);
  mmT = setTimeout(drawMM, 80);
}

function drawMM() {
  const ctx = mmCanvas.getContext('2d');
  const W = 140, H = 88;
  ctx.clearRect(0, 0, W, H);

  const ns = Object.values(nodes);
  if (!ns.length) return;

  // World bounds around all visible nodes.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  ns.forEach(n => {
    x0 = Math.min(x0, n.x - 100); y0 = Math.min(y0, n.y - 45);
    x1 = Math.max(x1, n.x + 100); y1 = Math.max(y1, n.y + 45);
  });
  const ww = Math.max(x1 - x0, 200);
  const wh = Math.max(y1 - y0, 200);
  const p = 7;
  const scl = Math.min((W - p * 2) / ww, (H - p * 2) / wh);
  const ox = p - x0 * scl;
  const oy = p - y0 * scl;

  // Edges first (under the node dots).
  edgeArr.forEach(e => {
    const f = nodes[e.from], t = nodes[e.to];
    if (!f || !t) return;
    if (f.wrapper.classList.contains('subtree-hidden') ||
        t.wrapper.classList.contains('subtree-hidden')) return;
    ctx.beginPath();
    ctx.moveTo(f.x * scl + ox, f.y * scl + oy);
    ctx.lineTo(t.x * scl + ox, t.y * scl + oy);
    ctx.strokeStyle = (f.canon && t.canon) ? '#c87c3e' : '#b8ad9e';
    ctx.lineWidth = (f.canon && t.canon) ? 1.5 : .8;
    ctx.stroke();
  });

  // Node dots.
  ns.forEach(n => {
    if (n.wrapper.classList.contains('subtree-hidden')) return;
    const mx = n.x * scl + ox, my = n.y * scl + oy;
    ctx.beginPath();
    ctx.arc(mx, my, n.canon ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = n.canon ? '#c87c3e' : '#9a8a78';
    ctx.fill();
  });

  // Viewport rectangle.
  const aw = app.clientWidth, ah = app.clientHeight;
  mmVp.style.left = Math.max(0, (-pan.x / zoom) * scl + ox) + 'px';
  mmVp.style.top  = Math.max(0, (-pan.y / zoom) * scl + oy) + 'px';
  mmVp.style.width  = Math.min(W, (aw / zoom) * scl) + 'px';
  mmVp.style.height = Math.min(H, (ah / zoom) * scl) + 'px';
}

mmEl.addEventListener('click', e => {
  e.stopPropagation();
  const r = mmEl.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  const ns = Object.values(nodes);
  if (!ns.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  ns.forEach(n => {
    x0 = Math.min(x0, n.x - 100); y0 = Math.min(y0, n.y - 45);
    x1 = Math.max(x1, n.x + 100); y1 = Math.max(y1, n.y + 45);
  });
  const ww = Math.max(x1 - x0, 200);
  const wh = Math.max(y1 - y0, 200);
  const p = 7;
  const scl = Math.min((140 - p * 2) / ww, (88 - p * 2) / wh);
  const ox = p - x0 * scl, oy = p - y0 * scl;
  pan.x = app.clientWidth / 2  - ((mx - ox) / scl) * zoom;
  pan.y = app.clientHeight / 2 - ((my - oy) / scl) * zoom;
  applyXform(true);
});
