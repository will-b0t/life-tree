// ── export.js ────────────────────────────────────────────────
// Export the tree to JSON (round-trippable, the same shape we
// save to localStorage) or to a PNG (manually rendered to canvas
// for a clean, paper-flavored image). Also handles JSON import.
// ─────────────────────────────────────────────────────────────

function serializeTree() {
  return {
    _meta: {
      app: 'life-tree',
      version: 'v4',
      exportedAt: new Date().toISOString(),
    },
    nodeCount,
    hasCanon,
    pan,
    zi,
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
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function exportJSON() {
  const blob = new Blob(
    [JSON.stringify(serializeTree(), null, 2)],
    { type: 'application/json' }
  );
  downloadBlob(blob, `life-tree-${todayStamp()}.json`);
  showToast('exported · json ↓');
}

// ── PNG render ───────────────────────────────────────────────
// Manually draws the tree to an offscreen canvas. Not a pixel-
// for-pixel screenshot — it's a clean re-render that ignores
// the dot grid, paper grain, and UI chrome. The aesthetic
// (paper, ink, canon amber) is preserved.

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
}

async function exportPNG() {
  // Wait for fonts so the canvas-rendered text uses Crimson Pro / DM Mono,
  // not the fallback. Without this, a fresh page-load export looks wrong.
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch {}
  }

  const visible = Object.values(nodes)
    .filter(n => !n.wrapper.classList.contains('subtree-hidden'));
  if (!visible.length) { showToast('nothing to export'); return; }

  // World bounds (with a little headroom for node card extents).
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  visible.forEach(n => {
    x0 = Math.min(x0, n.x - 110); y0 = Math.min(y0, n.y - 55);
    x1 = Math.max(x1, n.x + 110); y1 = Math.max(y1, n.y + 80);
  });
  const pad = 80;
  const W = (x1 - x0) + pad * 2;
  const H = (y1 - y0) + pad * 2;
  const DPR = 2;  // 2x for crisp output

  const c = document.createElement('canvas');
  c.width  = W * DPR;
  c.height = H * DPR;
  const ctx = c.getContext('2d');
  ctx.scale(DPR, DPR);

  // Paper background.
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, W, H);

  // Move into world space so we can use node coordinates directly.
  ctx.translate(pad - x0, pad - y0);

  // ── Edges (under labels and nodes) ──
  edgeArr.forEach(e => {
    const f = nodes[e.from], t = nodes[e.to];
    if (!f || !t) return;
    if (f.wrapper.classList.contains('subtree-hidden') ||
        t.wrapper.classList.contains('subtree-hidden')) return;
    if (f.collapsed) return;
    const isCanon     = f.canon && t.canon;
    const toCandidate = f.canon && !t.canon;
    const isFaded     = hasCanon && !isCanon && !toCandidate;
    const ex1 = f.x, ey1 = f.y + 38;
    const ex2 = t.x, ey2 = t.y - 38;
    const cy  = (ey1 + ey2) / 2;
    ctx.beginPath();
    ctx.moveTo(ex1, ey1);
    ctx.bezierCurveTo(ex1, cy, ex2, cy, ex2, ey2);
    ctx.strokeStyle = isCanon ? '#c87c3e' : '#9a8a78';
    ctx.lineWidth   = isCanon ? 2.5 : 1;
    ctx.globalAlpha = isFaded ? 0.45 : isCanon ? 1 : toCandidate ? 0.6 : 0.55;
    ctx.setLineDash(isCanon ? [] : [4, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  });

  // ── Edge labels ──
  document.querySelectorAll('.edge-label-wrap').forEach(el => {
    if (el.style.display === 'none') return;
    const f = el.dataset.from, t = el.dataset.to;
    const label = (el.querySelector('.edge-label')?.textContent || '').trim();
    if (!label) return;
    const a = nodes[f], b = nodes[t];
    if (!a || !b) return;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const isCanon = a.canon && b.canon;
    ctx.font = '9px "DM Mono", monospace';
    const textW = ctx.measureText(label).width + 14;
    const textH = 16;
    ctx.fillStyle   = isCanon ? '#f0e6d6' : '#f5f0e8';
    ctx.strokeStyle = isCanon ? '#c87c3e' : '#ccc4b4';
    ctx.lineWidth   = 1;
    roundRect(ctx, mx - textW / 2, my - textH / 2, textW, textH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isCanon ? '#7a4f2e' : '#9a8a78';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
  });

  // ── Nodes ──
  visible.forEach(n => {
    const isCanon = n.canon;
    const isFaded = hasCanon && !isCanon;
    const nw = 190, nh = 56;
    const nx = n.x - nw / 2;
    const ny = n.y - nh / 2;
    ctx.globalAlpha = isFaded ? 0.68 : 1;

    ctx.fillStyle   = isCanon ? '#f0e6d6' : '#ede8dc';
    ctx.strokeStyle = isCanon ? '#7a4f2e' : (isFaded ? '#ccc4b4' : '#9a8a78');
    ctx.lineWidth   = isCanon ? 2 : 1.5;
    roundRect(ctx, nx, ny, nw, nh, 6);
    ctx.fill();
    ctx.stroke();

    // Small uppercase label.
    ctx.font = '9px "DM Mono", monospace';
    ctx.fillStyle = isCanon ? '#c87c3e' : (isFaded ? '#ccc4b4' : '#9a8a78');
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText((n.lbl.textContent || '').toUpperCase(), nx + 12, ny + 9);

    // Body text — Crimson Pro, wrapped to fit.
    ctx.font = (isCanon ? '600 ' : '') + '14px "Crimson Pro", Georgia, serif';
    ctx.fillStyle = isCanon ? '#7a4f2e' : (isFaded ? '#c8bfb0' : '#2a2018');
    wrapText(ctx, n.textEl.textContent || '', nx + 12, ny + 25, nw - 24, 17);

    ctx.globalAlpha = 1;
  });

  c.toBlob(blob => {
    downloadBlob(blob, `life-tree-${todayStamp()}.png`);
    showToast('exported · png ↓');
  }, 'image/png');
}

// ── Import ───────────────────────────────────────────────────
// Loads a previously-exported (or compatible) JSON file. Replaces
// the current tree wholesale, after a confirm prompt. Mirrors the
// loading half of persistence.js.

function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!d.nodes || !Array.isArray(d.nodes)) {
          throw new Error('Not a Life Tree JSON file.');
        }
        const ok = confirm(
          `Replace your current tree with the imported one? ` +
          `(${d.nodes.length} node${d.nodes.length !== 1 ? 's' : ''})`
        );
        if (!ok) return;
        recordHistory();   // imports are undoable
        closeAI();
        applyTreeState(d);
        scheduleSave();
        showToast(`imported · ${d.nodes.length} node${d.nodes.length !== 1 ? 's' : ''}`);
      } catch (err) {
        console.error(err);
        showToast('import failed · invalid file');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

// ── Menu wiring ──────────────────────────────────────────────
const shareGroup = document.getElementById('share-group');
const btnShare   = document.getElementById('btn-share');
const shareMenu  = document.getElementById('share-menu');

btnShare?.addEventListener('click', e => {
  e.stopPropagation();
  shareGroup.classList.toggle('open');
});

shareMenu?.addEventListener('click', e => {
  const a = e.target.closest('[data-action]');
  if (!a) return;
  e.stopPropagation();
  shareGroup.classList.remove('open');
  switch (a.dataset.action) {
    case 'json':   exportJSON(); break;
    case 'png':    exportPNG();  break;
    case 'import': importJSON(); break;
  }
});

// Click anywhere else closes the menu.
document.addEventListener('click', () => {
  shareGroup?.classList.remove('open');
});
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') shareGroup?.classList.remove('open');
});
