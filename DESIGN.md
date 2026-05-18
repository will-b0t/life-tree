# Life Tree — Design & Feature Document
*Handoff for continued development*

---

## What It Is

Life Tree is a browser-based, freeform life planning tool built around the metaphor of a branching narrative. The user starts with a single decision node ("Will decides to pack his car and move") and builds outward — creating alternate paths, weighing pros and cons, and eventually canonizing the path they intend to pursue. Unchosen branches fade but are never deleted; the whole point is to hold the full possibility space, then choose.

The aesthetic is deliberate: aged paper, ink, expedition maps. Not clinical. Not a productivity tool. Something closer to a journal that thinks.

---

## Current Stack

- **Single-file HTML/CSS/vanilla JS** — no build step, no dependencies, no framework
- **Runs entirely in the browser** — open `life-tree.html` directly, no server needed
- **Persists to `localStorage`** — auto-saves on every meaningful action
- **AI suggestions via Anthropic API** — direct `fetch()` to `api.anthropic.com/v1/messages`
- **Fonts:** Crimson Pro (serif, node text) + DM Mono (labels, UI chrome)

---

## Feature Inventory

### Canvas & Navigation
| Feature | Status | Notes |
|---|---|---|
| Infinite pan | ✅ | Drag background |
| Stepped zoom | ✅ | 13 discrete levels (25%–250%), scroll-dampened |
| Fit to screen | ✅ | Toolbar button, accounts for open AI drawer |
| Auto-layout | ✅ | Top-down tree layout, subtree-width spacing |
| Dot grid background | ✅ | Parallaxes with pan/zoom |
| Minimap | ✅ | Click to pan, updates in real time |

### Node Operations
| Feature | Status | Notes |
|---|---|---|
| Create node | ✅ | Hover → drag ⊕ handle to blank canvas |
| Edit text | ✅ | ✏️ in action pill, or double-tap text |
| Move node | ✅ | Drag node body |
| Delete node | ✅ | ✕ in action pill; also Delete/Backspace key |
| Re-parent node | ✅ | Drag ↕ handle onto target node |
| Collapse subtree | ✅ | ▾/▸ in action pill; badge shows branch count |
| Pros panel | ✅ | Slides out left on select; inline editable |
| Cons panel | ✅ | Slides out right on select; inline editable |
| Pro/con summary dots | ✅ | Green/red dots on unselected nodes |

### Canon System
| Feature | Status | Notes |
|---|---|---|
| Canonize path | ✅ | ◆ in action pill; marks root→node chain |
| Canon visual style | ✅ | Amber tones, heavier weight, warmer bg |
| Faded non-canon | ✅ | 68% opacity; hover restores |
| Candidate nodes | ✅ | Children of canon leaf stay at full opacity |
| De-canonize (leaf) | ✅ | ↺ on canon leaf strips just that node |
| De-canonize (full) | ✅ | ↺ on mid-chain node clears entire path |

### Edge Labels
| Feature | Status | Notes |
|---|---|---|
| Add label | ✅ | Double-click near any edge connector |
| Edit label | ✅ | Inline contentEditable |
| Canon edge styling | ✅ | Amber tint on canon-path edges |
| Label persists | ✅ | Saved to localStorage |

### AI Suggestions
| Feature | Status | Notes |
|---|---|---|
| Open suggestion drawer | ✅ | Select node → ✦ suggest in toolbar or action pill |
| Context-aware prompts | ✅ | Sends full root→node path + existing siblings/children |
| Suggestion cards | ✅ | 4 cards, click or + to add as branch |
| Add branch from suggestion | ✅ | Plants node at offset position, opens for edit |
| Refresh suggestions | ✅ | ↺ button generates new set |
| Used card state | ✅ | Card greys out after adding |
| Model | ✅ | `claude-sonnet-4-20250514` |

### Persistence
| Feature | Status | Notes |
|---|---|---|
| Auto-save | ✅ | Debounced 800ms after any change |
| Manual save | ✅ | 💾 button in toolbar |
| Save state | ✅ | Nodes, edges, positions, text, pros/cons, canon, collapse, zoom, pan, edge labels |
| Clear / reset | ✅ | Prompts before wiping |
| Storage key | — | `life-tree-v4` in localStorage |

---

## Interaction Model

### Handles on each node
- **⊕ (bottom centre)** — drag to blank canvas to create a new child branch
- **↕ (top left)** — drag onto another node to re-parent this node's subtree

### Action pill (appears on select, top-right of node)
`✏️` edit · `✦` AI suggest · `▾` collapse · `▸` expand · `◆` canonize · `↺` decanonize · `✕` delete

### Keyboard shortcuts
- `Escape` — deselect node, close AI drawer
- `Delete` / `Backspace` — delete selected node (when no text field is focused)

---

## Visual System

### Color palette
```
--paper:        #f5f0e8   background
--paper-2:      #ede8dc   node fill
--ink:          #2a2018   primary text, selected border
--ink-2:        #5a4a38   secondary text
--ink-3:        #9a8a78   labels, muted UI
--canon:        #7a4f2e   canon border
--canon-bg:     #f0e6d6   canon node fill
--canon-label:  #c87c3e   canon labels, edges
--branch:       #4a6a5a   branch handles, ghost edges
--faded-border: #ccc4b4   faded node border
--pro:          #3d6b4f   pros panel
--pro-bg:       #eaf3ec   pros panel background
--con:          #8b3a3a   cons panel
--con-bg:       #f7eaea   cons panel background
--ai:           #5a3a7a   AI drawer accent
--ai-bg:        #f2edf8   AI drawer background
--ai-border:    #c4a8e0   AI drawer border
```

