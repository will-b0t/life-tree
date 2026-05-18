// ── panels.js ────────────────────────────────────────────────
// The pros / cons panels that flank a selected node + the small
// summary dots that appear on unselected nodes.
// ─────────────────────────────────────────────────────────────

function buildPanel(nid, type) {
  const p = document.createElement('div');
  p.className = `side-panel ${type}`;
  const h = document.createElement('div');
  h.className = 'panel-header';
  h.textContent = type === 'pros' ? '✦ pros' : '✕ cons';
  const il = document.createElement('div');
  il.className = 'panel-items';
  const ab = document.createElement('button');
  ab.className = 'panel-add-btn';
  ab.textContent = '+ add';
  ab.addEventListener('mousedown', e => e.stopPropagation());
  ab.addEventListener('click', e => {
    e.stopPropagation();
    recordHistory();
    nodes[nid].procon[type].push('');
    renderPanel(nid, type);
    scheduleSave();
    // Focus the new row so the user can type immediately.
    const items = p.querySelectorAll('.panel-item-text');
    if (items.length) items[items.length - 1].focus();
  });
  p.appendChild(h); p.appendChild(il); p.appendChild(ab);
  return p;
}

function renderPanel(nid, type) {
  const n = nodes[nid];
  if (!n) return;
  const panel = type === 'pros' ? n.prosPanel : n.consPanel;
  const il = panel.querySelector('.panel-items');
  il.innerHTML = '';
  n.procon[type].forEach((txt, idx) => {
    const row = document.createElement('div');
    row.className = 'panel-item';
    const dot = document.createElement('div');
    dot.className = 'panel-item-dot';
    const te = document.createElement('div');
    te.className = 'panel-item-text';
    te.contentEditable = 'true';
    te.textContent = txt;
    te.dataset.placeholder = type === 'pros' ? 'a pro…' : 'a con…';
    // Record once per edit session — focus marks the start of typing.
    te.addEventListener('focus', () => recordHistory());
    te.addEventListener('input', () => {
      n.procon[type][idx] = te.textContent;
      updateDots(nid);
      scheduleSave();
    });
    te.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); te.blur(); }
    });
    te.addEventListener('mousedown', e => e.stopPropagation());
    te.addEventListener('click', e => e.stopPropagation());
    const rm = document.createElement('button');
    rm.className = 'panel-item-remove';
    rm.textContent = '✕';
    rm.addEventListener('mousedown', e => e.stopPropagation());
    rm.addEventListener('click', e => {
      e.stopPropagation();
      recordHistory();
      n.procon[type].splice(idx, 1);
      renderPanel(nid, type);
      updateDots(nid);
      scheduleSave();
    });
    row.appendChild(dot); row.appendChild(te); row.appendChild(rm);
    il.appendChild(row);
  });
  updateDots(nid);
}

function updateDots(nid) {
  const n = nodes[nid];
  if (!n) return;
  n.sumEl.innerHTML = '';
  n.procon.pros.filter(t => t.trim()).forEach(() => {
    const d = document.createElement('div');
    d.className = 'summary-dot pro';
    n.sumEl.appendChild(d);
  });
  n.procon.cons.filter(t => t.trim()).forEach(() => {
    const d = document.createElement('div');
    d.className = 'summary-dot con';
    n.sumEl.appendChild(d);
  });
}
