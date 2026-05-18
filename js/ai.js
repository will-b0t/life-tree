// ── ai.js ────────────────────────────────────────────────────
// AI branch suggestions drawer. Currently deprioritized in the
// roadmap — the code stays so the feature is one re-enable away.
//
// Standalone use requires an API key in the fetch headers.
// Options to wire one up (when the time comes):
//   (a) prompt for it once, store in localStorage
//   (b) proxy through a tiny server
//   (c) inject via environment if deployed
// ─────────────────────────────────────────────────────────────

function getCtx(nodeId) {
  // Walk from selected node back to root to build the path.
  const path = [];
  let cur = nodeId;
  while (cur) {
    const n = nodes[cur];
    if (!n) break;
    path.unshift(n.textEl.textContent);
    cur = n.parentId;
  }
  const n = nodes[nodeId];
  const siblings = n?.parentId
    ? edgeArr
        .filter(e => e.from === n.parentId && e.to !== nodeId)
        .map(e => nodes[e.to]?.textEl.textContent)
        .filter(Boolean)
    : [];
  const children = edgeArr
    .filter(e => e.from === nodeId)
    .map(e => nodes[e.to]?.textEl.textContent)
    .filter(Boolean);
  return { path, siblings, children, nodeText: n?.textEl.textContent || '' };
}

async function fetchSugs(nodeId) {
  const { path, siblings, children, nodeText } = getCtx(nodeId);
  const sys =
    `You are a thoughtful life-planning assistant. Generate 4 evocative, ` +
    `concrete, specific branch suggestions — possible next life paths from ` +
    `a given decision node. Each should be 1-2 sentences, vivid and ` +
    `grounded, distinct from existing branches. Return ONLY a JSON array ` +
    `of 4 strings. No markdown, no explanation.`;
  const usr =
    `Decision path so far:\n` +
    path.map((p, i) => '  '.repeat(i) + '→ ' + p).join('\n') +
    `\n\nNode to branch from: "${nodeText}"` +
    (siblings.length
      ? `\n\nExisting siblings (avoid repeating):\n` +
        siblings.map(s => '- ' + s).join('\n')
      : '') +
    (children.length
      ? `\n\nExisting children (avoid repeating):\n` +
        children.map(c => '- ' + c).join('\n')
      : '') +
    `\n\nReturn only a JSON array of 4 suggestion strings.`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: sys,
      messages: [{ role: 'user', content: usr }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const txt = data.content?.[0]?.text || '[]';
  return JSON.parse(txt.replace(/```json|```/g, '').trim());
}

function openAI(nodeId) {
  aiTarget = nodeId;
  const n = nodes[nodeId];
  if (!n) return;
  aiPreview.textContent = n.textEl.textContent;
  aiList.innerHTML = '';
  aiEmpty.style.display = 'none';
  aiLoading.classList.add('on');
  aiRefresh.disabled = true;
  aiDrawer.classList.add('open');
  btnAi.classList.add('active');
  fetchSugs(nodeId)
    .then(sugs => {
      aiLoading.classList.remove('on');
      aiRefresh.disabled = false;
      renderSugs(sugs, nodeId);
    })
    .catch(err => {
      aiLoading.classList.remove('on');
      aiRefresh.disabled = false;
      aiEmpty.style.display = 'block';
      aiEmpty.textContent = 'Something went wrong. Check your API key and try again.';
      console.error(err);
    });
}

function renderSugs(sugs, nodeId) {
  aiList.innerHTML = '';
  if (!sugs.length) { aiEmpty.style.display = 'block'; return; }
  sugs.forEach((txt, i) => {
    const card = document.createElement('div');
    card.className = 'ai-card';
    const lbl = document.createElement('div');
    lbl.className = 'ai-card-lbl';
    lbl.textContent = `path ${i + 1}`;
    const t = document.createElement('div');
    t.className = 'ai-card-txt';
    t.textContent = txt;
    const add = document.createElement('button');
    add.className = 'ai-card-add';
    add.title = 'Add as branch';
    add.textContent = '+';
    add.addEventListener('click', e => {
      e.stopPropagation();
      plantSug(nodeId, txt, card);
    });
    card.appendChild(lbl);
    card.appendChild(t);
    card.appendChild(add);
    card.addEventListener('click', () => plantSug(nodeId, txt, card));
    aiList.appendChild(card);
  });
}

function plantSug(parentId, text, card) {
  const par = nodes[parentId];
  if (!par) return;
  recordHistory();
  // Share the auto-placement logic with the drag-⊕ codepath so
  // there's one source of truth for where new children land.
  const pos = placeNewChild(parentId);
  const newId = mkNode(pos.x, pos.y, text, parentId);
  selectNode(newId);
  card.style.opacity = '.4';
  card.style.pointerEvents = 'none';
  card.querySelector('.ai-card-lbl').textContent = '✦ added';
  showToast('branch added');
}

function closeAI() {
  aiDrawer.classList.remove('open');
  btnAi.classList.remove('active');
  aiTarget = null;
}

document.getElementById('ai-close').addEventListener('click', e => {
  e.stopPropagation();
  closeAI();
});
aiRefresh.addEventListener('click', e => {
  e.stopPropagation();
  if (aiTarget) openAI(aiTarget);
});
btnAi.addEventListener('click', e => {
  e.stopPropagation();
  if (aiDrawer.classList.contains('open')) { closeAI(); return; }
  if (!selected) { showToast('select a node first'); return; }
  openAI(selected);
});
