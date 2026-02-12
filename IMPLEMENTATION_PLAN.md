# TaskFlow PM - Implementation Plan

## Overview
Transform TaskFlow into a fast, seamless task management experience while maintaining powerful AI integration. Focus on speed, simplicity, and the core loop: **Capture → Process → Execute**.

---

## Phase 1: Fix Critical Issues & Quick Wins

### 1.1 Fix Global Shortcut (Ctrl+Shift+Space)
**Priority:** URGENT
**Files:** `main.js`

**Diagnosis:** The current implementation looks correct, but may fail silently. Potential causes:
- Another app has claimed the shortcut (common with screenshot tools, clipboard managers)
- Electron needs focus registration
- Need error feedback to user

**Fix:**
```javascript
// Add logging and fallback shortcut
function registerGlobalShortcut() {
  globalShortcut.unregisterAll();

  const shortcuts = [
    'CommandOrControl+Shift+Space',
    'CommandOrControl+Alt+N'  // Fallback
  ];

  for (const shortcut of shortcuts) {
    const registered = globalShortcut.register(shortcut, () => {
      createCaptureWindow();
    });

    if (registered) {
      console.log(`Global shortcut registered: ${shortcut}`);
      break;
    } else {
      console.error(`Failed to register: ${shortcut}`);
    }
  }
}
```

**Also add:** Notification to user if shortcut fails + settings to customize shortcut.

---

### 1.2 Half-Hour Time Slots
**Priority:** HIGH
**Files:** `renderer.js` (lines 3111-3437), `styles.css`

**Current:** 17 hourly slots (6 AM - 10 PM)
**New:** 34 half-hour slots (6:00, 6:30, 7:00, 7:30, etc.)

**Changes needed:**
1. Update `renderDualTrackTimeline()` to generate 30-min slots
2. Modify time display (show ":00" and ":30" suffixes)
3. Update `bindTimelineDropZones()` to set correct times
4. Adjust task rendering to calculate position within slots
5. Update CSS for tighter slot spacing

---

## Phase 2: Speed & Seamlessness

### 2.1 Keyboard-First Navigation
**Priority:** HIGH
**Files:** `renderer.js`, `index.html`

**Global shortcuts (in-app):**
| Key | Action |
|-----|--------|
| `N` | New task (quick add) |
| `B` | New brain dump |
| `T` | Go to Today view |
| `I` | Go to Inbox |
| `C` | Go to Command Center |
| `J/K` | Navigate tasks up/down |
| `Enter` | Open selected task |
| `Space` | Toggle task complete |
| `P` | Cycle priority (none→low→med→high→urgent) |
| `S` | Quick schedule (opens time picker) |
| `Esc` | Close modal / deselect |
| `?` | Show keyboard shortcuts |

**Implementation:**
```javascript
// Add to bindEvents()
document.addEventListener('keydown', (e) => {
  // Ignore if in input/textarea
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

  switch(e.key.toLowerCase()) {
    case 'n': this.openQuickAdd(); break;
    case 't': this.switchView('today'); break;
    // ...
  }
});
```

---

### 2.2 Inline Quick Add
**Priority:** HIGH
**Files:** `renderer.js`, `index.html`, `styles.css`

Instead of modal, add inline input at top of task list:
- Always visible, auto-focused on view load
- Enter to add task
- Tab to expand for more fields (due date, priority)
- Shift+Enter for brain dump mode

---

### 2.3 Smart Defaults
**Priority:** MEDIUM
**Files:** `main.js`, `renderer.js`, `mcp-server/index.js`

- New tasks default to 30min estimated time
- Tasks added in Today view auto-schedule to next available slot
- Brain dumps auto-tagged for Claude processing
- Completed tasks animate out smoothly (300ms fade)

---

## Phase 3: Simplified UI

### 3.1 Consolidate Views
**Priority:** MEDIUM
**Files:** `renderer.js`, `index.html`, `styles.css`

**Current:** 5 views (Command Center, Today, Inbox, Projects, Calendar)
**New:** 3 views + modals

| View | Purpose |
|------|---------|
| **Today** | Primary workspace - timeline + focus queue |
| **Inbox** | Unprocessed captures - Claude triage here |
| **Review** | Weekly/daily review - combines calendar + stats |

Projects become a filter/dropdown, not a separate view.

---

### 3.2 Cleaner Command Center (→ "Today" View)
**Priority:** HIGH
**Files:** `renderer.js`, `styles.css`

