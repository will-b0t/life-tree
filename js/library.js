// ── library.js ───────────────────────────────────────────────
// Multiple-trees support. The library lives at a single
// localStorage key and points at per-tree storage entries. The
// home screen is a full-page overlay that renders tree cards and
// lets you open / create / rename / delete trees.
// ─────────────────────────────────────────────────────────────

const LIBRARY_KEY = 'life-tree-library';
const LEGACY_KEY  = 'life-tree-v4';       // single-tree key from earlier versions

let library = { currentId: null, trees: [] };

const homeEl     = document.getElementById('home');
const homeGrid   = document.getElementById('home-grid');
const homeEmpty  = document.getElementById('home-empty');
const btnLibrary = document.getElementById('btn-library');

function _nowISO() { return new Date().toISOString(); }
function _genId()  { return 't' + Math.random().toString(36).slice(2, 10); }

function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) {
      library = JSON.parse(raw);
      if (!Array.isArray(library.trees)) library.trees = [];
      return;
    }
  } catch (e) { console.error('library parse failed', e); }

  library = { currentId: null, trees: [] };

  // Migration: if a legacy single-tree save exists, surface it as
  // the first tree in the library so we don't orphan the user's
  // existing work. We keep the original storage key so the data
  // doesn't need to be copied.
  if (localStorage.getItem(LEGACY_KEY)) {
    library.trees.push({
      id: _genId(),
      name: 'My Life Tree',
      storageKey: LEGACY_KEY,
      createdAt: _nowISO(),
      updatedAt: _nowISO(),
    });
  }
  saveLibrary();
}

function saveLibrary() {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch (e) {
    console.error('saveLibrary failed', e);
  }
}

function _findTree(id) {
  return library.trees.find(t => t.id === id);
}

function createTree(name) {
  const id = _genId();
  const t = {
    id,
    name: (name || '').trim() || 'Untitled',
    storageKey: `life-tree-data-${id}`,
    createdAt: _nowISO(),
    updatedAt: _nowISO(),
  };
  library.trees.unshift(t);
  saveLibrary();
  return t;
}

function deleteTreeById(id) {
  const t = _findTree(id);
  if (!t) return;
  if (!confirm(`Delete "${t.name}"? This can't be undone.`)) return;
  localStorage.removeItem(t.storageKey);
  library.trees = library.trees.filter(x => x.id !== id);
  if (library.currentId === id) library.currentId = null;
  saveLibrary();
  renderLibrary();
}

function renameTreeById(id) {
  const t = _findTree(id);
  if (!t) return;
  const n = prompt('Rename tree:', t.name);
  if (n === null) return;
  t.name = (n || '').trim() || 'Untitled';
  t.updatedAt = _nowISO();
  saveLibrary();
  renderLibrary();
}

// Flush whatever is in memory back to the currently-active tree
// before we swap storage keys. Without this, the debounced auto-
// save could fire after the swap and clobber another tree.
function _flushCurrent() {
  if (!library.currentId) return;
  clearTimeout(svT);
  // save() can throw if SKEY is stale; ignore — we're swapping anyway.
  try { save(); } catch {}
  const cur = _findTree(library.currentId);
  if (cur) { cur.updatedAt = _nowISO(); saveLibrary(); }
}

function openTreeById(id) {
  const t = _findTree(id);
  if (!t) return;

  _flushCurrent();

  // Switch storage keys + wipe in-memory state for the new tree.
  library.currentId = id;
  SKEY = t.storageKey;
  saveLibrary();

  Object.values(nodes).forEach(n => n.wrapper.remove());
  document.querySelectorAll('.edge-label-wrap').forEach(e => e.remove());
  nodes = {}; edgeArr = []; edgeMap = {}; edgeLabels = {};
  selected = null;
  nodeCount = 0;
  hasCanon = false;
  historyStack.length = 0;
  redoStack.length = 0;
  closeAI();

  // Try to load saved data; if none, plant a fresh origin node.
  if (!loadState()) {
    pan = { x: 200, y: 60 };
    zi = 6;
    zoom = ZS[zi];
    applyXform(false);
    mkNode(380, 120, 'the story begins…');
  }

  hideLibrary();
  showToast(`opened · ${t.name}`);
}

function returnToLibrary() {
  _flushCurrent();
  library.currentId = null;
  saveLibrary();
  showLibrary();
}

function showLibrary() {
  homeEl.style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  renderLibrary();
}
function hideLibrary() {
  homeEl.style.display = 'none';
  document.getElementById('app').style.display = '';
}

function renderLibrary() {
  homeGrid.innerHTML = '';
  homeEl.classList.toggle('empty', library.trees.length === 0);

  library.trees.forEach(t => homeGrid.appendChild(_buildCard(t)));

  // Always-last "+ new tree" card.
  const add = document.createElement('div');
  add.className = 'home-card home-card-new';
  add.innerHTML = `
    <div class="home-card-plus">+</div>
    <div class="home-card-newlbl">new tree</div>
  `;
  add.addEventListener('click', () => {
    const name = prompt('Name your tree:', '');
    if (name === null) return;
    const t = createTree(name);
    openTreeById(t.id);
  });
  homeGrid.appendChild(add);
}

function _buildCard(t) {
  const card = document.createElement('div');
  card.className = 'home-card';

  const name = document.createElement('div');
  name.className = 'home-card-name';
  name.textContent = t.name;

  const meta = document.createElement('div');
  meta.className = 'home-card-meta';
  const d = new Date(t.updatedAt);
  const dateStr = d.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  meta.textContent = `last edited · ${dateStr}`;

  const actions = document.createElement('div');
  actions.className = 'home-card-actions';

  const rn = document.createElement('button');
  rn.className = 'home-card-btn';
  rn.title = 'rename';
  rn.textContent = '✏';
  rn.addEventListener('click', e => { e.stopPropagation(); renameTreeById(t.id); });

  const del = document.createElement('button');
  del.className = 'home-card-btn danger';
  del.title = 'delete';
  del.textContent = '✕';
  del.addEventListener('click', e => { e.stopPropagation(); deleteTreeById(t.id); });

  actions.appendChild(rn);
  actions.appendChild(del);
  card.appendChild(name);
  card.appendChild(meta);
  card.appendChild(actions);
  card.addEventListener('click', () => openTreeById(t.id));
  return card;
}

btnLibrary?.addEventListener('click', e => {
  e.stopPropagation();
  returnToLibrary();
});
