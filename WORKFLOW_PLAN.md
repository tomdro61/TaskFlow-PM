# TaskFlow PM - Workflow Plan

## Core Philosophy

**The App = Visual Command Center** - See everything at a glance, make decisions, track progress
**Claude = Tireless Execution Partner** - Does the heavy lifting, works while you sleep

---

## Daily Workflow

### 1. MORNING PLANNING (5-10 min)

**What happens:**
1. Open TaskFlow - land on Today view
2. See overnight results (what Claude completed while you slept)
3. Review inbox/brain dumps from yesterday
4. Ask Claude: "Plan my day"
   - Claude analyzes priorities, deadlines, energy patterns
   - Suggests a schedule with time blocks
5. Review and approve in the app (one-click or drag to adjust)

**Key MCP Tools:**
- `get_inbox_tasks` - Show unprocessed items
- `get_overnight_results` - What Claude completed
- `plan_my_day` - Generate suggested schedule
- `bulk_schedule_today` - Apply the plan

**App Features Needed:**
- Morning Planning modal (exists)
- Overnight Results section (new)
- One-click "Apply Claude's Plan" button

---

### 2. QUICK CAPTURE (Throughout the day)

**What happens:**
1. Thought/idea pops into head
2. Press `Ctrl+Shift+Space` (global shortcut)
3. Type raw thought, hit Enter
4. Back to work - Claude will process it later

**Key MCP Tools:**
- `capture` - Quick add to inbox
- `process_brain_dump` - Claude extracts tasks from raw text

**App Features Needed:**
- Global quick capture (exists)
- Brain dump with context prompts (exists)
- Visual indicator that capture succeeded

---

### 3. EXECUTION TRACKING (During work hours)

**Two parallel tracks:**

#### Track A: YOU (Manual Tasks)
- Meetings, calls, decisions, hands-on work
- Use Focus Mode for deep work blocks
- Check off tasks as you complete them
- App shows your progress

#### Track B: CLAUDE (AI Tasks)
- Research, writing, code generation, analysis
- Claude works in background via MCP
- You see progress in the app
- Review/approve Claude's output

**Key MCP Tools:**
- `get_today_tasks` - What's on deck
- `complete_task` - Mark done
- `update_task` - Add notes/changes
- `get_focus_task` - Current focus item

**App Features Needed:**
- Today's Schedule (timeline view)
- Focus Mode with timer (exists)
- Task progress indicators
- Claude activity feed (new)

---

### 4. AFTERNOON CHECK-IN (Optional, 2 min)

**What happens:**
1. Quick glance at progress
2. Adjust remaining schedule if needed
3. Add anything that came up to overnight queue

**Key MCP Tools:**
- `get_today_tasks` - Status check
- `add_to_overnight_queue` - Queue for later

---

### 5. END OF DAY REVIEW (5 min)

**What happens:**
1. Review what got done (you + Claude)
2. Note any learnings/decisions
3. Queue tasks for Claude overnight
4. Quick reflection/recap

**Key MCP Tools:**
- `daily_recap` - Generate summary
- `add_recap_entry` - Log accomplishments
- `save_recap` - Archive the day
- `set_overnight_queue` - What Claude works on tonight

**App Features Needed:**
- Daily Review modal (exists)
- Recap log (exists)
- Overnight Queue section (new)

---

### 6. OVERNIGHT (While you sleep)

**What happens:**
1. Claude works through overnight queue
2. Generates drafts, research, code
3. Results ready for morning review

**Key MCP Tools:**
- `get_overnight_queue` - What to work on
- `complete_task` - Mark done
- `add_task_output` - Attach results

**App Features Needed:**
- Overnight Queue management (new)
- Results review in morning

---

## Key Views Needed

### 1. TODAY (Primary View)
```
+----------------------------------+------------------+
|  TODAY'S SCHEDULE                |  FOCUS QUEUE     |
|  +-----------+-----------+       |  1. Task A       |
|  | TIME      | TASK      |       |  2. Task B       |
|  | 9:00 AM   | Meeting   |       |  3. Task C       |
|  | 10:00 AM  | [empty]   |       |                  |
|  | 10:30 AM  | Deep work |       |  BRAIN DUMPS     |
|  | ...       | ...       |       |  - Raw thought 1 |
|  +-----------+-----------+       |  - Raw thought 2 |
|                                  |                  |
|  [Start Focus] [Plan Day]        |  OVERNIGHT QUEUE |
+----------------------------------+  - Task for Claude|
                                   +------------------+
```

### 2. INBOX
- Unprocessed captures
- Brain dumps awaiting Claude processing
- Quick triage: Schedule / Delegate to Claude / Delete

### 3. REVIEW
- Daily/weekly recaps
- Accomplishments log
- Trends and patterns

---

## What to Build Next (Priority Order)

### Phase 1: Fix Core Flow
1. **Fix the Today view rendering** - Make sure it loads properly on startup
2. **Simplify the timeline** - Remove dual-track complexity, single column works
3. **Make click-to-schedule work** - Click empty slot, pick task, done

### Phase 2: Claude Integration
1. **Overnight Queue** - Section to queue tasks for Claude
2. **Morning Results** - Show what Claude completed
3. **"Plan My Day" button** - One-click to let Claude schedule

### Phase 3: Polish
1. Drag-and-drop (nice to have, not essential)
2. Right-click context menus
3. Inline editing
4. Animations and transitions

---

## Questions to Resolve

1. **Overnight execution**: How does Claude actually run overnight tasks?
   - Option A: You leave Claude Desktop open, manually trigger
   - Option B: Scheduled automation (cron job calling Claude API)
   - Option C: Just a "queue" that you process next Claude session

2. **Task output**: Where do Claude's results go?
   - Option A: Attached to the task as a note/file
   - Option B: Separate "Claude Output" view
   - Option C: Copied to clipboard for you to paste

3. **Scheduling granularity**:
   - 30-minute blocks? 15-minute? Hourly?
   - Strict times vs. rough ordering?

---

## Next Steps

1. You approve/modify this workflow
2. I fix the core Today view (no drag needed - just click to schedule)
3. We add the Overnight Queue feature
4. We test the full morning-to-night workflow