### Typography
- **Crimson Pro** — node text, ghost text, AI cards (serif, warm)
- **DM Mono** — all labels, UI chrome, toolbar, action pill (monospace, grounding)

### Node states
1. **Default** — paper-2 fill, ink-3 border, 1.5px
2. **Hovered** — ink-2 border, subtle shadow
3. **Selected** — 3px ink border, stronger shadow, panels slide out, action pill visible
4. **Canon** — canon-bg fill, canon border, heavier text, amber label
5. **Faded** — 68% opacity, faded-border color (non-canon after canonization)
6. **Candidate** — full opacity, default style (direct children of canon frontier)
7. **Collapsed** — dashed border, collapsed badge below
8. **Drop target** — dashed amber border during re-parent drag

### Edge states
1. **Default** — ink-3, 1px, 4-5 dash pattern, 55% opacity
2. **Canon** — canon amber, 2.5px, solid, 100% opacity
3. **To candidate** — ink-3, 1px, dashed, 60% opacity
4. **Faded** — ink-3, 1px, dashed, 45% opacity

---

## AI Integration Details

### API call
```
POST https://api.anthropic.com/v1/messages
Model: claude-sonnet-4-20250514
Max tokens: 800
```

### Prompt construction
The system message asks Claude to return only a JSON array of 4 suggestion strings. The user message includes:
- The full path from root → selected node (indented to show depth)
- The text of the node being branched from
- Existing sibling branches (to avoid repetition)
- Existing children of the node (to avoid repetition)

### Response handling
Strips any markdown fences, parses JSON, renders as suggestion cards. On error, shows inline message in drawer.

### Authentication
The API key must be present in the request headers. Currently the fetch call sends no `x-api-key` header — this works in claude.ai artifacts (which inject the key server-side) but **requires an API key to be added for standalone use**. See: Next Steps → API key handling.

---

## Known Gaps & Next Steps

### High priority
- **API key handling** — The standalone HTML currently has no API key in the fetch headers. Options: (a) prompt user to paste their key into a settings field stored in localStorage, (b) proxy through a lightweight server, (c) use an environment variable if deployed. The claude.ai artifact version works because the platform injects credentials automatically.
- **Touch support** — All interactions are mouse-based. Needs pointer events / touch equivalents for iPad use.
- **Node auto-positioning** — When a branch is created manually (drag ⊕), it places wherever you drop. Auto-layout is manual. A future pass could auto-place new children at a sensible offset and nudge siblings apart.

### Medium priority
- **Export** — PNG (canvas render) or JSON (for import/share). The data structure is already clean and serializable.
- **Multiple trees** — A home screen with named life trees, each in their own localStorage key.
- **Undo/redo** — Currently there's no history. A simple action stack would be valuable.
- **Node theming** — Customizable colors per node or per branch. The CSS variable system is already set up for this.
- **Custom edge styles** — Stroke weight, dash pattern, color per edge.

### Nice to have
- **Background themes** — Toggle between dot grid, line grid, blank, and a faint topographic contour pattern
- **Zoom to node** — Click a node in the minimap or search to center/zoom to it
- **Search** — Find a node by text content
- **Sharing** — Export tree as a URL-encoded blob or shareable link
- **Mobile layout** — Responsive toolbar, touch-friendly handles

---

## File Structure (current)

```
life-tree.html          # Everything — HTML, CSS, JS in one file
```

### Suggested refactor structure (for Cowork / larger development)
```
life-tree/
  index.html
  css/
    base.css            # Variables, reset
    nodes.css           # Node + panel styles
    canvas.css          # App, grid, edges
    toolbar.css         # Toolbar, toast, zoom indicator
    ai-drawer.css       # AI suggestion drawer
    minimap.css         # Minimap
  js/
    state.js            # nodes, edges, pan, zoom state
    canvas.js           # Transform, pan, zoom
    nodes.js            # Build, create, delete, edit
    edges.js            # Draw edges, edge labels
    canon.js            # Canonize, decanonize, fading
    collapse.js         # Collapse/expand subtrees
    reparent.js         # Re-parent drag
    layout.js           # Auto-layout, fit to screen
    minimap.js          # Minimap render + click
    ai.js               # AI drawer, fetch, suggestions
    persistence.js      # Save, load, clear
  index.js              # Boot, event wiring
```

---

## Session Summary

This document covers a full design and build session in Claude. The feature set was developed incrementally across ~25 iterations, starting from a basic node canvas and growing through:

1. Basic canvas with drag-to-branch
2. Smooth stepped zoom
3. Action pill UI (edit, canonize, delete)
4. Canon visual system (amber path, faded off-path nodes, candidate frontier)
5. Pro/con flanking panels with summary dots
6. Save/restore to localStorage
7. De-canonize (leaf step-back and full clear)
8. Node re-parenting with cycle guard
9. Collapse/expand subtrees with badge
10. Polish pass: dot grid, fit-to-screen, auto-layout, edge labels, minimap
11. AI branch suggestions via Anthropic API with context-aware prompting

The result is a fully functional single-file web application ready for further development.
