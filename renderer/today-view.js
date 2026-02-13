// renderer/today-view.js — Today view, command center, daily workflow

// Refresh command center components (can be called from any view)
export function refreshCommandCenter() {
  // Only refresh if the elements exist (command center view is in DOM)
  if (document.getElementById('cc-focus-queue')) {
    this.updateTodayStats();
    this.renderUpNextQueue();
    this.renderDualTrackTimeline();
    this.renderCompletions();
  }
}

export function renderCommandCenter() {
  // Redirect to new Today view
  this.renderTodayView();
}

export function renderTodayView() {
  const today = this.getLocalDateString();
  const allTasks = this.getAllTasks();

  // Auto-roll on first render (once per session)
  if (!this._autoRollDone) {
    this._autoRollDone = true;
    this.autoRollTasks();
  }

  // Render Working On Now section
  this.renderWorkingOnNow();

  // Render Notes section
  this.renderTodayNotes();

  // Get today's tasks (due today or scheduled for today), excluding done
  const todayTasks = allTasks.filter(t =>
    (t.dueDate === today || t.scheduledDate === today) && t.status !== 'done'
  );

  // Get overdue tasks
  const overdueTasks = allTasks.filter(t =>
    t.dueDate && t.dueDate < today && t.status !== 'done'
  );

  // Combine and sort by priority (urgent first, then high, medium, low, none)
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
  const allActiveTasks = [...overdueTasks, ...todayTasks]
    .filter((t, i, arr) => arr.findIndex(a => a.id === t.id) === i) // dedupe
    .filter(t => !this.todayView.workingOnTaskIds.includes(t.id)) // exclude active tasks
    .sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 4;
      const pb = priorityOrder[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  // Render flat queue
  this.renderUpNextQueue(allActiveTasks);

  // Show/hide empty state
  const emptyState = document.getElementById('today-empty-state');
  const upNext = document.getElementById('today-up-next');
  const hasWorkingOn = this.todayView.workingOnTaskIds.length > 0;
  if (allActiveTasks.length === 0 && !hasWorkingOn) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (upNext) upNext.classList.add('hidden');
  } else {
    if (emptyState) emptyState.classList.add('hidden');
    if (upNext) upNext.classList.remove('hidden');
  }

  // Bind events
  this.bindTodayViewEvents();
}

