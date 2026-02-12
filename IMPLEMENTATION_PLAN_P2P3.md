# TaskFlow PM - Implementation Plan: Verification + Priority 2 & 3

*Created: February 1, 2026*

---

## Part 1: Verification Checklist

Before adding new features, verify everything currently works.

### 1.1 Quick Verification Tests

Run the app and test each item:

```bash
cd "C:\Users\vince\OneDrive\Vincenzo\Claude\To Do Software"
npm start
```

| Test | How to Verify | Status |
|------|---------------|--------|
| **App Launches** | `npm start` - main window appears | [ ] |
| **Global Shortcut** | Press `Ctrl+Shift+Space` from desktop | [ ] |
| **Fallback Shortcut** | If above fails, try `Ctrl+Alt+N` | [ ] |
| **Quick Capture** | Type text, press Enter - saves to Inbox | [ ] |
| **View Navigation** | Click Today, Inbox, Command Center | [ ] |
| **Keyboard Nav** | Press `T`, `I`, `C` to switch views | [ ] |
| **Create Task** | Press `N`, type name, save | [ ] |
| **Create Brain Dump** | Press `B`, add context, save | [ ] |
| **Task Selection** | Press `J`/`K` to move up/down | [ ] |
| **Complete Task** | Select task, press `Space` | [ ] |
| **Priority Cycle** | Select task, press `E` or `1-4` | [ ] |
| **Timeline Display** | View Today - see 30-min slots | [ ] |
| **Drag to Timeline** | Drag from Focus Queue to slot | [ ] |
| **Click to Schedule** | Click empty slot, pick task | [ ] |
| **Focus Mode** | Press `F` to start focus | [ ] |
| **Focus Pill** | In focus mode, click "Floating Pill" | [ ] |
| **Data Persistence** | Close app, reopen - tasks remain | [ ] |
| **Keyboard Help** | Press `?` - shortcuts modal appears | [ ] |

### 1.2 MCP Server Verification

Test MCP tools work (requires Claude Desktop configured):

```bash
# In Claude Desktop, test these commands:
# "Show my tasks for today"
# "Create a task called 'Test task' with high priority"
# "What's in my inbox?"
```

---

## Part 2: Priority 2 - Drag & Drop Enhancements

### 2.1 Ghost Preview While Dragging

**Goal:** Show semi-transparent task card following cursor during drag.

**Files to modify:**
- `renderer.js` (drag event handlers)
- `styles.css` (ghost styles)

**Implementation:**

```javascript
// In renderer.js - update bindDragAndDrop() or create new method

createDragGhost(task) {
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.innerHTML = `
    <div class="ghost-content">
      <span class="ghost-priority priority-${task.priority}"></span>
      <span class="ghost-name">${this.escapeHtml(task.name)}</span>
      <span class="ghost-time">${task.estimatedMinutes || 30}m</span>
    </div>
  `;
  document.body.appendChild(ghost);
  return ghost;
}

// In dragstart event:
handleDragStart(e, task) {
  this.draggedTask = task;
  this.dragGhost = this.createDragGhost(task);

  // Hide default drag image
  const emptyImg = new Image();
  e.dataTransfer.setDragImage(emptyImg, 0, 0);
}

// In drag event (fires continuously):
handleDrag(e) {
  if (this.dragGhost && e.clientX && e.clientY) {
    this.dragGhost.style.left = `${e.clientX + 10}px`;
    this.dragGhost.style.top = `${e.clientY + 10}px`;
  }
}

// In dragend event:
handleDragEnd() {
  if (this.dragGhost) {
    this.dragGhost.remove();
    this.dragGhost = null;
  }
  this.draggedTask = null;
}
```

**CSS additions:**

```css
/* styles.css - add to drag and drop section */

.drag-ghost {
  position: fixed;
  pointer-events: none;
  z-index: 10000;
  opacity: 0.85;
  transform: rotate(2deg);
  transition: none;
}

.ghost-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--card-background);
  border: 2px solid var(--primary-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  font-size: 14px;
  white-space: nowrap;
}

.ghost-priority {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ghost-name {
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ghost-time {
  color: var(--text-muted);
  font-size: 12px;
}
```

---

### 2.2 Better Drop Zone Feedback

