// ── index.js ─────────────────────────────────────────────────
// Global event wiring + boot. Loaded last.
// ─────────────────────────────────────────────────────────────

// ── Pointer / keyboard / wheel ──
app.addEventListener('mousedown', e => {
  // Only start a pan if the click landed on the bare canvas, not a child element.
  if (e.target !== app && !e.target.matches('#canvas, #edges, svg, #grid-bg')) return;
  isPanning = true;
  app.classList.add('panning');
  panStart = { x: e.clientX, y: e.clientY };
  panOrig  = { x: pan.x,     y: pan.y };
  selectNode(null);
});

window.addEventListener('mousemove', e => {
  if (reparentId) { updateReparent(e.clientX, e.clientY); return; }
  if (dragBranch) {
    ghostBranch.style.left = e.clientX + 'px';
    ghostBranch.style.top  = e.clientY + 'px';
    updBranchLine(e.clientX, e.clientY);
    return;
  }
  if (dragNode) {
    if (!dragMoved) recordHistory();   // first movement of a drag is undoable
    dragMoved = true;
    const n = nodes[dragNode];
    if (!n) return;
    const c = toCanvas(e.clientX - dragOff.x, e.clientY - dragOff.y);
    n.x = c.x; n.y = c.y;
    n.wrapper.style.left = c.x + 'px';
    n.wrapper.style.top  = c.y + 'px';
    drawEdges(); posLabels(); schedMM(); scheduleSave();
    return;
  }
  if (isPanning) {
    pan.x = panOrig.x + (e.clientX - panStart.x);
    pan.y = panOrig.y + (e.clientY - panStart.y);
    applyXform(false);
  }
});

window.addEventListener('mouseup', e => {
  if (reparentId) { endReparent(e.clientX, e.clientY); return; }
  if (dragBranch) { endBranchDrag(e.clientX, e.clientY); return; }
  if (dragNode) scheduleSave();
  dragNode = null;
  isPanning = false;
  app.classList.remove('panning');
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    selectNode(null);
    closeAI();
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') &&
      selected && !document.activeElement.isContentEditable) {
    e.preventDefault();
    recordHistory();
    delNode(selected);
  }
  // Undo / redo — only when not editing text, so the browser's
  // native contenteditable undo stack handles in-field typing.
  const mod = e.metaKey || e.ctrlKey;
  if (mod && !document.activeElement.isContentEditable) {
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault(); redo();
    }
  }
});

// Stepped zoom — accumulate small scroll deltas so trackpad inertia
// doesn't blast through five zoom levels at once.
app.addEventListener('wheel', e => {
  e.preventDefault();
  scrollAcc += e.deltaY;
  if (Math.abs(scrollAcc) >= 60) {
    stepZoom(scrollAcc > 0 ? -1 : 1, e.clientX, e.clientY);
    scrollAcc = 0;
  }
}, { passive: false });

// ── Boot ──
// We always start at the library home screen. From there the user
// picks (or creates) a tree, which sets SKEY and loads state.
loadLibrary();
showLibrary();
