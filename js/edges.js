// ── edges.js ─────────────────────────────────────────────────
// SVG edge rendering + the small contenteditable edge labels that
// can be added by double-clicking near a connector.
// ─────────────────────────────────────────────────────────────

function ekey(f, t) { return `${f}->${t}`; }

function eMid(f, t) {
  const a = nodes[f], b = nodes[t];
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function posLabels() {
  document.querySelectorAll('.edge-label-wrap').forEach(el => {
    const f = el.dataset.from, t = el.dataset.to;
    const mid = eMid(f, t);
    if (!mid) return;
    el.style.left = mid.x + 'px';
    el.style.top  = mid.y + 'px';
    el.classList.toggle('canon-edge', !!(nodes[f]?.canon && nodes[t]?.canon));
    const hidden =
      nodes[f]?.wrapper.classList.contains('subtree-hidden') ||
      nodes[t]?.wrapper.classList.contains('subtree-hidden') ||
      nodes[f]?.collapsed;
    el.style.display = hidden ? 'none' : '';
  });
}

function ensureLabel(f, t) {
  const k = ekey(f, t);
  if (document.querySelector(`.edge-label-wrap[data-key="${k}"]`)) return;
  const w = document.createElement('div');
  w.className = 'edge-label-wrap';
  w.dataset.from = f; w.dataset.to = t; w.dataset.key = k;
  const l = document.createElement('div');
  l.className = 'edge-label';
  l.contentEditable = 'true';
  l.dataset.placeholder = '+ label';
  l.textContent = edgeLabels[k] || '';
  // Record once per edit session — focus marks the start of typing.
  l.addEventListener('focus', () => recordHistory());
  l.addEventListener('input', () => {
    edgeLabels[k] = l.textContent;
    scheduleSave();
  });
  l.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); l.blur(); }
  });
  l.addEventListener('mousedown', e => e.stopPropagation());
  l.addEventListener('click', e => e.stopPropagation());
  w.appendChild(l);
  canvas.appendChild(w);
  const mid = eMid(f, t);
  if (mid) { w.style.left = mid.x + 'px'; w.style.top = mid.y + 'px'; }
}

svgEl.addEventListener('dblclick', e => {
  e.stopPropagation();
  const c = toCanvas(e.clientX, e.clientY);
  // Pick the nearest edge midpoint within ~50px.
  let best = null, bd = 50;
  edgeArr.forEach(edge => {
    const mid = eMid(edge.from, edge.to);
    if (!mid) return;
    const d = Math.hypot(mid.x - c.x, mid.y - c.y);
    if (d < bd) { bd = d; best = edge; }
  });
  if (best) {
    ensureLabel(best.from, best.to);
    posLabels();
    setTimeout(() => {
      document.querySelector(
        `.edge-label-wrap[data-key="${ekey(best.from, best.to)}"] .edge-label`
      )?.focus();
    }, 50);
  }
});

function drawEdges() {
  // Clear existing edges (but spare the branch-drag preview line).
  Array.from(svgEl.querySelectorAll('path')).forEach(p => {
    if (p !== branchLine) p.remove();
  });
  edgeArr.forEach(edge => {
    const f = nodes[edge.from], t = nodes[edge.to];
    if (!f || !t) return;
    if (f.wrapper.classList.contains('subtree-hidden') ||
        t.wrapper.classList.contains('subtree-hidden')) return;
    if (f.collapsed) return;
    const isCanon     = f.canon && t.canon;
    const toCandidate = f.canon && !t.canon;
    const isFaded     = hasCanon && !isCanon && !toCandidate;
    const x1 = f.x, y1 = f.y + 38;
    const x2 = t.x, y2 = t.y - 38;
    const cy = (y1 + y2) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', isCanon ? '#c87c3e' : '#9a8a78');
    path.setAttribute('stroke-width', isCanon ? '2.5' : '1');
    path.setAttribute('stroke-dasharray', isCanon ? '' : '4 5');
    path.setAttribute('opacity', isFaded ? '.45' : isCanon ? '1' : toCandidate ? '.6' : '.55');
    svgEl.insertBefore(path, svgEl.firstChild);
  });
  posLabels();
  schedMM();
}
