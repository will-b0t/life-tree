// ── persistence.js ───────────────────────────────────────────
// Save & load to localStorage, the transient toast, and the
// "clear everything" path. Auto-saves are debounced 800ms.
// ─────────────────────────────────────────────────────────────

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('on');
  clearTimeout(tT);
  tT = setTimeout(() => toast.classList.remove('on'), 1600);
}

function save() {
  try {
    localStorage.setItem(SKEY, JSON.stringify({
      nodeCount, hasCanon, pan, zi,
      nodes: Object.values(nodes).map(n => ({
        id: n.id, x: n.x, y: n.y,
        text: n.textEl.textContent,
        lbl: n.lbl.textContent,
        parentId: n.parentId,
        canon: n.canon,
        procon: n.procon,
        collapsed: n.collapsed,
      })),
      edges: edgeArr,
      edgeLabels,
    }));
    showToast('saved ✦');
  } catch (e) {
    showToast('save failed');
  }
}

function scheduleSave() {
  clearTimeout(svT);
  svT = setTimeout(save, 800);
}

// Shared "wipe DOM + rebuild from object" path. Used by loadState
// (from localStorage), importJSON (from a file), and applySnapshot
// (from the undo/redo stack). Does NOT save — callers decide.
function applyTreeState(d) {
  Object.values(nodes).forEach(n => n.wrapper.remove());
  document.querySelectorAll('.edge-label-wrap').forEach(e => e.remove());
  nodes = {}; edgeArr = []; edgeMap = {}; edgeLabels = {};
  selected = null;

  pan = d.pan || { x: 200, y: 60 };
  zi = d.zi ?? 6;
  zoom = ZS[zi];
  nodeCount = d.nodeCount || 0;
  hasCanon = d.hasCanon || false;
  edgeArr = d.edges || [];
  edgeLabels = d.edgeLabels || {};
  edgeMap = {};
  edgeArr.forEach(e => {
    if (!edgeMap[e.from]) edgeMap[e.from] = [];
    edgeMap[e.from].push(e.to);
  });
  (d.nodes || []).forEach(n => buildNode(
    n.id, n.x, n.y, n.text, n.parentId,
    n.canon, n.procon, n.lbl, n.collapsed || false
  ));
  updateLeaves();
  applyCollapse();
  updateFade();
  applyXform(false);
  drawEdges();
  schedMM();
}

function loadState() {
  try {
    const raw = localStorage.getItem(SKEY);
    if (!raw) return false;
    applyTreeState(JSON.parse(raw));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function clearAll() {
  if (!confirm('Clear the whole tree and start fresh?')) return;
  recordHistory();   // clear is undoable
  localStorage.removeItem(SKEY);
  Object.values(nodes).forEach(n => n.wrapper.remove());
  document.querySelectorAll('.edge-label-wrap').forEach(e => e.remove());
  nodes = {}; edgeArr = []; edgeMap = {}; edgeLabels = {};
  selected = null; nodeCount = 0; hasCanon = false;
  pan = { x: 200, y: 60 }; zi = 6; zoom = ZS[6];
  closeAI();
  applyXform(false);
  drawEdges();
  mkNode(380, 120, 'the story begins…');
  showToast('cleared');
}

// Toolbar bindings — kept here because they're persistence-flavored.
document.getElementById('btn-save').addEventListener('click', e => {
  e.stopPropagation();
  save();
});
document.getElementById('btn-clear').addEventListener('click', e => {
  e.stopPropagation();
  clearAll();
});
