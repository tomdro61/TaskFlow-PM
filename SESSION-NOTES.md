# TaskFlow PM - Session Notes & Next Steps

## Session Summary (January 31, 2026)

### Vision
TaskFlow PM is an **AI Command Center** - a project manager for AI-assisted workflows where:
- **75% Claude / 25% UI** - Claude handles research, documents, action plans
- Human is the **decision-maker**, Claude is the "talented hard-working intern"
- Built for **hustlers and workaholics** who want to produce (no overcommitting warnings)
- **Minimalist with Focus Mode** - clean, fast, distraction-free

---

## What We Implemented Today

### 1. Native Quick Capture (COMPLETE)
- **Global shortcut**: `Ctrl+Shift+Space` works even when app is minimized
- **Files created**:
  - `quick-capture.html` - Floating capture window
  - `preload-capture.js` - IPC bridge
- **Updated**: `main.js` with global shortcut registration

### 2. Brain Dump Context Field (COMPLETE)
- Added to task modal with collapsible guide prompts:
  - What's the goal/outcome?
  - Who is this for?
  - Any constraints?
  - What's been tried?
  - Questions to answer?
  - How should Claude help?
- Context displays in task detail panel

### 3. MCP Context Tools (COMPLETE)
New tools added to `mcp-server/index.js`:
- `get_task_context` - Full task context for Claude
- `get_missing_context` - Analyze what's missing, suggest questions
- `append_context` - Add to task's brain dump
- `get_inbox_tasks` - Get unprocessed brain dumps
- `extract_task_details` - Parse context for structured info

### 4. UI Updates (PARTIAL - Started)
- Added Command Center view structure in `index.html`
- Added Waiting status for blocked tasks
- Added Daily Review modal structure
- Added Morning Planning modal structure
- Added CSS for new components

---

## What Still Needs Implementation

### Priority 1: Complete JavaScript Logic ✅ IMPLEMENTED

#### A. Command Center View (`renderer.js`) ✅
```javascript
// Implemented methods:
- renderCommandCenter()
- updateCommandCenterStats()
- renderFocusQueue()
- renderBrainDumps()
- renderDailySchedule()
- formatRelativeTime()
```

#### B. Daily Review Modal ✅
```javascript
// Implemented methods:
- openDailyReview()
- saveDailyReview()
// Rating buttons bound in bindEvents()
```

#### C. Morning Planning Modal ✅
```javascript
// Implemented methods:
- openMorningPlanning()
- saveMorningPlan()
```

#### D. Enhanced Task States ✅
```javascript
// Updated methods to handle new states:
// - 'todo' = Inbox (unprocessed)
// - 'ready' = Ready to work
// - 'in-progress' = In progress
// - 'waiting' = Blocked/waiting
// - 'done' = Completed

- getFilteredTasks() // Added waiting filter ✅
- updateCounts() // Added waiting count ✅
- renderTaskBoard() // Maps new statuses to columns ✅
- formatStatus() // Added new status labels ✅
- setView() // Handles command-center view ✅
- updateViewTitle() // Added new view titles ✅
```

### Priority 2: Time Blocking Calendar

#### A. Daily Schedule View
- Hour-by-hour time slots (6am - 10pm)
- Drag and drop tasks to time slots
- Visual duration blocks
- Store `scheduledTime` and `estimatedDuration` on tasks

#### B. Task Duration/Time Estimates
- Add `estimatedMinutes` field to tasks
- UI for setting duration when creating tasks
- Display duration on task cards

### Priority 3: Sunsama-Inspired Polish
- More whitespace and breathing room
- Smoother transitions
- Day-focused as default view
- Calmer color refinements

---

## Files Modified Today

| File | Changes |
|------|---------|
| `main.js` | Added globalShortcut, quick capture window, capture IPC handlers |
| `preload.js` | Added capture APIs |
| `preload-capture.js` | New file - IPC for capture window |
| `quick-capture.html` | New file - Floating capture window |
| `index.html` | Command Center view, new modals, updated statuses |
| `styles.css` | Context field styles, Command Center styles, modal styles, planning styles |
| `renderer.js` | Context field handling, task capture, **Command Center methods**, **Daily Review methods**, **Morning Planning methods**, **Enhanced task states** |
| `mcp-server/index.js` | 5 new context tools |

### Overnight Work Additions to `renderer.js`:
- `renderCommandCenter()` - Main Command Center view render
- `updateCommandCenterStats()` - Updates stat cards
- `renderFocusQueue()` - Top 5 prioritized tasks
- `renderBrainDumps()` - Unprocessed brain dumps
- `renderDailySchedule()` - Today's task schedule
- `formatRelativeTime()` - Helper for "5m ago" format
- `openDailyReview()` - Opens and populates daily review modal
- `saveDailyReview()` - Saves review and creates tomorrow tasks
- `openMorningPlanning()` - Opens and populates morning planning modal
- `saveMorningPlan()` - Saves plan and schedules tasks for today
- Updated `setView()` for command-center and waiting views
- Updated `getFilteredTasks()` for waiting filter
- Updated `updateCounts()` for waiting count
- Updated `renderTaskBoard()` to map new statuses
- Updated `formatStatus()` with new status labels
- Updated `updateViewTitle()` with new view titles
- Added event bindings for all new buttons