**Goal:** Glowing/pulsing effect on valid drop zones, time label on hover.

**Files to modify:**
- `renderer.js` (dragover/dragleave handlers)
- `styles.css` (drop zone animations)

**Implementation:**

```javascript
// In renderer.js - update timeline drop zone handlers

bindTimelineDropZones() {
  const dropZones = document.querySelectorAll('.timeline-drop-zone');

  dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      const time = zone.dataset.time;
      const isPast = this.isTimePast(time);

      if (isPast) {
        zone.classList.add('drop-invalid');
        zone.dataset.tooltip = 'Cannot schedule in past';
      } else {
        zone.classList.add('drop-active');
        zone.dataset.tooltip = `Drop to schedule at ${this.formatTime(time)}`;
      }
    });

    zone.addEventListener('dragleave', (e) => {
      zone.classList.remove('drop-active', 'drop-invalid');
      delete zone.dataset.tooltip;
    });

    zone.addEventListener('drop', (e) => {
      zone.classList.remove('drop-active', 'drop-invalid');
      // ... existing drop logic
    });
  });
}

isTimePast(time) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const slotTime = new Date();
  slotTime.setHours(hours, minutes, 0, 0);
  return slotTime < now;
}

formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}
```

**CSS additions:**

```css
/* styles.css - enhanced drop zone feedback */

.timeline-drop-zone {
  position: relative;
  transition: all 0.15s ease;
}

.timeline-drop-zone.drop-active {
  background: rgba(99, 102, 241, 0.15);
  box-shadow: inset 0 0 0 2px var(--primary-color);
  animation: dropPulse 1s ease-in-out infinite;
}

.timeline-drop-zone.drop-invalid {
  background: rgba(239, 68, 68, 0.1);
  box-shadow: inset 0 0 0 2px var(--danger-color);
  cursor: not-allowed;
}

@keyframes dropPulse {
  0%, 100% {
    box-shadow: inset 0 0 0 2px var(--primary-color);
  }
  50% {
    box-shadow: inset 0 0 0 3px var(--primary-color),
                0 0 12px rgba(99, 102, 241, 0.4);
  }
}

/* Tooltip showing time */
.timeline-drop-zone[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  top: -30px;
  transform: translateX(-50%);
  padding: 4px 10px;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.timeline-drop-zone.drop-invalid[data-tooltip]::after {
  background: var(--danger-color);
  color: white;
  border-color: var(--danger-color);
}
```

---

### 2.3 Drag Tasks to Reschedule

**Goal:** Allow dragging already-scheduled tasks to new time slots.

**Implementation:**

```javascript
// In renderer.js - make scheduled task blocks draggable

renderTimelineTask(task, slot) {
  return `
    <div class="timeline-task-block"
         draggable="true"
         data-task-id="${task.id}"
         data-project-id="${task.projectId}">
      <!-- existing content -->
    </div>
  `;
}

// Bind drag events to scheduled tasks
bindScheduledTaskDrag() {
  document.querySelectorAll('.timeline-task-block').forEach(block => {
    block.addEventListener('dragstart', (e) => {
      const taskId = block.dataset.taskId;
      const projectId = block.dataset.projectId;
      const task = this.findTask(taskId, projectId);

      if (task) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          taskId: task.id,
          projectId: projectId,
          isReschedule: true
        }));
        this.handleDragStart(e, task);
        block.classList.add('dragging');
      }
    });

    block.addEventListener('dragend', (e) => {
      block.classList.remove('dragging');
      this.handleDragEnd();
    });
  });
}
```

**CSS:**

```css
.timeline-task-block {
  cursor: grab;
}

.timeline-task-block:active {
  cursor: grabbing;
}

.timeline-task-block.dragging {
  opacity: 0.4;
}
```

---

## Part 3: Priority 3 - Task Interactions

### 3.1 Right-Click Context Menu

**Goal:** Reusable context menu for task actions.

**Files to modify:**
- `renderer.js` (new ContextMenu class/methods)
- `index.html` (menu HTML)
- `styles.css` (menu styles)

**Implementation:**

