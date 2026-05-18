// ── nodes.js ─────────────────────────────────────────────────
// Node lifecycle: build, create, select, edit, delete + the
// drag-to-branch interaction that hangs off the ⊕ handle.
// ─────────────────────────────────────────────────────────────

function buildNode(id, x, y, text, parentId, canon, procon, lblText, collapsed) {
  // ── Wrapper ──
  const w = document.createElement('div');
  w.className =
    'node-wrapper' +
    ((!parentId) ? ' root' : '') +
    (canon ? ' canon' : '') +
    (collapsed ? ' collapsed' : '');
  w.dataset.id = id;
  w.style.cssText =
    `position:absolute;transform:translate(-50%,-50%);left:${x}px;top:${y}px`;

  // ── Pros panel (left) ──
  const pp = buildPanel(id, 'pros');

  // ── Node card ──
  const nc = document.createElement('div');
  nc.className = 'node';

  const lbl = document.createElement('div');
  lbl.className = 'node-label';
  lbl.textContent = lblText || (parentId ? 'branch' : 'origin');

  const te = document.createElement('div');
  te.className = 'node-text';
  te.textContent = text || (parentId ? 'a new path unfolds…' : 'the story begins…');

  const se = document.createElement('div');
  se.className = 'node-procon-summary';

  const badge = document.createElement('div');
  badge.className = 'collapsed-badge';
  badge.textContent = '0 branches';

  // ── Action pill ──
  const ab = document.createElement('div');
  ab.className = 'node-action-bar';
  const mkBtn = (emoji, cls, title, fn) => {
    const b = document.createElement('button');
    b.className = 'action-btn' + (cls ? ' ' + cls : '');
    b.title = title;
    b.textContent = emoji;
    b.addEventListener('click', ev => { ev.stopPropagation(); fn(); });
    b.addEventListener('mousedown', ev => ev.stopPropagation());
    return b;
  };
  ab.appendChild(mkBtn('✏️', '',            'Edit',                () => { recordHistory(); startEdit(id); }));
  ab.appendChild(mkBtn('✦',  '',            'AI suggest',          () => openAI(id)));
  ab.appendChild(mkBtn('▾',  'btn-collapse','Collapse subtree',    () => toggleCollapse(id)));
  ab.appendChild(mkBtn('▸',  'btn-expand',  'Expand subtree',      () => toggleCollapse(id)));
  ab.appendChild(mkBtn('◆',  'btn-canonize','Canonize path',       () => canonize(id)));
  ab.appendChild(mkBtn('↺',  'btn-decanon', 'Remove from canon',   () => decanon(id)));
  ab.appendChild(mkBtn('✕',  '',            'Delete node',         () => { recordHistory(); delNode(id); }));

  // ── Handles ──
  const rph = document.createElement('div');
  rph.className = 'reparent-handle';
  rph.title = 'drag to re-parent';
  rph.textContent = '↕';
  rph.addEventListener('mousedown', e => {
    e.stopPropagation(); e.preventDefault();
    startReparent(id, e.clientX, e.clientY);
  });

  const bh = document.createElement('div');
  bh.className = 'branch-handle';
  bh.textContent = '⊕';
  bh.title = 'drag to create branch';
  bh.addEventListener('mousedown', e => {
    e.stopPropagation(); e.preventDefault();
    startBranchDrag(id, e.clientX, e.clientY);
  });

  nc.appendChild(ab);
  nc.appendChild(rph);
  nc.appendChild(lbl);
  nc.appendChild(te);
  nc.appendChild(se);
  nc.appendChild(badge);
  nc.appendChild(bh);

  // ── Cons panel (right) ──
  const cp = buildPanel(id, 'cons');

  w.appendChild(pp);
  w.appendChild(nc);
  w.appendChild(cp);
  canvas.appendChild(w);

  // ── Drag-to-move on the node body ──
  nc.addEventListener('mousedown', e => {
    if (e.target === bh || e.target === rph ||
        e.target.tagName === 'BUTTON' || e.target.isContentEditable) return;
    e.stopPropagation();
    dragNode = id; dragMoved = false;
    const r = nc.getBoundingClientRect();
    dragOff.x = e.clientX - (r.left + r.width / 2);
    dragOff.y = e.clientY - (r.top  + r.height / 2);
  });
  nc.addEventListener('click', e => {
    if (e.target === bh || e.target === rph ||
        e.target.tagName === 'BUTTON' || e.target.isContentEditable) return;
    if (!dragMoved) selectNode(id);
  });

  // ── Register in state ──
  const pc = procon || { pros: [], cons: [] };
  nodes[id] = {
    id, x, y,
    wrapper: w, nodeCard: nc,
    lbl, textEl: te, sumEl: se, badge,
    prosPanel: pp, consPanel: cp,
    parentId,
    canon: canon || false,
    procon: pc,
    collapsed: collapsed || false,
  };
  renderPanel(id, 'pros');
  renderPanel(id, 'cons');

  // If a label existed for the incoming edge, materialize it.
  if (parentId) {
    const k = ekey(parentId, id);
    if (edgeLabels[k]) ensureLabel(parentId, id);
  }
}

