// ── canvas.js ────────────────────────────────────────────────
// Pan / zoom transform, screen↔canvas coordinate conversion,
// fit-to-screen. The canvas itself is just a transformed <div>.
// ─────────────────────────────────────────────────────────────

function applyXform(anim) {
  if (anim) {
    canvas.classList.add('zoom-animating');
    canvas.addEventListener(
      'transitionend',
      () => canvas.classList.remove('zoom-animating'),
      { once: true }
    );
  }
  canvas.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  // Parallax the dot grid with the pan/zoom so it feels glued to the world.
  const gs = 28 * zoom;
  gridBg.style.backgroundSize = `${gs}px ${gs}px`;
  gridBg.style.backgroundPosition = `${pan.x % gs}px ${pan.y % gs}px`;
  schedMM();
}

function showZoom() {
  zoomInd.textContent = Math.round(zoom * 100) + '%';
  zoomInd.classList.add('on');
  clearTimeout(zT);
  zT = setTimeout(() => zoomInd.classList.remove('on'), 1200);
}

function stepZoom(dir, px, py) {
  const pv = zoom, pi = zi;
  zi = Math.max(0, Math.min(ZS.length - 1, zi + dir));
  if (zi === pi) return;
  zoom = ZS[zi];
  // Re-anchor pan so the zoom centers on the cursor.
  const r = app.getBoundingClientRect();
  pan.x = (px - r.left) - ((px - r.left) - pan.x) * (zoom / pv);
  pan.y = (py - r.top)  - ((py - r.top)  - pan.y) * (zoom / pv);
  applyXform(true);
  showZoom();
  scheduleSave();
}

function toCanvas(sx, sy) {
  const r = app.getBoundingClientRect();
  return {
    x: (sx - r.left - pan.x) / zoom,
    y: (sy - r.top  - pan.y) / zoom,
  };
}

function fit() {
  const ns = Object.values(nodes).filter(
    n => !n.wrapper.classList.contains('subtree-hidden')
  );
  if (!ns.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  ns.forEach(n => {
    x0 = Math.min(x0, n.x - 110); y0 = Math.min(y0, n.y - 55);
    x1 = Math.max(x1, n.x + 110); y1 = Math.max(y1, n.y + 55);
  });
  const W = app.clientWidth - (aiDrawer.classList.contains('open') ? 280 : 0);
  const H = app.clientHeight;
  const p = 80;
  const nz = Math.min((W - p * 2) / (x1 - x0), (H - p * 2) / (y1 - y0), 1.5);
  // Snap to the nearest discrete zoom step.
  let b = 0;
  ZS.forEach((z, i) => { if (Math.abs(z - nz) < Math.abs(ZS[b] - nz)) b = i; });
  zi = b; zoom = ZS[b];
  pan.x = W / 2 - ((x0 + x1) / 2) * zoom;
  pan.y = H / 2 - ((y0 + y1) / 2) * zoom;
  applyXform(true);
  showZoom();
  scheduleSave();
}

document.getElementById('btn-fit').addEventListener('click', e => {
  e.stopPropagation();
  fit();
});