---

## Overnight Queue Tasks

### ✅ COMPLETED Tasks:

### Task 1: Complete Command Center JavaScript ✅
**Status**: DONE

### Task 2: Daily Review System ✅
**Status**: DONE

### Task 3: Morning Planning System ✅
**Status**: DONE

### Task 5: Enhanced Task States Logic ✅
**Status**: DONE

---

### Remaining Tasks:

### Task 4: Time Blocking - Data Model
**Files**: `renderer.js`, `mcp-server/index.js`
**Work**: Add time fields to task schema
```
- Add 'scheduledTime' field (ISO datetime)
- Add 'estimatedMinutes' field (number)
- Add 'actualMinutes' field (tracked time)
- Update MCP tools to expose these fields
```

### Task 6: MCP Daily/Weekly Tools Enhancement
**File**: `mcp-server/index.js`
**Work**: Better AI integration
```
- Add 'get_ready_tasks' tool (tasks ready to work on)
- Add 'set_waiting_reason' tool
- Enhance 'plan_my_day' with time estimates
- Add 'suggest_next_task' with smart prioritization
```

### Task 7: Time Blocking Calendar UI
**Files**: `index.html`, `styles.css`, `renderer.js`
**Work**: Add visual time blocking
```
- Add hour-by-hour schedule grid
- Drag and drop tasks to time slots
- Visual duration blocks
- Persist scheduled times
```

### Task 8: Sunsama-Inspired Polish
**Files**: `styles.css`
**Work**: UI refinements
```
- More whitespace and breathing room
- Smoother transitions
- Calmer color refinements
- Day-focused default view
```

---

## Quick Reference: Current Task States

| State | UI Label | Meaning |
|-------|----------|---------|
| `todo` | Inbox | Unprocessed brain dumps |
| `ready` | Ready | Clarified, ready to work on |
| `in-progress` | In Progress | Currently working |
| `waiting` | Waiting | Blocked on someone/something |
| `done` | Done | Completed |

---

## Key Design Principles (From Research)

1. **No time estimates in UI** - Don't guilt people about time
2. **AI-first workflow** - Build for people using Claude constantly
3. **Brain dump friendly** - Single text field, Claude parses structure
4. **Focus on production** - For hustlers who want to finish everything
5. **Minimalist but powerful** - Clean UI, keyboard shortcuts
6. **Daily rhythm** - Morning planning, evening review

---

## Testing Checklist

### Quick Capture
- [ ] Quick Capture: `Ctrl+Shift+Space` opens floating window
- [ ] Quick Capture: Task saves to Inbox
- [ ] Context Guide: Toggle shows/hides prompts
- [ ] Context saves with task
- [ ] Context shows in detail panel

### MCP Tools
- [ ] MCP: `get_task_context` returns full context
- [ ] MCP: `get_missing_context` suggests questions

### Command Center (NEW - Ready to Test)
- [ ] Command Center nav button shows view
- [ ] Stats show correct counts (inbox, today, completed, waiting)
- [ ] Focus Queue shows top 5 prioritized tasks
- [ ] Brain Dumps section shows unprocessed tasks with context
- [ ] Daily Schedule shows today's tasks
- [ ] "Plan My Day" button opens Morning Planning modal
- [ ] "Start Focus" button enters Focus Mode
- [ ] "Process Inbox" button navigates to Inbox view

### Daily Review Modal (NEW - Ready to Test)
- [ ] Opens with today's completed tasks listed
- [ ] Shows focus time and pomodoro count
- [ ] Learnings textarea saves
- [ ] Tomorrow's top 3 inputs create tasks with priorities
- [ ] Rating buttons toggle correctly
- [ ] "Complete Review" saves and closes

### Morning Planning Modal (NEW - Ready to Test)
- [ ] Shows greeting based on time of day
- [ ] Displays yesterday's highlights
- [ ] Focus tasks (top 5) can be selected
- [ ] Other tasks (next 10) can be selected
- [ ] Brain dump creates new tasks
- [ ] "Start My Day" sets selected tasks for today

### Task States (NEW - Ready to Test)
- [ ] 'waiting' view shows blocked tasks
- [ ] Waiting count shows in sidebar
- [ ] Detail panel has all 6 status options
- [ ] Board view maps new statuses correctly

---

## Notes for Next Session

1. The overnight work should focus on **renderer.js** - that's where most logic lives
2. All the HTML structure is in place, just needs JS to populate/handle it
3. MCP server changes are independent and can be done anytime
4. Test the app frequently with `npm start` to catch issues early
5. The Focus Mode already works well - don't break it!

---

*Generated: January 31, 2026*