export function planMyDay() {
  const today = this.getLocalDateString();
  const allTasks = this.getAllTasks().filter(t => t.status !== 'done');

  const overdue = allTasks.filter(t => t.dueDate && t.dueDate < today);
  const dueToday = allTasks.filter(t => t.dueDate === today);
  const scheduledToday = allTasks.filter(t => t.scheduledDate === today && !dueToday.some(d => d.id === t.id));
  const highPriority = allTasks.filter(t =>
    (t.priority === 'urgent' || t.priority === 'high') &&
    !dueToday.some(d => d.id === t.id) &&
    !overdue.some(d => d.id === t.id) &&
    !scheduledToday.some(d => d.id === t.id)
  );
  const inProgress = allTasks.filter(t =>
    t.status === 'in-progress' &&
    !dueToday.some(d => d.id === t.id) &&
    !overdue.some(d => d.id === t.id) &&
    !highPriority.some(d => d.id === t.id)
  );
  const waiting = allTasks.filter(t => t.status === 'waiting');
  const activeIds = this.todayView.workingOnTaskIds || [];

  // Get project names for context
  const projectLookup = {};
  (this.data.projects || []).forEach(p => {
    (p.tasks || []).forEach(t => { projectLookup[t.id] = p.name; });
  });

  // Get tag names
  const tagLookup = {};
  (this.data.tags || []).forEach(t => { tagLookup[t.id] = t.name; });

  const formatTask = (t) => {
    let s = `- **${t.name}**`;
    s += ` | Priority: ${t.priority} | Type: ${t.executionType || 'manual'}`;
    if (t.assignedTo) s += ` | Assigned: ${t.assignedTo}`;
    if (t.estimatedMinutes) s += ` | Est: ${t.estimatedMinutes}min`;
    if (t.complexity) s += ` | Complexity: ${t.complexity}/5`;
    const proj = projectLookup[t.id];
    if (proj && proj !== 'Inbox') s += ` | Project: ${proj}`;
    const tags = (t.tags || []).map(id => tagLookup[id]).filter(Boolean);
    if (tags.length) s += ` | Tags: ${tags.join(', ')}`;
    s += '\n';

    if (t.description) s += `  Description: ${t.description.slice(0, 200)}\n`;
    if (t.context) s += `  Context: ${t.context.slice(0, 200)}\n`;
    if (t.workNotes) s += `  Work notes: ${t.workNotes.slice(0, 200)}\n`;
    if (t.waitingReason) s += `  Waiting on: ${t.waitingReason}\n`;

    if (t.subtasks?.length > 0) {
      const done = t.subtasks.filter(st => st.status === 'done').length;
      s += `  Subtasks (${done}/${t.subtasks.length} done):\n`;
      t.subtasks.forEach(st => {
        const check = st.status === 'done' ? '[x]' : '[ ]';
        let stLine = `    ${check} ${st.name}`;
        if (st.assignedTo) stLine += ` (${st.assignedTo})`;
        s += stLine + '\n';
      });
    }

    return s;
  };

  let prompt = `# Plan My Day\n\n`;
  prompt += `Today is **${today}**. I have **${allTasks.length} open tasks**. `;
  prompt += `Please analyze everything below and help me have the most productive day possible.\n\n`;

  if (activeIds.length > 0) {
    prompt += `## Currently Active\n`;
    activeIds.forEach(id => {
      const t = this.findTask(id);
      if (t) prompt += formatTask(t);
    });
    prompt += '\n';
  }

  if (overdue.length > 0) {
    prompt += `## OVERDUE (${overdue.length})\n`;
    overdue.forEach(t => prompt += formatTask(t));
    prompt += '\n';
  }

  if (dueToday.length > 0) {
    prompt += `## Due Today (${dueToday.length})\n`;
    dueToday.forEach(t => prompt += formatTask(t));
    prompt += '\n';
  }

  if (scheduledToday.length > 0) {
    prompt += `## Scheduled Today (${scheduledToday.length})\n`;
    scheduledToday.forEach(t => prompt += formatTask(t));
    prompt += '\n';
  }

  if (highPriority.length > 0) {
    prompt += `## High/Urgent Priority (${highPriority.length})\n`;
    highPriority.forEach(t => prompt += formatTask(t));
    prompt += '\n';
  }

  if (inProgress.length > 0) {
    prompt += `## In Progress (${inProgress.length})\n`;
    inProgress.forEach(t => prompt += formatTask(t));
    prompt += '\n';
  }

  if (waiting.length > 0) {
    prompt += `## Waiting/Blocked (${waiting.length})\n`;
    waiting.forEach(t => prompt += formatTask(t));
    prompt += '\n';
  }

  // Include remaining tasks summary
  const categorized = new Set([
    ...activeIds,
    ...overdue.map(t => t.id),
    ...dueToday.map(t => t.id),
    ...scheduledToday.map(t => t.id),
    ...highPriority.map(t => t.id),
    ...inProgress.map(t => t.id),
    ...waiting.map(t => t.id),
  ]);
  const other = allTasks.filter(t => !categorized.has(t.id));
  if (other.length > 0) {
    prompt += `## Other Open Tasks (${other.length})\n`;
    other.forEach(t => prompt += formatTask(t));
    prompt += '\n';
  }

  prompt += `---\n\n`;
  prompt += `## Your Role\n\n`;
  prompt += `You are my Chief of Staff — a sharp, proactive executive partner. You see the full picture, think strategically, and drive results. Don't just organize my list — lead my day. Be ambitious about what we can accomplish together but targeted in your recommendations.\n\n`;

  prompt += `## Step 1: Ask Me Questions First\n\n`;
  prompt += `Before making your plan, ask me:\n`;
  prompt += `- What are my biggest goals this week? What outcome matters most today?\n`;
  prompt += `- Are there any hard deadlines, meetings, or commitments I haven't captured?\n`;
  prompt += `- Any tasks I'm dreading or avoiding? (Those often need to go first)\n`;
  prompt += `- How much energy do I have today — full throttle or need an easier day?\n`;
  prompt += `- Anything from yesterday that's still on my mind?\n\n`;
  prompt += `Wait for my answers before proceeding to Step 2.\n\n`;

  prompt += `## Step 2: Build the Plan\n\n`;
  prompt += `After I respond, create a targeted day plan:\n\n`;

  prompt += `**Divide and Conquer** — Split everything into two tracks:\n`;
  prompt += `- **What I (Tom) should focus on**: The high-leverage tasks only I can do — decisions, calls, creative work, reviews, anything requiring human judgment. Sequence them smartly (hardest when energy is high, admin when it dips).\n`;
  prompt += `- **What you (Claude) will handle**: Everything you can run with autonomously — research, drafting, analysis, code generation, summarizing, organizing. Be aggressive here — take as much off my plate as possible.\n`;
  prompt += `- **Collaborative**: Tasks we should do together in real-time.\n\n`;

  prompt += `**Break Down the Unclear**: Any task that's vague, too big, or missing subtasks — decompose it into clear, concrete next actions. Use \`create_subtasks\` to make each one a specific deliverable, not a wish.\n\n`;

  prompt += `**Set the Pace**: Add time estimates to anything missing them. Be realistic but don't pad — we move fast.\n\n`;

  prompt += `**Call Out What to Skip**: Not everything needs to happen today. Be honest about what should be deferred, delegated, or dropped entirely. Don't let busywork crowd out important work.\n\n`;

  prompt += `**Flag Dependencies & Blockers**: If something is stuck, say so. If a task unlocks three others, prioritize it. Think in terms of cascading impact.\n\n`;

  prompt += `## Step 3: Take Action\n\n`;
  prompt += `Don't just plan — set it up. Use the MCP tools to:\n`;
  prompt += `- \`update_task\` — set priorities, assignedTo (claude/vin), executionType (ai/manual/hybrid), estimates\n`;
  prompt += `- \`create_subtasks\` — break down complex tasks into actionable steps\n\n`;

  prompt += `## Step 4: Queue Your Work\n\n`;
  prompt += `After updating the tasks, use the \`sync_claude_queue\` tool to write all Claude-assigned tasks into the queue file. Do NOT start executing them yet — I'll review the queue and run it when I'm ready. The queue is my launchpad, not an auto-pilot.\n\n`;
  prompt += `Tell me when the queue is ready so I can review it and hit "Run Queue" to kick things off.\n\n`;

  prompt += `Be bold. Be specific. Drive output. Let's have a great day.`;

  window.api.copyToClipboard(prompt);

  const btn = document.getElementById('plan-my-day-btn');
  if (btn) {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Plan My Day';
      btn.classList.remove('copied');
    }, 2000);
  }

  this.showToast('Prompt copied — paste into Claude Desktop', 3000);
}