```javascript
// In renderer.js - add context menu functionality

showContextMenu(e, task, projectId) {
  e.preventDefault();
  this.hideContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="context-menu-item" data-action="edit">
      <span class="menu-icon">✏️</span> Edit Task
    </div>
    <div class="context-menu-item" data-action="schedule">
      <span class="menu-icon">📅</span> Schedule...
    </div>
    <div class="context-menu-item" data-action="priority">
      <span class="menu-icon">🎯</span> Set Priority
      <span class="menu-arrow">›</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="complete">
      <span class="menu-icon">✓</span> Mark Complete
    </div>
    <div class="context-menu-item" data-action="duplicate">
      <span class="menu-icon">📋</span> Duplicate
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item context-menu-danger" data-action="delete">
      <span class="menu-icon">🗑️</span> Delete
    </div>
  `;

  // Position menu
  let x = e.clientX;
  let y = e.clientY;

  document.body.appendChild(menu);

  // Adjust if near edge
  const rect = menu.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) {
    x = window.innerWidth - rect.width - 10;
  }
  if (y + rect.height > window.innerHeight) {
    y = window.innerHeight - rect.height - 10;
  }

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  // Bind actions
  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      this.handleContextAction(action, task, projectId);
      this.hideContextMenu();
    });
  });

  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
  }, 0);

  this.contextMenu = menu;
}

hideContextMenu() {
  if (this.contextMenu) {
    this.contextMenu.remove();
    this.contextMenu = null;
  }
}

handleContextAction(action, task, projectId) {
  switch (action) {
    case 'edit':
      this.openTaskModal(task, projectId);
      break;
    case 'schedule':
      this.openScheduleModal(task, projectId);
      break;
    case 'complete':
      this.toggleTaskComplete(task.id, projectId);
      break;
    case 'duplicate':
      this.duplicateTask(task, projectId);
      break;
    case 'delete':
      if (confirm(`Delete "${task.name}"?`)) {
        this.deleteTask(task.id, projectId);
      }
      break;
  }
}

// Bind to task items
bindTaskContextMenu() {
  document.querySelectorAll('.task-item, .focus-queue-item, .timeline-task-block').forEach(el => {
    el.addEventListener('contextmenu', (e) => {
      const taskId = el.dataset.taskId;
      const projectId = el.dataset.projectId;
      const task = this.findTask(taskId, projectId);
      if (task) {
        this.showContextMenu(e, task, projectId);
      }
    });
  });
}
```

**CSS:**

```css
/* Context Menu Styles */

.context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 180px;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 6px 0;
  animation: contextMenuIn 0.15s ease-out;
}

@keyframes contextMenuIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.1s;
}

.context-menu-item:hover {
  background: var(--hover-background);
}

.context-menu-item.context-menu-danger {
  color: var(--danger-color);
}

.context-menu-item.context-menu-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.context-menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 6px 0;
}

.menu-icon {
  width: 18px;
  text-align: center;
}

.menu-arrow {
  margin-left: auto;
  color: var(--text-muted);
}
```

---

### 3.2 Quick Inline Edit

**Goal:** Double-click task name to edit inline.

**Implementation:**

```javascript
// In renderer.js

enableInlineEdit(taskElement, task, projectId) {
  const nameEl = taskElement.querySelector('.task-name');
  const originalText = task.name;

  nameEl.contentEditable = true;
  nameEl.focus();

  // Select all text
  const range = document.createRange();
  range.selectNodeContents(nameEl);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  nameEl.classList.add('editing');

  const finishEdit = (save) => {
    nameEl.contentEditable = false;
    nameEl.classList.remove('editing');

    if (save && nameEl.textContent.trim() !== originalText) {
      task.name = nameEl.textContent.trim();
      this.saveData();
    } else {
      nameEl.textContent = originalText;
    }
  };

  nameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEdit(true);
    } else if (e.key === 'Escape') {
      finishEdit(false);
    }
  }, { once: true });

  nameEl.addEventListener('blur', () => finishEdit(true), { once: true });
}

