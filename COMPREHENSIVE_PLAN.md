# TaskFlow PM - Comprehensive Plan

Based on detailed requirements gathering. This is the definitive plan.

---

## User Profile

- **Task volume**: 20-50 tasks/day (high volume)
- **App usage**: Always open as dashboard
- **Primary pain points**: Context switching, losing track of things
- **Work style**: Full keyboard-driven, minimal time in app organizing
- **Claude integration**: Claude Desktop with MCP

---

## Core Philosophy

```
+------------------+     +------------------+     +------------------+
|    CAPTURE       | --> |    PROCESS       | --> |    EXECUTE       |
| (Brain dumps,    |     | (Claude extracts |     | (You do manual,  |
|  quick thoughts) |     |  tasks, suggests |     |  Claude does AI  |
|                  |     |  priorities)     |     |  tasks)          |
+------------------+     +------------------+     +------------------+
```

**You**: Make decisions, do manual work, review Claude's output
**Claude**: Process brain dumps, prioritize, schedule, execute AI tasks
**App**: Visual command center, always-open dashboard, keyboard-driven

---

## Requirements Summary

### Scheduling
- **Granularity**: 15-minute blocks
- **Methods**: Click slot, drag task, ask Claude, type time - ALL should work
- **Rollover**: Unfinished tasks auto-move to tomorrow

### Tasks
- **Types**: Coding, research, writing, meetings - all types
- **Estimates**: Specific minutes (15m, 30m, 1h, etc.)
- **Priorities**: Claude suggests based on context
- **Completed**: Hide immediately for clean view

### Projects
- **Structure**: Many small projects (dozens), hierarchical (projects > tasks)
- **Recurring**: Daily habits supported

### Brain Dumps
- **Formats**: One-liners, paragraphs, voice transcripts - all formats
- **Processing**: Claude produces summary + extracted tasks + clarifying questions

### Claude Integration
- **Timing options**:
  1. Immediately when assigned
  2. Overnight batch (while sleeping)
  3. Parallel (while you do manual tasks)
- **Overnight queue**: Research, writing drafts, code generation, analysis
- **Updates**: Not real-time, just show results when checking

### Daily Workflow
- **Morning**: See overnight results + today's schedule
- **During day**: Quick capture, focus sessions, Claude works parallel
- **End of day**: Review accomplishments, prep tomorrow

### Focus Mode
- **Style**: Time-boxed with custom duration (not strict Pomodoro)

### Offline
- **Required**: Must work fully without internet/Claude

### UI/UX
- **Layout**: Compact list (dense, many tasks visible)
- **Keyboard**: Full keyboard-driven workflow, all shortcuts matter

---

## Revised Architecture

### Main View: Command Center (Always Open)

```
+------------------------------------------------------------------------+
|  [Today] [Inbox] [Projects] [Review]            [Quick Add] [Focus]    |
+------------------------------------------------------------------------+
|                                                                         |
|  SCHEDULE (Left 60%)                    |  QUEUE (Right 40%)            |
|  +----------------------------------+   |  +-------------------------+  |
|  | TIME    | TASK                   |   |  | FOCUS QUEUE             |  |
|  |---------|------------------------|   |  | [ ] Task 1 (30m)        |  |
|  | 6:00 AM | [empty - click to add] |   |  | [ ] Task 2 (15m)        |  |
|  | 6:15 AM | [empty]                |   |  | [ ] Task 3 (45m)        |  |
|  | 6:30 AM | Morning routine        |   |  | [ ] Task 4 (30m)        |  |
|  | 6:45 AM | [empty]                |   |  | ...                     |  |
|  | 7:00 AM | Review Claude results  |   |  +-------------------------+  |
|  | 7:15 AM | [empty]                |   |                               |
|  | ...     | ...                    |   |  +-------------------------+  |
|  +----------------------------------+   |  | BRAIN DUMPS             |  |
|                                         |  | - Raw thought 1         |  |
|  +----------------------------------+   |  | - Raw thought 2         |  |
|  | CLAUDE OVERNIGHT RESULTS         |   |  +-------------------------+  |
|  | [x] Research on topic X - Done   |   |                               |
|  | [x] Draft email to Y - Review    |   |  +-------------------------+  |
|  | [ ] Code for Z - In Progress     |   |  | OVERNIGHT QUEUE         |  |
|  +----------------------------------+   |  | + Add task for Claude   |  |
|                                         |  | - Research ABC          |  |
+------------------------------------------------------------------------+
|  Status: 12 tasks today | 5 done | Next: "Review email draft"          |
+------------------------------------------------------------------------+
```

### Key Sections