export function autoRollTasks() {
  const today = this.getLocalDateString();
  const allTasks = this.getAllTasks();
  let rolledCount = 0;

  allTasks.forEach(t => {
    if (t.status === 'done') return;
    const isOldScheduled = t.scheduledDate && t.scheduledDate < today;
    const isOldDue = t.dueDate && t.dueDate < today;
    if (isOldScheduled || isOldDue) {
      if (isOldScheduled) {
        t.scheduledDate = today;
        t.scheduledTime = null; // clear stale time
        t.snoozeCount = (t.snoozeCount || 0) + 1;
      }
      if (isOldDue) {
        t.dueDate = today;
      }
      rolledCount++;
    }
  });

  if (rolledCount > 0) {
    this.saveData();
    const banner = document.getElementById('today-roll-banner');
    const bannerText = document.getElementById('roll-banner-text');
    if (banner && bannerText) {
      bannerText.textContent = `${rolledCount} task${rolledCount > 1 ? 's' : ''} rolled forward from yesterday`;
      banner.classList.remove('hidden');
    }
  }
}

export function renderUpNextQueue(tasks) {
  const container = document.getElementById('up-next-tasks');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = '';
    return;
  }

  const today = this.getLocalDateString();
  container.innerHTML = tasks.map((task, index) => {
    const project = this.data.projects.find(p => p.tasks.some(t => t.id === task.id));
    const projectName = project && !project.isInbox ? project.name : '';
    const isOverdue = task.dueDate && task.dueDate < today;
    const duration = task.estimatedMinutes || 30;
    const subtaskCount = task.subtasks?.length || 0;
    const subtasksDone = task.subtasks?.filter(s => s.status === 'done').length || 0;
    const isExpanded = this.todayView.expandedUpNextIds.has(task.id);
    const priorityDot = {
      urgent: '<span class="priority-dot priority-dot-urgent"></span>',
      high: '<span class="priority-dot priority-dot-high"></span>',
      medium: '<span class="priority-dot priority-dot-medium"></span>',
      low: '<span class="priority-dot priority-dot-low"></span>',
      none: ''
    }[task.priority || 'none'];

    const subtaskDropdown = subtaskCount > 0 ? `
      <div class="up-next-subtasks ${isExpanded ? 'expanded' : ''}" data-task-id="${task.id}">
        ${task.subtasks.map(st => `
          <label class="working-now-subtask ${st.status === 'done' ? 'done' : ''}">
            <input type="checkbox" ${st.status === 'done' ? 'checked' : ''} data-task-id="${task.id}" data-subtask-id="${st.id}" class="up-next-subtask-check" />
            <span class="working-now-subtask-name">${this.escapeHtml(st.name)}</span>
          </label>
        `).join('')}
      </div>
    ` : '';

    const execType = task.executionType || 'manual';
    const execBadge = execType !== 'manual' ? `<span class="exec-badge exec-badge-${execType}">${execType === 'ai' ? 'Claude' : 'Hybrid'}</span>` : '';

    return `
      <div class="today-task-item exec-${execType} ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}" draggable="true">
        <button class="today-task-check" data-task-id="${task.id}" title="Complete">
          <span class="check-icon"></span>
        </button>
        ${priorityDot}
        <div class="today-task-content">
          <div class="today-task-name">${this.escapeHtml(task.name)}${execBadge}</div>
          <div class="today-task-meta">
            ${projectName ? `<span class="today-task-project">${this.escapeHtml(projectName)}</span>` : ''}
            ${isOverdue ? `<span class="today-task-overdue">Overdue</span>` : ''}
            <span class="today-task-duration">${duration}m</span>
            ${subtaskCount > 0 ? `<span class="today-task-subtasks">${subtasksDone}/${subtaskCount}</span>` : ''}
          </div>
        </div>
        <div class="today-task-actions">
          ${subtaskCount > 0 ? `<button class="up-next-subtask-toggle ${isExpanded ? 'expanded' : ''}" data-task-id="${task.id}" title="Toggle subtasks">&#9660;</button>` : ''}
          <button class="today-task-focus" data-task-id="${task.id}" title="Add to active">
            <span>&#9678;</span>
          </button>
        </div>
      </div>
      ${subtaskDropdown}
    `;
  }).join('');
}

export function renderWorkingOnNow() {
  this.renderActiveTasks();
}

export function renderActiveTasks() {
  const container = document.getElementById('working-now-task');
  const section = document.getElementById('today-working-now');
  if (!container) return;

  // Clean up: remove completed/deleted tasks from active list
  const allTasks = this.getAllTasks();
  const validIds = this.todayView.workingOnTaskIds.filter(id => {
    const task = allTasks.find(t => t.id === id);
    return task && task.status !== 'done';
  });
  if (validIds.length !== this.todayView.workingOnTaskIds.length) {
    this.todayView.workingOnTaskIds = validIds;
    this.data.workingOnTaskIds = [...validIds];
    this.saveData();
  }

  const notesSection = document.getElementById('working-now-notes');
  const notesInput = document.getElementById('working-now-notes-input');

  if (this.todayView.workingOnTaskIds.length === 0) {
    section?.classList.remove('has-task');
    container.innerHTML = `<span class="working-now-empty">Drag a task here or click its focus button</span>`;
    if (notesSection) notesSection.classList.add('hidden');
    return;
  }

  section?.classList.add('has-task');

  // Render each active task as a compact card
  container.innerHTML = this.todayView.workingOnTaskIds.map(taskId => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return '';

    const project = this.data.projects.find(p => p.tasks.some(t => t.id === task.id));
    const projectName = project && !project.isInbox ? project.name : '';
    const duration = task.estimatedMinutes || 30;
    const subtaskCount = task.subtasks?.length || 0;
    const subtasksDone = task.subtasks?.filter(s => s.status === 'done').length || 0;

    const subtasksHtml = subtaskCount > 0 ? `
      <div class="active-card-subtask-list">
        ${task.subtasks.map(st => `
          <label class="working-now-subtask ${st.status === 'done' ? 'done' : ''}" data-subtask-id="${st.id}">
            <input type="checkbox" ${st.status === 'done' ? 'checked' : ''} data-task-id="${task.id}" data-subtask-id="${st.id}" class="active-card-subtask-check" />
            <span class="working-now-subtask-name">${this.escapeHtml(st.name)}</span>
          </label>
        `).join('')}
      </div>
    ` : '';

    const execType = task.executionType || 'manual';
    const execBadge = execType !== 'manual' ? `<span class="exec-badge exec-badge-${execType}">${execType === 'ai' ? 'Claude' : 'Hybrid'}</span>` : '';

    return `
      <div class="active-task-card exec-${execType}" data-task-id="${task.id}">
        <div class="active-card-header">
          <div class="active-card-info" data-task-id="${task.id}">
            <div class="active-card-name">${this.escapeHtml(task.name)}${execBadge}</div>
            <div class="active-card-meta">
              ${projectName ? `<span class="working-now-project">${this.escapeHtml(projectName)}</span>` : ''}
              <span class="working-now-duration">${duration}m</span>
              ${subtaskCount > 0 ? `<span class="working-now-subtasks">${subtasksDone}/${subtaskCount} subtasks</span>` : ''}
            </div>
          </div>
          <div class="active-card-actions">
            <button class="btn btn-success btn-small active-card-complete" data-task-id="${task.id}" title="Complete">&#10003;</button>
            <button class="active-card-remove" data-task-id="${task.id}" title="Remove from active">&times;</button>
          </div>
        </div>
        ${subtasksHtml}
      </div>
    `;
  }).join('');

  // Show notes for the first active task
  const firstTask = allTasks.find(t => t.id === this.todayView.workingOnTaskIds[0]);
  if (notesSection && firstTask) {
    notesSection.classList.remove('hidden');
    if (notesInput) notesInput.value = firstTask.workNotes || '';
  } else if (notesSection) {
    notesSection.classList.add('hidden');
  }
}

export function renderTodayNotes() {
  // Load daily notes (for recaps)
  const dailyInput = document.getElementById('today-daily-notes-input');
  if (dailyInput) {
    const today = this.getLocalDateString();
    dailyInput.value = this.data.dailyNotes?.[today] || '';
  }
}

export function bindTodayViewEvents() {
  // Use event delegation on the stable #command-center-view container
  // This is called once; delegated handlers survive re-renders without leaking
  const view = document.getElementById('command-center-view');
  if (!view || view._todayDelegated) return;
  view._todayDelegated = true;

  // ── Click delegation ──
  view.addEventListener('click', (e) => {
    const target = e.target;

    // Plan My Day
    if (target.closest('#plan-my-day-btn')) { this.planMyDay(); return; }

    // Coach Me
    if (target.closest('#coach-me-btn')) { this.coachMePrompt(); return; }

    // Roll banner dismiss
    if (target.closest('#roll-banner-dismiss')) {
      document.getElementById('today-roll-banner')?.classList.add('hidden');
      return;
    }

    // Complete task buttons
    const checkBtn = target.closest('.today-task-check');
    if (checkBtn) {
      e.stopPropagation();
      const taskId = checkBtn.dataset.taskId;
      const task = this.findTask(taskId);
      const taskName = task ? task.name : 'Task';
      const item = checkBtn.closest('.today-task-item');
      item?.classList.add('completing');
      this.showCompletionSummaryModal(taskId, () => {
        if (this.todayView.workingOnTaskIds.includes(taskId)) {
          this.removeActiveTask(taskId);
        }
        this.showToast(`${taskName} completed`);
        // Animate removal instead of full re-render
        if (item) {
          item.classList.add('task-removed');
          item.addEventListener('transitionend', () => {
            item.remove();
            // Update stats counts without full re-render
            this.updateTodayStats();
          }, { once: true });
        } else {
          this.renderTodayView();
        }
      });
      return;
    }

    // Focus on task buttons
    const focusBtn = target.closest('.today-task-focus');
    if (focusBtn) {
      e.stopPropagation();
      const taskId = focusBtn.dataset.taskId;
      this.addActiveTask(taskId);
      this.updateFloatingBar();
      this.renderTodayView();
      return;
    }

    // Up Next subtask expand toggles
    const subtaskToggle = target.closest('.up-next-subtask-toggle');
    if (subtaskToggle) {
      e.stopPropagation();
      const taskId = subtaskToggle.dataset.taskId;
      if (this.todayView.expandedUpNextIds.has(taskId)) {
        this.todayView.expandedUpNextIds.delete(taskId);
      } else {
        this.todayView.expandedUpNextIds.add(taskId);
      }
      this.renderTodayView();
      return;
    }

    // Active card complete buttons
    const activeComplete = target.closest('.active-card-complete');
    if (activeComplete) {
      e.stopPropagation();
      const taskId = activeComplete.dataset.taskId;
      const task = this.findTask(taskId);
      const taskName = task ? task.name : 'Task';
      this.showCompletionSummaryModal(taskId, () => {
        this.removeActiveTask(taskId);
        this.updateFloatingBar();
        this.showToast(`${taskName} completed`);
        this.renderTodayView();
      });
      return;
    }

    // Active card remove buttons
    const activeRemove = target.closest('.active-card-remove');
    if (activeRemove) {
      e.stopPropagation();
      const taskId = activeRemove.dataset.taskId;
      this.removeActiveTask(taskId);
      this.updateFloatingBar();
      this.renderTodayView();
      return;
    }

    // Click active card info to open details
    const activeInfo = target.closest('.active-card-info');
    if (activeInfo && !target.closest('button')) {
      this.openDetailPanel(activeInfo.dataset.taskId);
      return;
    }

    // Working On Now clear
    if (target.closest('#working-now-clear')) {
      this.todayView.workingOnTaskIds = [];
      this.data.workingOnTaskIds = [];
      this.saveData();
      this.updateFloatingBar();
      this.renderTodayView();
      return;
    }

    // Add tasks button
    if (target.closest('#today-add-tasks')) { this.setView('master-list'); return; }

    // Start focus button
    if (target.closest('#today-start-focus')) { this.enterFocusMode(); return; }

    // Click task item to open details (only if not clicking a button)
    const taskItem = target.closest('.today-task-item');
    if (taskItem && !target.closest('button')) {
      this.openDetailPanel(taskItem.dataset.taskId);
      return;
    }
  });

  // ── Change delegation (for checkboxes) ──
  view.addEventListener('change', (e) => {
    // Up Next subtask checkboxes
    const upNextCheck = e.target.closest('.up-next-subtask-check');
    if (upNextCheck) {
      e.stopPropagation();
      const taskId = upNextCheck.dataset.taskId;
      const subtaskId = upNextCheck.dataset.subtaskId;
      const task = this.findTask(taskId);
      if (task) {
        const subtask = task.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
          subtask.status = upNextCheck.checked ? 'done' : 'todo';
          this.saveData();
          this.renderTodayView();
        }
      }
      return;
    }

    // Active card subtask checkboxes
    const activeCheck = e.target.closest('.active-card-subtask-check');
    if (activeCheck) {
      e.stopPropagation();
      const taskId = activeCheck.dataset.taskId;
      const subtaskId = activeCheck.dataset.subtaskId;
      const task = this.findTask(taskId);
      if (task) {
        const subtask = task.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
          subtask.status = activeCheck.checked ? 'done' : 'todo';
          this.saveData();
          this.renderActiveTasks();
        }
      }
    }
  });

  // ── Drag & drop delegation ──
  view.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.today-task-item');
    if (item) {
      e.dataTransfer.setData('text/plain', item.dataset.taskId);
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
      setTimeout(() => item.style.opacity = '0.5', 0);
    }
  });

  view.addEventListener('dragend', (e) => {
    const item = e.target.closest('.today-task-item');
    if (item) {
      item.classList.remove('dragging');
      item.style.opacity = '1';
      document.querySelectorAll('.today-task-item.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    }
  });

  view.addEventListener('dragover', (e) => {
    const item = e.target.closest('.today-task-item');
    if (item) {
      e.preventDefault();
      const dragging = document.querySelector('.today-task-item.dragging');
      if (dragging && dragging !== item) {
        item.classList.add('drag-over');
      }
    }
    // Working On Now drop zone
    const workingNow = e.target.closest('#today-working-now');
    if (workingNow) {
      e.preventDefault();
      workingNow.classList.add('drop-target');
    }
  });

  view.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.today-task-item');
    if (item) {
      item.classList.remove('drag-over');
    }
    const workingNow = e.target.closest('#today-working-now');
    if (workingNow && !workingNow.contains(e.relatedTarget)) {
      workingNow.classList.remove('drop-target');
    }
  });

  view.addEventListener('drop', (e) => {
    const item = e.target.closest('.today-task-item');
    if (item) {
      e.preventDefault();
      item.classList.remove('drag-over');
      const draggedTaskId = e.dataTransfer.getData('text/plain');
      const targetTaskId = item.dataset.taskId;
      if (draggedTaskId && targetTaskId && draggedTaskId !== targetTaskId) {
        this.reorderTodayTask(draggedTaskId, targetTaskId);
      }
      return;
    }
    // Working On Now drop zone
    const workingNow = e.target.closest('#today-working-now');
    if (workingNow) {
      e.preventDefault();
      workingNow.classList.remove('drop-target');
      const taskId = e.dataTransfer.getData('text/plain');
      if (taskId) {
        this.addActiveTask(taskId);
        this.updateFloatingBar();
        this.renderTodayView();
      }
    }
  });

  // ── Input delegation (debounced notes) ──
  let taskNotesSaveTimeout;
  let dailyNotesSaveTimeout;
  view.addEventListener('input', (e) => {
    if (e.target.id === 'working-now-notes-input') {
      clearTimeout(taskNotesSaveTimeout);
      taskNotesSaveTimeout = setTimeout(() => {
        const firstActiveId = this.todayView.workingOnTaskIds[0];
        if (firstActiveId) {
          const task = this.findTask(firstActiveId);
          if (task) {
            task.workNotes = e.target.value;
            this.saveData();
          }
        }
      }, 500);
    }

    if (e.target.id === 'today-daily-notes-input') {
      clearTimeout(dailyNotesSaveTimeout);
      dailyNotesSaveTimeout = setTimeout(() => {
        const today = this.getLocalDateString();
        if (!this.data.dailyNotes) this.data.dailyNotes = {};
        this.data.dailyNotes[today] = e.target.value;
        this.saveData();
      }, 500);
    }
  });
}

export function updateTodayStats() {
  // Lightweight update of counts without full re-render
  this.updateCounts();
}

// Auto-advance: remove completed tasks from active list (no auto-pick with multi-active)
export function autoAdvanceWorkingOn() {
  // Clean up: remove any done tasks from active list
  const allTasks = this.getAllTasks();
  this.todayView.workingOnTaskIds = this.todayView.workingOnTaskIds.filter(id => {
    const task = allTasks.find(t => t.id === id);
    return task && task.status !== 'done';
  });
  this.data.workingOnTaskIds = [...this.todayView.workingOnTaskIds];
  this.saveData();
}

export function reorderTodayTask(draggedTaskId, targetTaskId) {
  // Get both tasks
  const draggedTask = this.findTask(draggedTaskId);
  const targetTask = this.findTask(targetTaskId);

  if (!draggedTask || !targetTask) return;

  // Copy priority from target task to reorder within same priority
  // Or swap priorities to move between sections
  if (draggedTask.priority !== targetTask.priority) {
    // Moving to different priority section - adopt that priority
    draggedTask.priority = targetTask.priority;
    this.saveData();
    this.renderTodayView();
  } else {
    // Same priority - just visual feedback, tasks stay sorted by their properties
    // Could implement custom sort order here if needed
    this.renderTodayView();
  }
}

export function startFocusModeWithTask(taskId) {
  // Build queue with this task first
  const today = this.getLocalDateString();
  const allTasks = this.getAllTasks().filter(t =>
    (t.dueDate === today || t.scheduledDate === today) && t.status !== 'done'
  );

  // Put the selected task first
  const selectedTask = allTasks.find(t => t.id === taskId);
  const otherTasks = allTasks.filter(t => t.id !== taskId);
  this.focusMode.taskQueue = selectedTask ? [selectedTask, ...otherTasks] : allTasks;
  this.focusMode.currentIndex = 0;

  this.enterFocusMode();
}

export function renderDailySchedule() {
  const container = document.getElementById('cc-schedule');
  const today = this.getLocalDateString();
  const allTodayTasks = this.getAllTasks().filter(t =>
    (t.dueDate === today || t.scheduledDate === today) && t.status !== 'done'
  );

  // Separate scheduled and unscheduled tasks
  const scheduledTasks = allTodayTasks
    .filter(t => t.scheduledTime)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const unscheduledTasks = allTodayTasks.filter(t => !t.scheduledTime);

  if (allTodayTasks.length === 0) {
    container.innerHTML = `
      <div class="cc-schedule-empty">
        <p>No tasks scheduled for today</p>
        <button class="btn btn-primary" id="cc-add-to-today">Add Tasks to Today</button>
      </div>
    `;
    container.querySelector('#cc-add-to-today')?.addEventListener('click', () => {
      this.setView('master-list');
    });
    return;
  }

  // Calculate total scheduled time
  const totalScheduledMins = scheduledTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
  const totalHours = Math.floor(totalScheduledMins / 60);
  const totalMins = totalScheduledMins % 60;

  let html = `<div class="schedule-time-slots">`;

  // Show scheduled tasks with time blocks
  if (scheduledTasks.length > 0) {
    html += `<div class="schedule-header">
      <span class="schedule-header-title">Time-Blocked (${scheduledTasks.length})</span>
      <span class="schedule-header-total">${totalHours}h ${totalMins}m</span>
    </div>`;

    scheduledTasks.forEach(task => {
      const priorityClass = task.priority !== 'none' ? `priority-${task.priority}` : '';
      const statusClass = task.status === 'in-progress' ? 'active' : '';
      const duration = task.estimatedMinutes || 30;

      // Calculate end time
      const [h, m] = task.scheduledTime.split(':').map(Number);
      const endMins = h * 60 + m + duration;
      const endH = Math.floor(endMins / 60) % 24;
      const endM = endMins % 60;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      html += `
        <div class="schedule-slot scheduled ${priorityClass} ${statusClass}" data-task-id="${task.id}">
          <div class="schedule-slot-time">
            <span class="time-start">${task.scheduledTime}</span>
            <span class="time-end">${endTime}</span>
          </div>
          <div class="schedule-slot-content">
            <span class="schedule-slot-name">${this.escapeHtml(task.name)}</span>
            <span class="schedule-slot-duration">${duration}m</span>
          </div>
          <button class="schedule-slot-check" data-action="complete">\u2713</button>
        </div>
      `;
    });
  }

  // Show unscheduled tasks
  if (unscheduledTasks.length > 0) {
    html += `<div class="schedule-header unscheduled">
      <span class="schedule-header-title">Due Today - Unscheduled (${unscheduledTasks.length})</span>
    </div>`;

    unscheduledTasks.forEach(task => {
      const priorityClass = task.priority !== 'none' ? `priority-${task.priority}` : '';
      const statusClass = task.status === 'in-progress' ? 'active' : '';

      html += `
        <div class="schedule-slot unscheduled ${priorityClass} ${statusClass}" data-task-id="${task.id}">
          <div class="schedule-slot-time">--:--</div>
          <div class="schedule-slot-content">
            <span class="schedule-slot-name">${this.escapeHtml(task.name)}</span>
            ${task.estimatedMinutes ? `<span class="schedule-slot-duration">${task.estimatedMinutes}m</span>` : ''}
          </div>
          <button class="schedule-slot-check" data-action="complete">\u2713</button>
        </div>
      `;
    });
  }

  html += `</div>`;
  container.innerHTML = html;

  // Bind events
  container.querySelectorAll('.schedule-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
      if (!e.target.classList.contains('schedule-slot-check')) {
        this.openDetailPanel(slot.dataset.taskId);
      }
    });
    slot.querySelector('[data-action="complete"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.updateTask(slot.dataset.taskId, { status: 'done' });
      this.renderCommandCenter();
    });
  });

  // Also render the dual-track timeline
  this.renderDualTrackTimeline();
}