function mkNode(x, y, text, parentId) {
  const id = 'n' + (++nodeCount);
  buildNode(id, x, y, text, parentId, false, { pros: [], cons: [] }, null, false);
  if (parentId) {
    edgeArr.push({ from: parentId, to: id });
    if (!edgeMap[parentId]) edgeMap[parentId] = [];
    edgeMap[parentId].push(id);
  }
  updateLeaves();
  applyCollapse();
  drawEdges();
  posLabels();
  schedMM();
  scheduleSave();
  return id;
}

function selectNode(id) {
  if (selected) nodes[selected]?.wrapper.classList.remove('selected');
  selected = id;
  if (id) nodes[id]?.wrapper.classList.add('selected');
}

// startEdit is a low-level "enter edit mode" — it does NOT record
// history. Callers that are user-initiated (the ✏️ action pill)
// record before calling. The drag-create flow doesn't, since the
// pre-create snapshot already captures the right "before".
function startEdit(id) {
  const n = nodes[id];
  if (!n) return;
  n.textEl.contentEditable = 'true';
  n.textEl.focus();
  const r = document.createRange();
  r.selectNodeContents(n.textEl);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(r);
  n.textEl.addEventListener('blur', () => {
    n.textEl.contentEditable = 'false';
    if (!n.textEl.textContent.trim()) n.textEl.textContent = 'a new path unfolds…';
    scheduleSave();
  }, { once: true });
  n.textEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); n.textEl.blur(); }
    e.stopPropagation();
  });
}

function delNode(id) {
  if (Object.keys(nodes).length === 1) return;  // never delete the last node
  // Recursively delete children first.
  (edgeMap[id] || []).slice().forEach(c => delNode(c));
  // Drop any edge labels touching this node.
  Object.keys(edgeLabels)
    .filter(k => k.startsWith(id + '->') || k.endsWith('->' + id))
    .forEach(k => {
      delete edgeLabels[k];
      document.querySelector(`.edge-label-wrap[data-key="${k}"]`)?.remove();
    });
  edgeArr = edgeArr.filter(e => e.from !== id && e.to !== id);
  if (nodes[id]?.parentId) {
    const op = nodes[id].parentId;
    edgeMap[op] = (edgeMap[op] || []).filter(c => c !== id);
  }
  delete edgeMap[id];
  nodes[id]?.wrapper.remove();
  delete nodes[id];
  if (selected === id) selected = null;
  if (aiTarget === id) closeAI();
  hasCanon = Object.values(nodes).some(n => n.canon);
  updateLeaves();
  applyCollapse();
  updateFade();
  drawEdges();
  posLabels();
  schedMM();
  scheduleSave();
}

// ── Branch drag ──────────────────────────────────────────────
// Drag the ⊕ handle to a blank spot on the canvas; on release,
// a new child node is planted there.

function startBranchDrag(fromId, cx, cy) {
  if (nodes[fromId]?.collapsed) toggleCollapse(fromId);
  dragBranch = true; branchFrom = fromId;
  app.classList.add('dragging-branch');
  ghostBranch.style.display = 'block';
  ghostBranch.style.left = cx + 'px';
  ghostBranch.style.top  = cy + 'px';
  branchLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  branchLine.setAttribute('fill', 'none');
  branchLine.setAttribute('stroke', '#4a6a5a');
  branchLine.setAttribute('stroke-width', '1.5');
  branchLine.setAttribute('stroke-dasharray', '6 4');
  branchLine.setAttribute('opacity', '.6');
  svgEl.appendChild(branchLine);
  updBranchLine(cx, cy);
}

function updBranchLine(cx, cy) {
  if (!branchLine || !branchFrom) return;
  const f = nodes[branchFrom];
  if (!f) return;
  const x1 = f.x, y1 = f.y + 38;
  const c = toCanvas(cx, cy);
  const m = (y1 + c.y) / 2;
  branchLine.setAttribute('d', `M${x1},${y1} C${x1},${m} ${c.x},${m} ${c.x},${c.y}`);
}

function endBranchDrag(cx, cy) {
  if (!dragBranch) return;
  dragBranch = false;
  app.classList.remove('dragging-branch');
  ghostBranch.style.display = 'none';
  if (branchLine) { branchLine.remove(); branchLine = null; }
  // The drop position confirms intent — auto-place so the canvas
  // stays readable. User can still drag the node body afterwards
  // if they want to fine-tune.
  recordHistory();
  const pos = placeNewChild(branchFrom);
  const newId = mkNode(pos.x, pos.y, '', branchFrom);
  selectNode(newId);
  setTimeout(() => startEdit(newId), 60);
  branchFrom = null;
}
