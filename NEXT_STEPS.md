# TaskFlow PM - Next Steps

Last updated: February 1, 2026

## Recently Completed

- [x] Dual-track timeline (Claude vs Manual execution types)
- [x] MCP tool consolidation (41 -> 35 focused tools)
- [x] 3 new parallel execution tools (set_execution_type, suggest_parallel_tasks, get_parallel_schedule)
- [x] Click-to-schedule functionality (click empty slot -> task picker modal)
- [x] Drag-and-drop from Focus Queue to timeline
- [x] Remove button on scheduled tasks (hover to reveal)
- [x] Visual improvements to timeline (colors, spacing, current hour highlighting)
- [x] **P2.1 Ghost Preview** - Semi-transparent task card follows cursor while dragging
- [x] **P2.2 Enhanced Drop Feedback** - Pulsing glow on valid zones, tooltips, past-time validation
- [x] **P3.1 Context Menu** - Right-click menu with Edit, Schedule, Priority, Complete, Duplicate, Delete
- [x] **P3.2 Inline Edit** - Double-click task name to edit in place (Enter/Escape to save/cancel)
- [x] **P3.3 Task Resize** - Drag bottom edge of timeline tasks to change duration

---

## Priority 1: Timeline Polish

### 1.1 Half-Hour Slots
- [ ] Add 30-minute granularity (9:00, 9:30, 10:00, etc.)
- [ ] Update time display to show `:00` and `:30`
- [ ] Adjust row heights for half-hour slots (maybe 40px instead of 70px)

### 1.2 Duration-Based Task Heights
- [ ] Tasks should visually span their duration (30min = 1 slot, 60min = 2 slots)
- [ ] Use CSS `grid-row: span X` or absolute positioning
- [ ] Handle overlapping tasks gracefully

### 1.3 Today Summary Bar
- [ ] Add bar at top of timeline showing: "4h scheduled | 2h Claude | 2h You"
- [ ] Color-coded segments matching track colors
- [ ] Click to scroll to first unfinished task

### 1.4 Visual Hierarchy
- [ ] Dim past hours more (opacity 0.3)
- [ ] Add subtle horizontal grid lines between hours
- [ ] "UP NEXT" badge on the next upcoming task
- [ ] Subtle animation when task becomes current

---

## Priority 2: Drag & Drop Enhancements (COMPLETED)

### 2.1 Ghost Preview
- [x] Show semi-transparent task card while dragging
- [x] Preview follows cursor with task name, priority, duration
- [x] Custom drag image replaces default browser preview

### 2.2 Better Drop Feedback
- [x] Pulsing/glowing effect on valid drop zones during drag
- [x] Show time label when hovering over a slot ("Schedule at 9:00 AM")
- [x] Invalid zones (past times) show "Cannot schedule in past"

### 2.3 Drag Between Tracks
- [ ] Allow dragging scheduled tasks between AI and Manual tracks
- [ ] This changes their `executionType`
- [ ] Visual feedback showing track change

---

## Priority 3: Task Interactions (COMPLETED)

### 3.1 Right-Click Context Menu
- [x] Create reusable context menu component
- [x] Options: Edit, Schedule, Set Priority (submenu), Complete, Duplicate, Delete
- [x] Position near cursor, handles edge cases (screen edges)
- [x] SVG icons, keyboard shortcuts shown, clean text-only design

### 3.2 Quick Edit
- [x] Double-click task name to edit inline
- [x] Enter to save, Escape to cancel
- [x] Works on task items, focus queue, and timeline blocks

### 3.3 Resize Tasks
- [x] Drag bottom edge of timeline task blocks to resize duration
- [x] Snaps to 30-minute increments (min 15m, max 4h)
- [x] Visual preview shows new duration while dragging
- [x] Updates `estimatedMinutes` on release

---

## Priority 4: Calendar View Improvements

### 4.1 Week View
- [ ] Add week view toggle in Command Center
- [ ] Show 7 days side by side (compact)
- [ ] Drag tasks between days

### 4.2 Month Overview
- [ ] Mini calendar showing task density per day
- [ ] Color intensity = more tasks
- [ ] Click day to jump to that day's schedule

---

## Priority 5: Focus Mode Enhancements

### 5.1 Integration with Timeline
- [ ] When in Focus Mode, highlight current task on timeline
- [ ] Auto-scroll timeline to current task
- [ ] Show "In Focus" badge on task

### 5.2 Focus Statistics
- [ ] Track focus sessions per day/week
- [ ] Show "Deep Work Hours" metric
- [ ] Streak counter for consecutive focus days

---

## Priority 6: AI/Claude Integration

### 6.1 Smarter Suggestions
- [ ] `suggest_parallel_tasks` considers task dependencies
- [ ] Time-of-day optimization (creative work in morning, admin in afternoon)
- [ ] Energy level consideration (if user tracks it)

### 6.2 Auto-Scheduling
- [ ] "Auto-fill my day" button
- [ ] Claude suggests optimal schedule based on priorities and estimates
- [ ] User reviews and adjusts before confirming

### 6.3 Progress Insights
- [ ] End-of-day summary from Claude
- [ ] "You completed 5 tasks, 3 with Claude's help"
- [ ] Suggestions for tomorrow based on patterns

---

## Priority 7: Quality of Life

### 7.1 Keyboard Navigation
- [ ] Arrow keys to navigate timeline
- [ ] Enter to expand/edit task
- [ ] `n` to create new task
- [ ] `f` to start focus mode
- [ ] `?` to show keyboard shortcuts

### 7.2 Undo/Redo
- [ ] Implement undo stack for task changes
- [ ] Ctrl+Z to undo, Ctrl+Shift+Z to redo
- [ ] Toast notification with "Undo" button

### 7.3 Responsive Design
- [ ] Collapse to single track on narrow screens
- [ ] Mobile-friendly touch interactions
- [ ] Swipe gestures for common actions

---

## Technical Debt

- [ ] Split `renderer.js` into modules (timeline.js, focusMode.js, etc.)
- [ ] Add JSDoc comments to key functions
- [ ] Create unit tests for MCP tools
- [ ] Add error boundaries and better error handling
- [ ] Optimize re-renders (currently re-renders entire view)

---

## Ideas Backlog (Not Prioritized)

- Recurring tasks
- Task templates
- Collaboration features (share schedule)
- Calendar integration (Google Calendar sync)
- Mobile companion app
- Voice input for quick capture
- Natural language task creation ("Meeting with John tomorrow at 3pm")
- Time tracking with reports
- Task dependencies visualization
- Habit tracking integration

---

## How to Use This File

When starting a new Claude session:
1. Claude will read `CLAUDE.md` for project context
2. Reference this file: "Read NEXT_STEPS.md and let's work on [priority area]"
3. Pick a specific task to implement
4. Update checkboxes as items are completed

Example prompt:
> "I want to continue working on TaskFlow PM. Read NEXT_STEPS.md and let's implement the half-hour slots feature from Priority 1."
