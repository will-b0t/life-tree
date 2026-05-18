# Life Tree

A browser-based, freeform life planning tool built around the metaphor of a branching narrative. Start with a single decision node, build outward, weigh pros and cons, and canonize the path you intend to pursue. Unchosen branches fade but are never deleted — the point is to hold the full possibility space, then choose.

Aged paper, ink, expedition maps. Not a productivity tool. A journal that thinks.

## Run it

No build step, no server, no dependencies.

```bash
open index.html
```

Or drag the file into a browser. All state is stored in `localStorage` and auto-saves as you work.

## What's in here

- `life-tree.html` — the page shell
- `css/` — visual system, split by concern (base, edges, nodes, ai-drawer, minimap, toolbar, library)
- `js/` — state, persistence, canvas, edges, minimap, collapse, canon, panels, nodes, reparent, layout, ai, export, history, library, and `index.js` (boot + global event wiring)
- `DESIGN.md` — full design doc and feature inventory

## Library

Boot lands on a home screen showing your trees. Each tree lives under its own `localStorage` key — `life-tree-data-<id>` for new trees, plus the legacy `life-tree-v4` key for anything migrated from earlier single-tree saves. Create, rename, or delete trees from the home screen; click `← library` in the toolbar to come back at any time.

## Interaction cheat sheet

| Gesture | Action |
|---|---|
| Drag background | Pan canvas |
| Scroll | Stepped zoom (25%–250%) |
| Hover node → drag ⊕ | Create a branch |
| Hover node → drag ↕ | Re-parent the subtree |
| Click node | Select; reveals pros/cons panels + action pill |
| Double-click node text | Edit in place |
| Double-click near an edge | Add a label to that edge |
| Action pill ◆ | Canonize root→node path |
| Action pill ↺ (on canon) | Decanonize |
| Action pill ▾ / ▸ | Collapse / expand subtree |
| `Esc` | Deselect, close AI drawer |
| `Delete` / `Backspace` | Delete selected node |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |

## Status

Single-file vanilla HTML/CSS/JS. AI branching suggestions exist in the codebase but are deprioritized while core interactions get buttoned up. See `DESIGN.md` for the full feature inventory and roadmap.
