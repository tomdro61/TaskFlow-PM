# TaskFlow PM - Project Context for Claude

## Overview

TaskFlow PM is an **AI-powered task management desktop app** built with Electron. It's designed as a command center where Claude acts as a tireless execution partner - you capture raw thoughts, and Claude helps process, organize, prioritize, and execute tasks.

**Core Philosophy:** Claude does the heavy lifting; the human makes the final calls.

## Tech Stack

- **Framework:** Electron 28.x
- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework)
- **Data Storage:** Local JSON file (`taskflow-data.json` in user data directory)
- **MCP Integration:** Custom MCP server for Claude Desktop/Claude Code integration

## Project Structure

```
TaskFlow-PM/
├── main.js                  # Electron main process
├── preload.js               # Preload script for main window
├── preload-capture.js       # Preload for quick capture window
├── preload-pill.js          # Preload for focus pill widget
├── preload-floating-bar.js  # Preload for floating bar widget
├── index.html               # Main window HTML
├── styles.css               # CSS entry point (@imports styles/ files)
├── quick-capture.html       # Global quick capture overlay
├── floating-bar.html        # Floating task bar overlay
├── focus-pill.html          # Floating focus mode widget
├── renderer.js              # Legacy monolith (backup, not loaded)
├── renderer/                # Modular app logic (14 ES modules)
│   ├── app.js               #   Entry point, class shell, startup
│   ├── utils.js             #   Date formatting, escapeHtml, helpers
│   ├── data.js              #   Task/project/tag CRUD, save/load
│   ├── events.js            #   Click handlers, keyboard shortcuts
│   ├── today-view.js        #   Today dashboard, plan-my-day
│   ├── calendar-view.js     #   Calendar month/week/day, timeline
│   ├── focus-mode.js        #   Pomodoro timer, focus pill, AI chat
│   ├── tasks.js             #   Task elements, modals, detail panel
│   ├── projects-view.js     #   Sidebar, project views
│   ├── inbox-view.js        #   Inbox triage, AI prompts
│   ├── recaps.js            #   Recap journal, daily review
│   ├── analytics.js         #   Dashboard, bulk actions
│   ├── modals.js            #   Modal/toast/context menu helpers
│   └── integrations.js      #   Command palette, Notion sync
├── styles/                  # Modular CSS (14 component files)
│   ├── variables.css        #   Design tokens, custom properties
│   ├── layout.css           #   Page structure
│   ├── sidebar.css          #   Navigation, project list
│   ├── tasks.css            #   Task items, board columns
│   ├── calendar.css         #   Calendar grids, timeline
│   ├── modals.css           #   Popups, forms
│   ├── focus-mode.css       #   Focus mode, timer
│   ├── today-view.css       #   Today view, stats
│   ├── recaps.css           #   Recap views
│   ├── inbox.css            #   Inbox layout
│   ├── projects.css         #   Project views
│   ├── analytics.css        #   Dashboard charts
│   ├── master-list.css      #   Master list view
│   └── utilities.css        #   Toasts, tooltips, misc
├── mcp-server/              # Claude MCP integration (10 files)
│   ├── index.js             #   Server setup, tool router
│   ├── data.js              #   Data file I/O, async mutex
│   ├── tools-core.js        #   24 tools: CRUD, subtasks, blockers
│   ├── tools-views.js       #   8 tools: filtered task views
│   ├── tools-scheduling.js  #   6 tools: time scheduling
│   ├── tools-ai.js          #   8 tools: brain dump, suggestions
│   ├── tools-recaps.js      #   9 tools: recaps, reviews
│   ├── tools-projects.js    #   12 tools: projects, dependencies
│   ├── tools-analytics.js   #   4 tools: stats, insights
│   └── tools-notion.js      #   Notion integration (placeholder)
├── package.json
└── claude-desktop-config.json
```

## Key Files

### renderer/ (Main Application Logic — 14 ES Modules)
- **app.js** — `TaskFlowApp` class shell, constructor, init, view routing. Imports all other modules and mixes them onto the prototype via `Object.assign`.
- **Feature modules** — Each file owns one feature area (today-view.js, calendar-view.js, focus-mode.js, etc.). Methods export as standalone functions and work via `this` through prototype binding.
- **data.js** — All CRUD operations for tasks, projects, tags, categories. `saveData()` persists to disk.
- **events.js** — All event binding: click handlers, keyboard shortcuts, navigation.
- **utils.js** — Shared helpers: `escapeHtml()`, date formatting, ID generation.

