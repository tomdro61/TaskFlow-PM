# TaskFlow PM — Full Architecture & Code Quality Review

*Generated: February 2026*

---

## CRITICAL (Fix First)

### 1. Monolithic files need splitting
- `renderer.js` is 11,247 lines, `styles.css` is 12,812 lines, `mcp-server/index.js` is 5,519 lines
- All three are nearly impossible to navigate, test, or maintain
- Recommended: split renderer into ~12 modules (views, features, utils), CSS into component files, MCP server by tool category

### 2. Race condition in MCP server file I/O
- `loadData()` and `saveData()` have no concurrency control (`mcp-server/index.js:21-44`)
- When Claude makes parallel tool calls (which it does), last write wins and data is lost
- Needs file locking or atomic write operations

### 3. Memory leaks from event listeners
- `renderer.js` adds event listeners on every `render()` call without cleanup (`renderer.js:862-872`)
- Over time this causes memory growth, duplicate handler executions, and app slowdown
- Needs event delegation or proper listener tracking/removal

### 4. XSS vulnerability in recap rendering
- `renderer.js:8906-8912` converts markdown to HTML without sanitization
- `escapeHtml()` exists but isn't consistently applied
- Malicious content in recap entries could execute scripts

### 5. Full DOM reconstruction on every state change
- `render()` rebuilds entire views from scratch (`renderer.js:2343-2401`)
- With 100+ tasks this causes visible lag, lost scroll positions, interrupted animations
- Needs targeted/differential updates

### 6. Missing CSP headers on overlay windows
- `quick-capture.html` and `floating-bar.html` have no Content-Security-Policy
- `index.html` and `focus-pill.html` do — inconsistent security posture
- Quick capture accepts user input, making this a real attack vector

### 7. Dangerous PowerShell execution handler
- `main.js:262-280` exposes arbitrary PowerShell execution via IPC
- Appears unused in the app — should be removed

---

## IMPORTANT (Fix Soon)

### 8. Hardcoded paths still not configurable
- Queue paths are hardcoded strings, not user settings
- CLAUDE.md roadmap already calls this out for Week 2
- Should be stored in app settings/preferences

### 9. O(n²) task lookups everywhere
- `findTask()` in both renderer.js and mcp-server does linear scan through all projects/tasks
- Called hundreds of times per operation
- Should build an index map for O(1) lookups

### 10. No error boundaries
- If `loadData()` fails (corrupted JSON), the entire app crashes with no recovery
- No try-catch around critical operations in renderer.js
- Needs user-friendly error fallbacks

### 11. Missing input validation
- MCP server: dates, times, and required fields aren't validated on `create_task`, `update_task`, `bulk_schedule_today`
- `main.js`: imported JSON has no schema validation — malformed files can corrupt app state
- Time validation exists in `set_scheduled_time` but is missing everywhere else

### 12. IPC listener memory leaks in preload files
- `ipcRenderer.on()` listeners are registered without cleanup mechanisms
- No way for the renderer to remove listeners
- Should return cleanup functions

### 13. Notion API key stored in plain text
- `main.js:389-399` stores the key directly in `taskflow-data.json`
- Should use Electron's `safeStorage` API for encryption

### 14. Scattered state management
- 15+ state properties spread across the constructor (`renderer.js:4-70`)
- Makes state changes unpredictable, debugging difficult, undo/redo impossible
- Should centralize into a single state store

### 15. No transaction rollback in MCP server
- Bulk operations modify tasks in a loop, then save once at the end
- If `saveData()` fails mid-operation, in-memory state diverges from disk
- Needs atomic operations or rollback capability

---

## MODERATE (Address in Refactor)

### 16. Accessibility gaps across all HTML files
- 100+ interactive elements missing ARIA labels
- Modals missing `role="dialog"`, `aria-modal`, focus traps
- Rating buttons should be radio inputs, not `<button>` elements
- No `@media (prefers-reduced-motion)` on animations

### 17. Synchronous file I/O blocking main process
- `main.js` uses `readFileSync`/`writeFileSync` in IPC handlers
- Will cause UI freezes as data grows
- Should use async versions (`fs.promises`)

### 18. Dead code throughout
- Dual-track timeline code still exists despite being single-track mode now
- Unused IPC handlers in floating bar preload (`floating-bar-start-resize`, `floating-bar-do-resize`)
- Legacy CSS commented but present (styles.css:5051-5063)
- "Review" status in some places but not in the data model

### 19. Categories vs Projects confusion
- Sidebar shows "PROJECTS" but those are actually `categories` (`cat-work`, `cat-personal`, `cat-side`)
- Task modal project dropdown pulls from `data.projects` (different data structure)
- This is why the project dropdown appears empty

### 20. Magic numbers everywhere
- Timeline hours (6-22), slot durations (15 min), scoring weights (200), workday length (540 min)
- Should be named constants or configurable settings

### 21. Inconsistent error responses in MCP server
- Some tools return `{ content: [{ type: "text", text: "Error: ..." }] }`
- Others throw `new Error()`
- No consistent error schema

### 22. Date/timezone handling fragile
- Mixes local timezone and ISO strings
- No timezone-aware library used
- Will cause bugs around midnight or for users in different timezones

### 23. No pagination on MCP tool results
- `get_all_tasks`, `get_calendar_view` return everything as one text blob
- Can overwhelm Claude's context window with large task sets

### 24. Duplicate code patterns
- Time calculation repeated ~6 times in MCP server
- Window close functions duplicated 3 times in main.js
- Color picker logic repeated in renderer.js

---

## What's Done Well

- Electron security fundamentals are correct (`nodeIntegration: false`, `contextIsolation: true`)
- `contextBridge` used properly in all preload scripts
- `escapeHtml()` utility exists and is used in most places
- Data migration system is forward-compatible
- CSS custom properties used for consistent theming
- Global shortcut has smart fallback logic

---

## Recommended Priority Order

| Phase | Focus | Items |
|-------|-------|-------|
| **Now** | Stability & Security | #2 (race condition), #4 (XSS), #6 (CSP), #7 (PowerShell), #10 (error boundaries) |
| **Week 1-2** | Performance | #3 (memory leaks), #5 (rendering), #9 (task lookups), #12 (IPC leaks) |
| **Week 3-4** | Architecture | #1 (file splitting), #8 (configurable paths), #14 (state management), #19 (categories/projects) |
| **Week 5+** | Polish | #16 (accessibility), #18 (dead code), #20-24 (cleanup) |
