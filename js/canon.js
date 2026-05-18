// ── canon.js ─────────────────────────────────────────────────
// The canon path: marks the root→node chain you intend to pursue,
// fades everything off-path, leaves direct children of the canon
// frontier ("candidates") at full opacity. Decanonize from a leaf
// strips just that node; decanonize from mid-chain clears all.
// ─────────────────────────────────────────────────────────────

function updateFade() {
  if (!hasCanon) {
    Object.values(nodes).forEach(n =>
      n.wrapper.classList.remove('faded', 'candidate')
    );
    return;
  }
  // Canon leaves = canon nodes with no canon children.
  const canonLeaves = new Set();
  Object.values(nodes).forEach(n => {
    if (!n.canon) return;
    if (!(edgeMap[n.id] || []).some(c => nodes[c]?.canon)) {
      canonLeaves.add(n.id);
    }
  });
  // Candidates = direct children of canon leaves that aren't themselves canon.
  const candidates = new Set();
  canonLeaves.forEach(lid =>
    (edgeMap[lid] || []).forEach(c => {
      if (!nodes[c]?.canon) candidates.add(c);
    })
  );
  Object.values(nodes).forEach(n => {
    n.wrapper.classList.remove('faded', 'candidate');
    if (n.canon) return;
    n.wrapper.classList.add(candidates.has(n.id) ? 'candidate' : 'faded');
  });
}

function canonize(id) {
  recordHistory();
  // Clear any existing canon, then mark the root→id chain.
  Object.values(nodes).forEach(n => {
    n.canon = false;
    n.wrapper.classList.remove('canon');
    n.lbl.textContent = n.parentId ? 'branch' : 'origin';
  });
  let c = id;
  while (c) {
    const n = nodes[c];
    if (!n) break;
    n.canon = true;
    n.wrapper.classList.add('canon');
    n.lbl.textContent = n.parentId ? '✦ canon' : '✦ origin';
    c = n.parentId;
  }
  hasCanon = true;
  updateFade();
  drawEdges();
  posLabels();
  scheduleSave();
}

function decanon(id) {
  const n = nodes[id];
  if (!n || !n.canon) return;
  recordHistory();
  const canonChildren = (edgeMap[id] || []).filter(c => nodes[c]?.canon);
  if (canonChildren.length === 0 && n.parentId) {
    // Leaf decanon: strip just this node.
    n.canon = false;
    n.wrapper.classList.remove('canon');
    n.lbl.textContent = 'branch';
  } else {
    // Mid-chain or root: clear the entire canon.
    Object.values(nodes).forEach(nd => {
      nd.canon = false;
      nd.wrapper.classList.remove('canon');
      nd.lbl.textContent = nd.parentId ? 'branch' : 'origin';
    });
    hasCanon = false;
  }
  updateFade();
  drawEdges();
  posLabels();
  scheduleSave();
  showToast('canon cleared ↺');
}