// Bind double-click
bindInlineEdit() {
  document.querySelectorAll('.task-item').forEach(el => {
    el.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('task-name')) {
        const taskId = el.dataset.taskId;
        const projectId = el.dataset.projectId;
        const task = this.findTask(taskId, projectId);
        if (task) {
          this.enableInlineEdit(el, task, projectId);
        }
      }
    });
  });
}
```

**CSS:**

```css
.task-name.editing {
  background: var(--input-background);
  padding: 2px 6px;
  border-radius: 4px;
  outline: 2px solid var(--primary-color);
  min-width: 100px;
}
```

---

### 3.3 Resize Tasks by Duration

**Goal:** Drag bottom edge of timeline task to resize.

**Implementation:**

```javascript
// In renderer.js

makeTaskResizable(taskBlock, task, projectId) {
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  taskBlock.appendChild(handle);

  let startY, startHeight, startMinutes;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    startY = e.clientY;
    startHeight = taskBlock.offsetHeight;
    startMinutes = task.estimatedMinutes || 30;

    taskBlock.classList.add('resizing');

    const onMouseMove = (e) => {
      const deltaY = e.clientY - startY;
      const slotHeight = 35; // Height of one 30-min slot
      const deltaSlots = Math.round(deltaY / slotHeight);
      const newMinutes = Math.max(15, startMinutes + (deltaSlots * 30));

      // Visual feedback
      taskBlock.style.height = `${startHeight + deltaY}px`;
      taskBlock.dataset.previewDuration = `${newMinutes}m`;
    };

    const onMouseUp = (e) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      taskBlock.classList.remove('resizing');
      taskBlock.style.height = '';
      delete taskBlock.dataset.previewDuration;

      const deltaY = e.clientY - startY;
      const slotHeight = 35;
      const deltaSlots = Math.round(deltaY / slotHeight);
      const newMinutes = Math.max(15, startMinutes + (deltaSlots * 30));

      if (newMinutes !== task.estimatedMinutes) {
        task.estimatedMinutes = newMinutes;
        this.saveData();
        this.render();
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}
```

**CSS:**

```css
.timeline-task-block {
  position: relative;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
  background: transparent;
  transition: background 0.15s;
}

.resize-handle:hover,
.timeline-task-block.resizing .resize-handle {
  background: var(--primary-color);
  border-radius: 0 0 4px 4px;
}

.timeline-task-block.resizing {
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.timeline-task-block[data-preview-duration]::after {
  content: attr(data-preview-duration);
  position: absolute;
  right: 8px;
  bottom: 12px;
  background: var(--primary-color);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}
```

---

## Implementation Order

### Step 1: Verification (30 mins)
1. Run through Part 1 checklist
2. Note any failures
3. Fix critical issues before proceeding

### Step 2: Priority 2.1 - Ghost Preview (1-2 hours)
1. Add CSS for ghost styles
2. Create `createDragGhost()` method
3. Update drag event handlers
4. Test with Focus Queue tasks

### Step 3: Priority 2.2 - Drop Feedback (1-2 hours)
1. Add pulse animation CSS
2. Add tooltip CSS
3. Update drop zone handlers
4. Add time validation (past times)

### Step 4: Priority 2.3 - Reschedule Drag (1 hour)
1. Make timeline blocks draggable
2. Handle drop on new slot
3. Update original slot

### Step 5: Priority 3.1 - Context Menu (2-3 hours)
1. Create menu HTML structure
2. Add positioning logic
3. Implement actions
4. Bind to all task elements

### Step 6: Priority 3.2 - Inline Edit (1-2 hours)
1. Add double-click handler
2. Implement contentEditable logic
3. Handle Enter/Escape/Blur

### Step 7: Priority 3.3 - Resize Tasks (2-3 hours)
1. Add resize handle element
2. Implement drag-to-resize
3. Snap to 15-minute increments
4. Update duration on release

---

## Testing After Each Step

After each implementation step:

1. **Test the new feature** - Does it work as expected?
2. **Test related features** - Did we break anything?
3. **Test data persistence** - Close and reopen app
4. **Test keyboard shortcuts** - Still work?
5. **Commit changes** - `git commit -m "Implement [feature]"`

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `renderer.js` | Ghost preview, drop feedback, context menu, inline edit, resize |
| `styles.css` | Ghost styles, drop animations, context menu, resize handle |
| `index.html` | No changes needed |

---

*Ready to implement. Start with Part 1 verification, then work through Priority 2 and 3 in order.*