Streamline layout:
```
┌─────────────────────────────────────────────────┐
│ [Quick Add Input]                    [Stats]    │
├─────────────────────────────────────────────────┤
│                                                 │
│   TIME      SCHEDULED                QUEUE      │
│   ────      ─────────                ─────      │
│   6:00  │   [Task block]         │  ○ Task 1   │
│   6:30  │   [Task block]         │  ○ Task 2   │
│   7:00  │   [Empty - drop zone]  │  ○ Task 3   │
│   7:30  │   [Task block]         │  ...        │
│   ...                                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Remove for now:**
- Dual-track (AI vs Manual) - simplify to single timeline
- Brain dumps section (move to Inbox)
- Claude Queue (integrate into main queue)

---

### 3.3 Focus Mode Simplification
**Priority:** LOW
**Files:** `renderer.js`, `focus-pill.html`, `styles.css`

Keep focus mode but simplify:
- Remove Pomodoro timer (or make optional)
- Just show: Current task + time elapsed + Skip/Complete buttons
- Pill widget: task name only, click to expand

---

## Phase 4: MCP Tool Consolidation

### 4.1 Essential Tools (Keep)
**Priority:** MEDIUM
**Files:** `mcp-server/index.js`

**Core (10 tools):**
1. `capture` - Quick task or brain dump
2. `get_inbox` - Unprocessed items
3. `get_today` - Today's scheduled + due
4. `process_inbox` - Claude triages all inbox items
5. `plan_day` - Claude creates today's schedule
6. `schedule_task` - Set time for task
7. `complete_task` - Mark done
8. `update_task` - Modify task
9. `daily_recap` - End of day summary
10. `ask_claude` - Free-form task assistance

### 4.2 Tools to Deprecate/Merge
- Merge `set_scheduled_time` + `bulk_schedule_today` → `schedule_task`
- Merge `suggest_priority` + `prioritize_inbox` → part of `process_inbox`
- Remove `set_execution_type`, `suggest_parallel_tasks`, `get_parallel_schedule` (dual-track removed)
- Merge various `get_*_tasks` into filtered `get_tasks`

---

## Phase 5: Data Model Simplification

### 5.1 Task Model Update
**Files:** `main.js`, `renderer.js`, `mcp-server/index.js`

```javascript
// Simplified task
{
  id: string,
  name: string,
  notes: string,        // Replaces description + context
  status: 'inbox' | 'todo' | 'doing' | 'done',
  priority: 0-4,        // 0=none, 1=low, 2=med, 3=high, 4=urgent
  due: 'YYYY-MM-DD',
  scheduled: 'YYYY-MM-DDTHH:MM',  // Combined date+time
  estimate: number,     // Minutes (default 30)
  project: string,      // Project ID reference
  subtasks: [],
  created: ISO,
  completed: ISO
}
```

**Migration:** Write one-time migration in `loadData()`.

---

## Implementation Order

### Week 1: Critical Fixes (COMPLETED 2026-02-01)
- [x] 1.1 Fix global shortcut (with fallback to Ctrl+Alt+N and Ctrl+Shift+N)
- [x] 1.2 Implement half-hour time slots (34 slots from 6:00 AM to 10:30 PM)
- [x] 2.1 Add comprehensive keyboard shortcuts (N, B, T, I, C, P, J, K, Space, Enter, E, 1-4, F, ?)
- [x] 3.2 Streamline Today view (single-track timeline, removed dual AI/Manual tracks)

### Week 2: Speed Improvements (TODO)
- [ ] 2.2 Inline quick add
- [ ] 2.3 Smart defaults

### Week 3: UI Consolidation (TODO)
- [ ] 3.1 Consolidate to 3 views
- [ ] 3.3 Simplify focus mode
- [ ] Polish animations and transitions

### Week 4: Backend Cleanup (TODO)
- [ ] 4.1 Consolidate MCP tools
- [ ] 5.1 Migrate data model
- [ ] Final testing and bug fixes

---

## Testing Checklist

- [ ] Global shortcut works from any app
- [ ] Half-hour slots display correctly
- [ ] Drag-and-drop to slots works
- [ ] Keyboard navigation is intuitive
- [ ] MCP tools work with Claude Desktop
- [ ] Data migration preserves existing tasks
- [ ] Focus mode pill works
- [ ] Export/import still functions

---

## Files to Modify

| File | Changes |
|------|---------|
| `main.js` | Shortcut fix, add fallback, notifications |
| `renderer.js` | Timeline rewrite, keyboard nav, view consolidation |
| `index.html` | Remove extra nav items, add inline quick add |
| `styles.css` | Half-hour slot styles, simplified layouts |
| `mcp-server/index.js` | Consolidate tools, update handlers |
| `quick-capture.html` | Minor tweaks if needed |

---

## Questions to Resolve

1. **Time range:** Keep 6 AM - 10 PM, or make configurable?
2. **Dual-track removal:** Archive the code or delete entirely?
3. **MCP backwards compatibility:** Keep old tool names as aliases?
4. **Projects:** Keep as folders or just use tags?

---

*Plan created: 2026-02-01*
*To execute: Run each section's tasks in order, testing between phases*
