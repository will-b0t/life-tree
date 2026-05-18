// ── collapse.js ──────────────────────────────────────────────
// Collapse / expand subtrees. Hidden subtrees stay in state —
// they're just invisible (and their edges don't draw).
// ─────────────────────────────────────────────────────────────

function getDesc(id) {
  const r = [];
  const q = [id];
  while (q.length) {
    const c = q.shift();
    (edgeMap[c] || []).forEach(x => { r.push(x); q.push(x); });
  }
  return r;
}

function cCount(id) { return (edgeMap[id] || []).length; }

function updateLeaves() {
  Object.values(nodes).forEach(n => {
    n.wrapper.classList.toggle('leaf', cCount(n.id) === 0);
    if (n.badge) {
      const d = getDesc(n.id);
      n.badge.textContent = `${d.length} branch${d.length !== 1 ? 'es' : ''}`;
    }
  });
}

function hasCollAnc(id) {
  let c = nodes[id]?.parentId;
  while (c) {
    if (nodes[c]?.collapsed) return true;
    c = nodes[c]?.parentId;
  }
  return false;
}

function applyCollapse() {
  Object.values(nodes).forEach(n =>
    n.wrapper.classList.toggle('subtree-hidden', hasCollAnc(n.id))
  );
  posLabels();
  drawEdges();
  schedMM();
}

function toggleCollapse(id) {
  const n = nodes[id];
  if (!n || cCount(id) === 0) return;
  recordHistory();
  n.collapsed = !n.collapsed;
  n.wrapper.classList.toggle('collapsed', n.collapsed);
  const d = getDesc(id);
  if (n.badge) n.badge.textContent = `${d.length} branch${d.length !== 1 ? 'es' : ''}`;
  applyCollapse();
  scheduleSave();
  showToast(n.collapsed
    ? `${d.length} branch${d.length !== 1 ? 'es' : ''} folded`
    : 'branches expanded');
}