### mcp-server/ (Claude Integration — 10 files, 71 tools)
- **index.js** — Server startup and tool router. Imports tool modules and delegates `callTool` to the matching handler.
- **data.js** — Shared data I/O with async mutex (`withLock`) for safe parallel tool calls.
- **tools-*.js** — Tool handlers grouped by category (core, views, scheduling, ai, recaps, projects, analytics, notion).

### styles/ (CSS — 14 component files)
- **styles.css** (root) — Entry point with `@import` statements loading all component files.
- **variables.css** — Design tokens (colors, spacing, fonts) as CSS custom properties.
- **Component files** — Each mirrors a renderer module (tasks.css, calendar.css, focus-mode.css, etc.).

## Data Model

### Task Object
```javascript
{
  id: string,
  name: string,
  description: string,
  context: string,           // Brain dump content for AI processing
  status: 'todo' | 'in-progress' | 'waiting' | 'done',
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent',
  dueDate: 'YYYY-MM-DD' | null,
  scheduledTime: 'HH:MM' | null,
  scheduledDate: 'YYYY-MM-DD' | null,
  estimatedMinutes: number | null,
  executionType: 'ai' | 'manual' | 'hybrid',  // Who executes this task
  subtasks: Array<Subtask>,
  filePaths: Array<string>,
  createdAt: ISO timestamp,
  completedAt: ISO timestamp | null
}
```

### Project Object
```javascript
{
  id: string,
  name: string,
  color: string,
  isInbox: boolean,
  tasks: Array<Task>
}
```

### Recap Entry Object (stored in data.recapLog)
```javascript
{
  id: string,
  type: 'accomplishment' | 'decision' | 'note',
  content: string,
  date: 'YYYY-MM-DD',
  relatedTaskId: string | null,
  tags: Array<string>,
  createdAt: ISO timestamp
}
```

### Saved Recap Object (stored in data.savedRecaps)
```javascript
{
  id: string,
  period: 'daily' | 'weekly' | 'monthly',
  periodLabel: string,           // e.g., "2024-01-15" or "Week of 2024-01-14"
  startDate: 'YYYY-MM-DD',
  endDate: 'YYYY-MM-DD',
  content: string,               // Full markdown recap document
  stats: {
    tasksCompleted: number,
    timeMinutes: number,
    accomplishments: number,
    decisions: number,
    notes: number,
    learnings: number
  },
  savedAt: ISO timestamp
}
```

## Key Features

### 1. Command Center (Default View)
- Stats cards (Inbox, Due Today, Completed, Waiting)
- Dual-track timeline (Claude track + Manual track)
- Focus Queue (top priority tasks)
- Brain Dumps section
- Claude Queue integration

### 2. Parallel Execution Model
Tasks have an `executionType`:
- `ai` - Claude works autonomously (code gen, research, writing)
- `manual` - Requires human action (meetings, calls, decisions)
- `hybrid` - Collaborative work (code review, editing with Claude)

### 3. Time Blocking
- Visual timeline from 6 AM - 10 PM
- Drag tasks from Focus Queue to schedule
- Click empty slots to pick tasks
- Remove button on hover to unschedule

### 4. Focus Mode
- Pomodoro-style timer
- Task queue with skip/complete
- Floating pill widget option
- AI encouragement messages

### 5. Quick Capture
- Global shortcut: Ctrl+Shift+Space
- Captures raw thoughts as "brain dumps"
- Claude processes via MCP tools

## Common Commands

```bash
# Run the app
npm start

# Build for distribution
npm run build

# MCP server location (for Claude Desktop config)
node mcp-server/index.js
```

## Code Conventions

- **No TypeScript** - Pure JavaScript
- **ES Module Mixin Pattern** - `TaskFlowApp` is the main class. Feature modules export standalone functions that are mixed onto the prototype via `Object.assign(TaskFlowApp.prototype, ...)`. All methods use `this` normally.
- **Event binding** - Done in `bindEvents()` (renderer/events.js) using event delegation on parent containers
- **Rendering** - Methods prefixed with `render` (e.g., `renderCommandCenter()`)
- **Data persistence** - `saveData()` called after mutations
- **Escaping** - Always use `escapeHtml()` for user content
- **Task lookups** - Use `this.findTask(id)` which uses an O(1) index (`this._taskIndex`)

