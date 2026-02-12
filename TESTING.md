# TaskFlow PM - Testing Guidelines

## Testing Process

After each implementation phase:
1. Restart the app (`npm start`)
2. Run through the relevant test cases below
3. Mark tests as PASS/FAIL
4. Fix any failures before moving to next phase

---

## Phase 1: Critical Fixes

### Test 1.1: Global Shortcut
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.1.1 | Primary shortcut works | Press `Ctrl+Shift+Space` from desktop | Quick capture window opens | [ ] |
| 1.1.2 | Fallback shortcut works | Press `Ctrl+Alt+N` from desktop | Quick capture window opens | [ ] |
| 1.1.3 | Shortcut works from other apps | Open Notepad, press shortcut | Quick capture window opens over Notepad | [ ] |
| 1.1.4 | Capture saves task | Enter task name, press Enter | Task appears in Inbox | [ ] |
| 1.1.5 | Capture with context | Enter name + brain dump, save | Task has context field populated | [ ] |
| 1.1.6 | Escape closes capture | Press Esc in capture window | Window closes, no task created | [ ] |

### Test 1.2: Half-Hour Time Slots
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.2.1 | Slots display correctly | Go to Today/Command Center | See 6:00, 6:30, 7:00, 7:30... slots | [ ] |
| 1.2.2 | Correct number of slots | Count slots | 34 slots (6:00 AM to 11:30 PM) or configured range | [ ] |
| 1.2.3 | Drop zone on :00 slots | Drag task to 7:00 slot | Task scheduled for 7:00 | [ ] |
| 1.2.4 | Drop zone on :30 slots | Drag task to 7:30 slot | Task scheduled for 7:30 | [ ] |
| 1.2.5 | Task picker on click | Click empty 8:30 slot | Task picker modal opens | [ ] |
| 1.2.6 | Now indicator correct | Check current time slot | NOW marker at correct half-hour | [ ] |
| 1.2.7 | Scheduled task displays | Schedule task for 9:00 | Task block shows in 9:00 row | [ ] |
| 1.2.8 | Remove scheduled task | Click X on scheduled task | Task unscheduled, returns to queue | [ ] |

---

## Phase 2: Speed Improvements

### Test 2.1: Keyboard Navigation
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.1.1 | N opens quick add | Press `N` key | Quick add input focused | [ ] |
| 2.1.2 | T goes to Today | Press `T` key | Today view loads | [ ] |
| 2.1.3 | I goes to Inbox | Press `I` key | Inbox view loads | [ ] |
| 2.1.4 | C goes to Command Center | Press `C` key | Command Center loads | [ ] |
| 2.1.5 | J moves down | Press `J` in task list | Selection moves to next task | [ ] |
| 2.1.6 | K moves up | Press `K` in task list | Selection moves to previous task | [ ] |
| 2.1.7 | Space toggles complete | Select task, press `Space` | Task marked complete/incomplete | [ ] |
| 2.1.8 | Enter opens task | Select task, press `Enter` | Task detail modal opens | [ ] |
| 2.1.9 | Esc closes modal | Open modal, press `Esc` | Modal closes | [ ] |
| 2.1.10 | ? shows help | Press `?` key | Keyboard shortcuts overlay shows | [ ] |
| 2.1.11 | Keys ignored in input | Focus input, press `N` | Types "n", doesn't open quick add | [ ] |

### Test 2.2: Inline Quick Add
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.2.1 | Input visible | Load Today view | Quick add input at top | [ ] |
| 2.2.2 | Enter creates task | Type name, press Enter | Task created, input clears | [ ] |
| 2.2.3 | Empty input ignored | Press Enter with empty input | Nothing happens | [ ] |
| 2.2.4 | Auto-focus on view | Navigate to view | Input auto-focused | [ ] |

---

## Phase 3: UI Simplification

### Test 3.1: Simplified Timeline (Single Track)
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.1.1 | Single timeline column | View Command Center | One task column, no AI/Manual split | [ ] |
| 3.1.2 | All tasks in one track | Schedule different task types | All appear in same timeline | [ ] |
| 3.1.3 | Drag and drop works | Drag task to time slot | Task schedules correctly | [ ] |
| 3.1.4 | Layout is cleaner | Visual inspection | Less cluttered, more whitespace | [ ] |

### Test 3.2: View Consolidation
| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.2.1 | Three main views | Check navigation | Today, Inbox, Review visible | [ ] |
| 3.2.2 | Projects as filter | Look for project selector | Dropdown/filter, not separate view | [ ] |

---

## Regression Tests

Run these after ANY change to ensure nothing broke:

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| R.1 | App starts | Run `npm start` | Window opens without errors | [ ] |
| R.2 | Data loads | Check for existing tasks | Previous tasks visible | [ ] |
| R.3 | Create task | Add new task manually | Task saves and displays | [ ] |
| R.4 | Complete task | Click checkbox | Task marked done | [ ] |
| R.5 | Delete task | Delete a task | Task removed | [ ] |
| R.6 | Data persists | Restart app | All tasks still there | [ ] |
| R.7 | Focus mode | Start focus mode | Timer and task display work | [ ] |
| R.8 | Export data | Use export function | JSON file downloads | [ ] |
| R.9 | Console errors | Open DevTools (F12) | No red errors in console | [ ] |

---

## How to Run Tests

### Before Testing
```bash
# Make sure you're in the project directory
cd "C:\Users\vince\OneDrive\Vincenzo\Claude\To Do Software"

# Install dependencies if needed
npm install

# Start the app
npm start
```

### During Testing
- Keep DevTools open (F12 or Ctrl+Shift+I)
- Watch console for errors
- Note any unexpected behavior

### After Testing
- Update this file with PASS [x] or FAIL [!] status
- Note any bugs found in the Issues section below

---

## Known Issues / Bugs Found

| Date | Issue | Severity | Status |
|------|-------|----------|--------|
| | | | |

---

## Test Environment

- **OS:** Windows
- **Electron:** 28.x
- **Node:** (run `node --version`)
- **Last tested:**

---

*Testing doc created: 2026-02-01*
