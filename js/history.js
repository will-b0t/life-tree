// ── history.js ───────────────────────────────────────────────
// Undo / redo via state snapshots. Before any user-initiated
// mutation, the caller invokes recordHistory(); on Cmd/Ctrl-Z
// we pop the last snapshot and rebuild the tree from it.
//
// Snapshots are JSON strings of the same shape serializeTree()
// produces. Equality is therefore cheap string comparison —
// rapid duplicate records (e.g., refocus → record → refocus)
// collapse into a single history entry.
// ─────────────────────────────────────────────────────────────

const HISTORY_LIMIT = 80;
let historyStack = [];
let redoStack    = [];
let suspendHistory = false;  // guard during undo/redo apply

function _snapshotNow() {
  // Use serializeTree() from export.js (same payload, plus _meta we ignore).
  return JSON.stringify(serializeTree());
}

function recordHistory() {
  if (suspendHistory) return;
  const snap = _snapshotNow();
  if (historyStack.length &&
      historyStack[historyStack.length - 1] === snap) return;
  historyStack.push(snap);
  while (historyStack.length > HISTORY_LIMIT) historyStack.shift();
  redoStack.length = 0;
}

function _applySnapshot(snapStr) {
  suspendHistory = true;
  try {
    applyTreeState(JSON.parse(snapStr));
    scheduleSave();
  } finally {
    suspendHistory = false;
  }
}

function undo() {
  if (!historyStack.length) { showToast('nothing to undo'); return; }
  redoStack.push(_snapshotNow());
  _applySnapshot(historyStack.pop());
  showToast('undone ↩');
}

function redo() {
  if (!redoStack.length) { showToast('nothing to redo'); return; }
  historyStack.push(_snapshotNow());
  _applySnapshot(redoStack.pop());
  showToast('redone ↪');
}