1. **Schedule (Timeline)**
   - 15-minute slots from 6 AM to 10 PM
   - Click empty slot to add task
   - Shows current time indicator
   - Compact: just time + task name

2. **Focus Queue**
   - Ordered list of tasks to do
   - Checkbox to complete (hides immediately)
   - Shows estimate in minutes
   - Click to see details

3. **Brain Dumps**
   - Raw unprocessed captures
   - Click to have Claude process
   - Shows preview of content

4. **Overnight Queue**
   - Tasks queued for Claude
   - Add button to queue new
   - Status of overnight work

5. **Claude Overnight Results**
   - What Claude completed
   - Click to review output
   - Approve/edit/redo options

---

## Keyboard Shortcuts

### Navigation
| Key | Action |
|-----|--------|
| `T` | Go to Today |
| `I` | Go to Inbox |
| `P` | Go to Projects |
| `R` | Go to Review |
| `J` / `K` | Move down/up in list |
| `Enter` | Open selected task |
| `Esc` | Close modal/deselect |

### Actions
| Key | Action |
|-----|--------|
| `N` | New task |
| `B` | New brain dump |
| `Space` | Complete selected task |
| `E` | Edit selected task |
| `D` | Delete selected task |
| `S` | Schedule selected task |
| `Q` | Add to overnight queue |
| `F` | Start focus session |

### Global
| Key | Action |
|-----|--------|
| `Ctrl+Shift+Space` | Quick capture (global) |
| `Ctrl+Shift+F` | Start focus (global) |
| `?` | Show all shortcuts |

---

## MCP Tools Needed

### Core CRUD
- `create_task` - Add new task
- `update_task` - Modify task
- `delete_task` - Remove task
- `complete_task` - Mark done
- `get_task` - Get single task details

### Views
- `get_today_tasks` - Today's scheduled tasks
- `get_inbox_tasks` - Unprocessed items
- `get_focus_queue` - Prioritized task list
- `get_overnight_queue` - Tasks for Claude
- `get_overnight_results` - What Claude completed

### Brain Dump Processing
- `process_brain_dump` - Extract tasks from raw text
- `suggest_tasks` - Claude suggests tasks from context

### Scheduling
- `schedule_task` - Set time for a task
- `plan_my_day` - Claude creates schedule
- `reschedule_overdue` - Move unfinished to tomorrow

### Overnight
- `add_to_overnight` - Queue task for Claude
- `start_overnight_work` - Begin processing queue
- `get_overnight_status` - Check progress

### Reviews
- `daily_recap` - Generate day summary
- `get_accomplishments` - What got done
- `prep_tomorrow` - Suggest tomorrow's priorities

---

## Implementation Phases

### Phase 1: Fix Core View (This Week)
1. Fix Today view rendering on startup
2. Implement 15-minute timeline slots
3. Click-to-schedule (click slot → pick task)
4. Complete task → hide immediately
5. Basic keyboard navigation (J/K/Space/Enter)

### Phase 2: Claude Integration (Next Week)
1. Overnight Queue section
2. Add to queue shortcut (Q)
3. Overnight Results display
4. "Plan My Day" button → Claude schedules
5. Brain dump processing flow

### Phase 3: Polish (Week After)
1. Full keyboard shortcuts
2. Focus Mode (time-boxed)
3. Daily review flow
4. Recurring daily habits
5. Project hierarchy

### Phase 4: Advanced (Future)
1. Drag-and-drop scheduling
2. Voice capture integration
3. Claude working in parallel
4. Real-time progress (if needed later)

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Morning view | Overnight results + Today schedule |
| Scheduling method | All methods (click, drag, Claude, type) |
| Time granularity | 15 minutes |
| Task estimates | Specific minutes |
| Priorities | Claude decides |
| Completed tasks | Hide immediately |
| Rollover | Auto-move to tomorrow |
| Focus mode | Time-boxed, custom duration |
| Layout | Compact list, dense view |
| Keyboard | Full keyboard-driven |
| Offline | Must work without Claude |
| Claude timing | Immediate, overnight, or parallel |

---

## Next Steps

1. **You approve this plan** (or suggest changes)
2. **I implement Phase 1** - Fix core view, click-to-schedule
3. **We test** the basic workflow
4. **Iterate** based on real usage

---

## Files to Modify

| File | Changes |
|------|---------|
| `renderer.js` | Fix initial render, 15-min slots, click-to-schedule |
| `styles.css` | Compact list layout, dense timeline |
| `index.html` | Update layout structure |
| `mcp-server/index.js` | Add overnight queue tools |

---

*Plan created: February 1, 2026*
*Ready for approval before implementation*
