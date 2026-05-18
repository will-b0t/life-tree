// ── layout.js ────────────────────────────────────────────────
// Top-down tree auto-layout. Each subtree gets horizontal space
// proportional to its leaf count, so siblings never overlap.
// ─────────────────────────────────────────────────────────────

const LAYOUT_SIBLING_GAP   = 230;  // px between sibling columns at the leaves
const LAYOUT_VERTICAL_GAP  = 170;  // px between depth levels
const LAYOUT_ROOT_GAP      = 120;  // px between separate roots

function leafCount(id) {
  const c = edgeMap[id] || [];
  if (!c.length) return 1;
  return c.reduce((s, x) => s + leafCount(x), 0);
}

function layoutNode(id, x, y) {
  const n = nodes[id];
  if (!n) return;
  n.x = x; n.y = y;
  n.wrapper.style.left = x + 'px';
  n.wrapper.style.top  = y + 'px';
  const c = edgeMap[id] || [];
  if (!c.length) return;
  const totalLeaves = c.reduce((s, x) => s + leafCount(x), 0);
  let cx = x - (totalLeaves - 1) * LAYOUT_SIBLING_GAP / 2;
  c.forEach(cid => {
    const l = leafCount(cid);
    layoutNode(
      cid,
      cx + (l - 1) * LAYOUT_SIBLING_GAP / 2,
      y + LAYOUT_VERTICAL_GAP
    );
    cx += l * LAYOUT_SIBLING_GAP;
  });
}

function autoLayout() {
  recordHistory();
  let ox = 380;
  Object.values(nodes)
    .filter(n => !n.parentId)
    .forEach(r => {
      layoutNode(r.id, ox, 120);
      ox += leafCount(r.id) * LAYOUT_SIBLING_GAP + LAYOUT_ROOT_GAP;
    });
  drawEdges();
  posLabels();
  scheduleSave();
  fit();
  showToast('layout applied');
}

// ── Auto-placement for new children ──────────────────────────
// Used when a branch is created via drag-⊕ or an AI suggestion.
// The drag/click is the user's "give me a branch" gesture — we
// decide placement so the canvas stays tidy without forcing the
// user to also do the math.
//
// Rules:
//  - No existing siblings → place directly below parent.
//  - Otherwise → walk every sibling's subtree, find the rightmost
//    x, and drop the new node one sibling-gap to the right of it.
//    This grows the tree rightward without disturbing siblings
//    that the user has already nudged into place.

function subtreeBoundsX(id, b) {
  const n = nodes[id];
  if (!n) return;
  if (n.x < b.min) b.min = n.x;
  if (n.x > b.max) b.max = n.x;
  (edgeMap[id] || []).forEach(c => subtreeBoundsX(c, b));
}

function placeNewChild(parentId) {
  const p = nodes[parentId];
  if (!p) return { x: 0, y: 0 };
  const siblings = edgeMap[parentId] || [];
  if (siblings.length === 0) {
    return { x: p.x, y: p.y + LAYOUT_VERTICAL_GAP };
  }
  let maxRight = -Infinity;
  siblings.forEach(sid => {
    const b = { min: Infinity, max: -Infinity };
    subtreeBoundsX(sid, b);
    if (b.max > maxRight) maxRight = b.max;
  });
  return { x: maxRight + LAYOUT_SIBLING_GAP, y: p.y + LAYOUT_VERTICAL_GAP };
}

document.getElementById('btn-layout').addEventListener('click', e => {
  e.stopPropagation();
  autoLayout();
});
