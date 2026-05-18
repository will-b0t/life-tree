// ── reparent.js ──────────────────────────────────────────────
// Drag-and-drop re-parenting of a subtree onto another node.
// Cycles are guarded against (can't attach to a descendant).
// Root can't be re-parented. Edge labels follow the move.
// Any canon containing this node is cleared (re-parenting
// invalidates the existing canonical chain).
// ─────────────────────────────────────────────────────────────

function isAnc(maybeAncestor, id) {
  let c = id;
  while (c) {
    if (c === maybeAncestor) return true;
    c = nodes[c]?.parentId || null;
  }
  return false;
}

function startReparent(id, cx, cy) {
  reparentId = id;
  app.classList.add('reparenting');
  nodes[id].wrapper.classList.add('reparenting-src');
  selectNode(null);
  reparentGhost.textContent = nodes[id].textEl.textContent;
  reparentGhost.style.left = cx + 'px';
  reparentGhost.style.top  = cy + 'px';
  reparentGhost.style.display = 'block';
  reparentHint.classList.add('on');
}

function updateReparent(cx, cy) {
  reparentGhost.style.left = cx + 'px';
  reparentGhost.style.top  = cy + 'px';
  const c = toCanvas(cx, cy);
  let hit = null;
  Object.values(nodes).forEach(n => {
    if (n.id === reparentId) return;
    if (n.wrapper.classList.contains('subtree-hidden')) return;
    if (Math.abs(n.x - c.x) < 110 && Math.abs(n.y - c.y) < 55) hit = n.id;
  });
  if (dropTarget && dropTarget !== hit) {
    nodes[dropTarget]?.wrapper.classList.remove('drop-target');
  }
  dropTarget = hit;
  if (hit) nodes[hit].wrapper.classList.add('drop-target');
}

function endReparent(cx, cy) {
  if (!reparentId) return;
  const id = reparentId;
  reparentId = null;
  app.classList.remove('reparenting');
  reparentGhost.style.display = 'none';
  reparentHint.classList.remove('on');
  nodes[id]?.wrapper.classList.remove('reparenting-src');
  if (dropTarget) nodes[dropTarget].wrapper.classList.remove('drop-target');
  const newParent = dropTarget;
  dropTarget = null;

  if (!newParent || !nodes[id] || !nodes[newParent]) return;
  if (isAnc(id, newParent)) {
    showToast("can't attach to a descendant");
    return;
  }
  if (!nodes[id].parentId) {
    showToast("root can't be re-parented");
    return;
  }
  const oldParent = nodes[id].parentId;
  if (newParent === oldParent) return;

  // Re-parent is committing — record before the rewire so undo
  // restores the original parent chain.
  recordHistory();

  // Carry the edge label across, if any.
  const oldKey = ekey(oldParent, id);
  const newKey = ekey(newParent, id);
  if (edgeLabels[oldKey]) {
    edgeLabels[newKey] = edgeLabels[oldKey];
    delete edgeLabels[oldKey];
  }
  document.querySelector(`.edge-label-wrap[data-key="${oldKey}"]`)?.remove();

  // Rewire the edges.
  edgeArr = edgeArr.filter(e => !(e.from === oldParent && e.to === id));
  edgeArr.push({ from: newParent, to: id });
  edgeMap[oldParent] = (edgeMap[oldParent] || []).filter(c => c !== id);
  if (!edgeMap[newParent]) edgeMap[newParent] = [];
  edgeMap[newParent].push(id);
  nodes[id].parentId = newParent;
  nodes[id].lbl.textContent = 'branch';

  // Canon is invalidated by structural changes.
  if (nodes[id].canon) {
    Object.values(nodes).forEach(n => {
      n.canon = false;
      n.wrapper.classList.remove('canon');
      n.lbl.textContent = n.parentId ? 'branch' : 'origin';
    });
    hasCanon = false;
  }

  updateLeaves();
  applyCollapse();
  updateFade();
  drawEdges();
  posLabels();
  scheduleSave();
  showToast('re-parented ↕');
}
