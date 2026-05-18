// ── state.js ─────────────────────────────────────────────────
// All shared state and DOM references live here.
// Loaded first; every other module reads/writes these bindings
// by name (they're shared across classic <script> tags).
// ─────────────────────────────────────────────────────────────

// ── DOM references ──
const app          = document.getElementById('app');
const canvas       = document.getElementById('canvas');
const svgEl        = document.getElementById('edges');
const ghostBranch  = document.getElementById('ghost-branch');
const reparentGhost= document.getElementById('reparent-ghost');
const reparentHint = document.getElementById('reparent-hint');
const zoomInd      = document.getElementById('zoom-ind');
const toast        = document.getElementById('toast');
const gridBg       = document.getElementById('grid-bg');
const mmCanvas     = document.getElementById('mm-canvas');
const mmVp         = document.getElementById('mm-vp');
const mmEl         = document.getElementById('minimap');
const aiDrawer     = document.getElementById('ai-drawer');
const aiPreview    = document.getElementById('ai-preview');
const aiList       = document.getElementById('ai-list');
const aiLoading    = document.getElementById('ai-loading');
const aiEmpty      = document.getElementById('ai-empty');
const aiRefresh    = document.getElementById('ai-refresh');
const btnAi        = document.getElementById('btn-ai');

// ── Constants ──
// SKEY points at the currently-open tree's localStorage entry.
// It changes when the user switches trees from the library home
// screen (see js/library.js). Defaults to the legacy v4 key so
// existing single-tree users keep their data on first upgrade.
let SKEY = 'life-tree-v4';
const ZS = [.25, .33, .5, .67, .75, .9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5];

// ── Graph state ──
let nodes      = {};   // id -> node record { id, x, y, wrapper, lbl, textEl, parentId, canon, procon, collapsed, ... }
let edgeArr    = [];   // [{from, to}, ...]
let edgeMap    = {};   // adjacency: id -> [childId, ...]
let edgeLabels = {};   // "from->to" -> label string
let selected   = null;
let nodeCount  = 0;

// ── View state ──
let pan        = { x: 0, y: 0 };
let zi         = 6;
let zoom       = ZS[zi];
let scrollAcc  = 0;

// ── Async timers (for debouncing) ──
let zT  = null;  // zoom indicator hide
let svT = null;  // save debounce
let tT  = null;  // toast hide
let mmT = null;  // minimap draw

// ── Drag / interaction state ──
let isPanning  = false;
let panStart   = { x: 0, y: 0 };
let panOrig    = { x: 0, y: 0 };
let dragNode   = null;
let dragOff    = { x: 0, y: 0 };
let dragMoved  = false;
let dragBranch = false;
let branchFrom = null;
let branchLine = null;
let reparentId = null;
let dropTarget = null;

// ── Canon / AI state ──
let hasCanon = false;
let aiTarget = null;