## CSS Conventions

- CSS custom properties in `:root` for theming
- BEM-like naming: `.component-element` or `.component-modifier`
- Color scheme: Indigo (#6366f1) for AI, Emerald (#10b981) for manual
- Transitions: `var(--transition)` for consistency

## MCP Integration Notes

To use with Claude Desktop, add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "taskflow": {
      "command": "node",
      "args": ["C:/path/to/mcp-server/index.js"]
    }
  }
}
```

## Important Patterns

### Adding a New MCP Tool
1. Find the appropriate `mcp-server/tools-*.js` file by category (or create a new one)
2. Add the tool schema to `getToolDefinitions()` in that file
3. Add the handler case in `handleTool()` in the same file
4. If creating a new tool module, import it in `mcp-server/index.js` and add to the `toolModules` array
5. Follow existing patterns for input validation and response format

### Adding a New View
1. Create a new module file in `renderer/` (e.g., `renderer/my-view.js`)
2. Export a `renderMyView()` function (and any supporting functions)
3. Import the module in `renderer/app.js` and add it to the `Object.assign()` call
4. Add the view case in `render()` method in `renderer/app.js`
5. Add nav button in index.html if needed
6. Create a corresponding `styles/my-view.css` and add its `@import` to `styles.css`

### Adding Methods to an Existing Module
1. Export the function from the appropriate `renderer/*.js` file
2. It automatically becomes a method on `TaskFlowApp` via the mixin pattern — no other changes needed
3. Use `this` normally to access app state and call other methods

### Modifying the Timeline
- Timeline rows rendered in `renderDualTrackTimeline()` (renderer/calendar-view.js)
- Task blocks rendered in `renderTimelineTasks()` (renderer/calendar-view.js)
- Drop zones bound in `bindTimelineDropZones()` (renderer/calendar-view.js)
- Task picker modal in `openTaskPicker()` (renderer/calendar-view.js)

---

## USER WORKFLOW VISION (Documented Feb 2026)

### How the App is Used

**Always-open dashboard** - The app stays open all day as a command center
**20-50 tasks/day** - High volume workload
**Full keyboard-driven** - Every action has a shortcut
**Minimal organizing time** - Claude handles the heavy lifting

### Daily Workflow

1. **Morning** (5 min)
   - See what Claude completed overnight
   - See today's schedule
   - One-click "Plan My Day" if needed

2. **During Day**
   - Quick capture thoughts (Ctrl+Shift+Space)
   - Focus sessions (time-boxed, custom duration)
   - Claude works in parallel on AI tasks
   - Check off tasks (hide immediately when done)

3. **End of Day** (5 min)
   - Review accomplishments
   - Queue tasks for Claude overnight
   - Prep tomorrow

### Key Behaviors

| Behavior | Setting |
|----------|---------|
| Time granularity | 15-minute slots |
| Completed tasks | Hide immediately |
| Unfinished tasks | Auto-roll to tomorrow |
| Priorities | Claude suggests |
| Offline mode | Must work without Claude |

### Claude's Three Modes

1. **Immediate** - Do this task right now
2. **Overnight** - Queue for batch processing while sleeping
3. **Parallel** - Work while user does manual tasks

### Overnight Queue Contents

- Research tasks
- Writing drafts
- Code generation
- Analysis/summaries

---

## IMPLEMENTATION ROADMAP

### Week 1: Core Daily Workflow (CURRENT)
- [ ] Rebuild Today view as a focused task queue (no time blocking)
- [ ] Completed tasks hide immediately (toast confirmation instead)
- [ ] Auto-roll unfinished tasks to tomorrow on startup

### Week 2: Claude Integration UI
- [ ] "Plan My Day" button (prepares data for Claude, no auto API calls)
- [ ] Overnight Queue UI section (visual organizer for tasks tagged for Claude)
- [ ] Overnight Results display (read local Claude Queue sync file on startup)
- [x] Remove hardcoded Claude Queue paths — make configurable

### Week 3: Visual Polish
- [ ] Execution type color coding (indigo=AI, emerald=manual, blend=hybrid)
- [ ] Persistent status bar (current task, next scheduled, queue count, shortcut hints)

### Week 4: Architecture (DONE)
- [x] Split renderer.js (11,397 lines) into 14 focused ES module files
- [x] Split styles.css (12,824 lines) into 14 component-scoped files
- [x] Split mcp-server/index.js (5,529 lines) into 10 tool modules
- [x] Add error handling (try-catch wrappers, user-facing error toasts)

### Week 5: UX Refinement
- [ ] Settings/Preferences UI (queue path, default view, timeline hours, pomodoro, theme)
- [ ] Streamline daily workflow (startup banner, end-of-day review, queue-for-tonight)
- [ ] Reduce modal overload (slide-out panels for task details, inline editing)

### Week 6: Power Features
- [ ] Drag-and-drop from queue to timeline slots
- [ ] Recurring tasks / daily habits with auto-generation
- [ ] Task templates (save/load common task structures)
- [ ] Onboarding / first-run experience

---

### Costs Money (Consider Later)

| Feature | Why It Costs |
|---------|-------------|
| Real-time Claude progress polling | Each automatic poll = API call, adds up continuously |
| Voice capture (speech-to-text) | Web Speech API unreliable in Electron; reliable alternatives are paid |
| Auto-triggered AI features | Any feature calling Claude automatically without user initiation = API cost |

**Note:** Existing MCP tools (plan_my_day, suggest_subtasks, etc.) are free to keep — they only run when the user initiates a Claude conversation.

---

## WEEK 1 IMPLEMENTATION DETAILS

### 1.1 Rebuild Today View as Focused Task Queue

**Problem:** Today view renders a cluttered "Command Center" with priority-grouped sections. Should be a clean, focused queue.
**Files:** `renderer/today-view.js`, `styles/today-view.css`, `index.html`

**New layout:** Two-column — Task Queue (left) + Brain Dumps & Stats (right)
- **Working On Now** — single highlighted task at the top (the current focus)
- **Up Next** — prioritized queue of today's remaining tasks, ordered by priority then creation date
- **Right sidebar** — Brain Dumps, quick stats (tasks left, completed count), daily notes
- Click a task to set it as "Working On Now"
- Space to complete and auto-advance to next task
- No time slots, no scheduling grid — just a ranked list you work through

```
+------------------------------------------------------------------+
| [Today] [Inbox] [Projects] [Review]     [+ Task] [Focus]         |
+------------------------------------------------------------------+
|                                                                   |
|  WORKING ON NOW                    |  STATS                       |
|  +-----------------------------+   |  4 tasks left · 3 done       |
|  | > Current Task Name   [✓]  |   |                              |
|  |   Est: 30m · High priority  |   |  BRAIN DUMPS                 |
|  +-----------------------------+   |  +------------------------+  |
|                                    |  | - Raw thought 1        |  |
|  UP NEXT                           |  | - Raw thought 2        |  |
|  +-----------------------------+   |  +------------------------+  |
|  | 1. Task B (urgent)    30m   |   |                              |
|  | 2. Task C (high)      15m   |   |  DAILY NOTES                 |
|  | 3. Task D (medium)    45m   |   |  +------------------------+  |
|  | 4. Task E (low)       30m   |   |  | Free-form text area    |  |
|  +-----------------------------+   |  +------------------------+  |
|                                    |                              |
+------------------------------------------------------------------+
| J/K: Navigate | Space: Complete | Enter: Details | N: New Task   |
+------------------------------------------------------------------+
```

### 1.2 Completed Tasks — Hide Immediately

**Current:** Expandable "Completed Today" section stays visible
**New:** Tasks vanish from all active views on completion. Show brief toast: "Task X completed"
**File:** `renderer/today-view.js` — filter `.status !== 'done'` in all view renders. Toast via `renderer/modals.js`.

### 1.3 Auto-Roll Unfinished Tasks to Tomorrow

**Trigger:** On app startup (or midnight if app is running)
**Logic:**
1. Find tasks with `scheduledDate` before today and `status !== 'done'`
2. Move `scheduledDate` to today, clear `scheduledTime`
3. Show startup banner: "X tasks rolled forward from yesterday"
**Files:** `renderer/app.js` (startup logic), `renderer/today-view.js` (autoRollTasks), `main.js` (optional midnight timer)
