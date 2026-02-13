// renderer/tasks.js — Task rendering, modals, detail panel, task interactions

export function renderTasks() {
  // Show appropriate view container
  if (this.currentView === 'master-list') {
    document.getElementById('task-list-view')?.classList.add('active');
    this.renderMasterList();
  } else if (this.currentViewMode === 'list') {
    document.getElementById('task-list-view')?.classList.add('active');
    this.renderTaskList();
  } else {
    document.getElementById('task-board-view')?.classList.add('active');
    this.renderTaskBoard();
  }
}

export function renderMasterList() {
  const container = document.getElementById('tasks-container');
  let tasks = this.getFilteredTasks();

  // Initialize master list filter state
  if (this._masterListFilter === undefined) {
    this._masterListFilter = {
      hideCompleted: true,
      status: 'all',
      priority: 'all',
      project: 'all'
    };
  }

  // Apply master list filters
  if (this._masterListFilter.hideCompleted) {
    tasks = tasks.filter(t => t.status !== 'done');
  }
  if (this._masterListFilter.status !== 'all') {
    tasks = tasks.filter(t => t.status === this._masterListFilter.status);
  }
  if (this._masterListFilter.priority !== 'all') {
    tasks = tasks.filter(t => t.priority === this._masterListFilter.priority);
  }
  if (this._masterListFilter.project !== 'all') {
    tasks = tasks.filter(t => {
      const project = this.data.projects.find(p => p.tasks.some(pt => pt.id === t.id));
      return project && project.id === this._masterListFilter.project;
    });
  }

  const allTasks = this.getAllTasks();
  const activeCount = allTasks.filter(t => t.status !== 'done').length;
  const completedCount = allTasks.filter(t => t.status === 'done').length;

  // Calculate time budget
  const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
  const budgetHours = Math.floor(totalMinutes / 60);
  const budgetMins = totalMinutes % 60;

  // Build project options
  const projectOptions = this.data.projects
    .filter(p => !p.isInbox)
    .map(p => `<option value="${p.id}" ${this._masterListFilter.project === p.id ? 'selected' : ''}>${this.escapeHtml(p.name)}</option>`)
    .join('');

  container.innerHTML = `
    <div class="master-list-view">
      <div class="master-list-header">
        <span class="master-list-count">${tasks.length} shown (${activeCount} active, ${completedCount} done)</span>
        <span class="master-list-time-budget">${budgetHours}h ${budgetMins}m total</span>
        <button class="btn btn-small btn-plan-day" id="impact-review-btn" title="Copy strategic impact review prompt for Claude">Impact Review</button>
      </div>

      <!-- Bulk Actions Toolbar -->
      <div class="master-list-bulk-toolbar ${this._selectedTasks.size > 0 ? '' : 'hidden'}">
        <span class="bulk-select-count">${this._selectedTasks.size} selected</span>
        <button class="bulk-action-btn" data-action="complete">&#10003; Complete</button>
        <button class="bulk-action-btn" data-action="schedule-today">&#128197; Today</button>
        <button class="bulk-action-btn" data-action="set-priority">&#9733; Priority</button>
        <button class="bulk-action-btn" data-action="add-to-queue">&#9654; Add to Queue</button>
        <button class="bulk-action-btn danger" data-action="delete">&#128465; Delete</button>
        <button class="bulk-action-btn" data-action="clear">Clear Selection</button>
      </div>

      <div class="master-list-filters">
        <label class="master-filter-toggle">
          <input type="checkbox" id="ml-hide-completed" ${this._masterListFilter.hideCompleted ? 'checked' : ''}>
          <span>Hide completed</span>
        </label>
        <select id="ml-filter-status" class="master-filter-select">
          <option value="all" ${this._masterListFilter.status === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="todo" ${this._masterListFilter.status === 'todo' ? 'selected' : ''}>Inbox</option>
          <option value="ready" ${this._masterListFilter.status === 'ready' ? 'selected' : ''}>Ready</option>
          <option value="in-progress" ${this._masterListFilter.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="waiting" ${this._masterListFilter.status === 'waiting' ? 'selected' : ''}>Waiting</option>
        </select>
        <select id="ml-filter-priority" class="master-filter-select">
          <option value="all" ${this._masterListFilter.priority === 'all' ? 'selected' : ''}>All Priorities</option>
          <option value="urgent" ${this._masterListFilter.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
          <option value="high" ${this._masterListFilter.priority === 'high' ? 'selected' : ''}>High</option>
          <option value="medium" ${this._masterListFilter.priority === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="low" ${this._masterListFilter.priority === 'low' ? 'selected' : ''}>Low</option>
        </select>
        <select id="ml-filter-project" class="master-filter-select">
          <option value="all" ${this._masterListFilter.project === 'all' ? 'selected' : ''}>All Projects</option>
          ${projectOptions}
        </select>
        <div class="master-list-grouping-selector">
          <label>Group by:</label>
          <select id="ml-group-by">
            <option value="none" ${this._masterListGroupBy === 'none' ? 'selected' : ''}>None</option>
            <option value="project" ${this._masterListGroupBy === 'project' ? 'selected' : ''}>Project</option>
            <option value="priority" ${this._masterListGroupBy === 'priority' ? 'selected' : ''}>Priority</option>
            <option value="status" ${this._masterListGroupBy === 'status' ? 'selected' : ''}>Status</option>
            <option value="dueDate" ${this._masterListGroupBy === 'dueDate' ? 'selected' : ''}>Due Date</option>
          </select>
        </div>
      </div>
      <div class="master-list-container" id="master-list-container"></div>
    </div>
  `;

  // Impact Review button
  const impactBtn = document.getElementById('impact-review-btn');
  if (impactBtn) {
    impactBtn.onclick = () => this.impactReviewPrompt();
  }

  // Bind filter events
  document.getElementById('ml-hide-completed').addEventListener('change', (e) => {
    this._masterListFilter.hideCompleted = e.target.checked;
    this.renderMasterList();
  });
  document.getElementById('ml-filter-status').addEventListener('change', (e) => {
    this._masterListFilter.status = e.target.value;
    this.renderMasterList();
  });
  document.getElementById('ml-filter-priority').addEventListener('change', (e) => {
    this._masterListFilter.priority = e.target.value;
    this.renderMasterList();
  });
  document.getElementById('ml-filter-project').addEventListener('change', (e) => {
    this._masterListFilter.project = e.target.value;
    this.renderMasterList();
  });
  document.getElementById('ml-group-by').addEventListener('change', (e) => {
    this._masterListGroupBy = e.target.value;
    this.renderMasterList();
  });

  // Bind bulk action buttons
  document.querySelectorAll('.bulk-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'clear') {
        this.clearTaskSelection();
      } else {
        this.executeBulkAction(action);
      }
    });
  });

  const listContainer = document.getElementById('master-list-container');

  if (tasks.length === 0) {
    listContainer.innerHTML = `<div class="master-list-empty">No tasks match filters</div>`;
    return;
  }

  // Group tasks if grouping is enabled
  if (this._masterListGroupBy !== 'none') {
    const groups = this.groupTasksBy(tasks, this._masterListGroupBy);

    // Sort groups
    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
      if (this._masterListGroupBy === 'priority') {
        const order = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
        return (order[a] ?? 5) - (order[b] ?? 5);
      }
      return groups[b].tasks.length - groups[a].tasks.length;
    });

    sortedGroupKeys.forEach(key => {
      const group = groups[key];
      const groupEl = document.createElement('div');
      groupEl.className = 'master-list-group';
      groupEl.dataset.groupKey = key;

      groupEl.innerHTML = `
        <div class="master-list-group-header">
          <span class="master-list-group-toggle">&#9660;</span>
          <span class="master-list-group-color" style="background: ${group.color}; width: 12px; height: 12px; border-radius: 3px;"></span>
          <span class="master-list-group-name">${this.escapeHtml(group.label)}</span>
          <span class="master-list-group-count">${group.tasks.length} tasks</span>
        </div>
        <div class="master-list-group-tasks"></div>
      `;

      const tasksContainer = groupEl.querySelector('.master-list-group-tasks');
      group.tasks.forEach(task => {
        tasksContainer.appendChild(this.createMasterListItem(task));
      });

      // Toggle collapse
      groupEl.querySelector('.master-list-group-header').addEventListener('click', () => {
        groupEl.classList.toggle('collapsed');
      });

      listContainer.appendChild(groupEl);
    });
  } else {
    // Render flat list
    tasks.forEach(task => {
      listContainer.appendChild(this.createMasterListItem(task));
    });
  }
}

export function createMasterListItem(task) {
  const project = this.data.projects.find(p => p.tasks.some(t => t.id === task.id));
  const isCompleted = task.status === 'done';
  const isSelected = this._selectedTasks.has(task.id);

  const el = document.createElement('div');
  el.className = `master-list-item ${isCompleted ? 'completed' : ''} ${isSelected ? 'selected' : ''} priority-${task.priority}`;
  el.dataset.id = task.id;

  // Tags HTML with colors
  let tagsHtml = '';
  if (task.tags && task.tags.length > 0) {
    tagsHtml = task.tags.map(tagId => {
      const tag = this.data.tags.find(t => t.id === tagId);
      return tag ? `<span class="master-list-tag" style="background:${tag.color}">${this.escapeHtml(tag.name)}</span>` : '';
    }).join('');
  }

  let filesHtml = '';
  if (task.filePaths && task.filePaths.length > 0) {
    filesHtml = `<div class="master-list-files">
      ${task.filePaths.map(fp => `<span class="master-list-file-icon" title="${this.escapeHtml(fp)}" data-path="${this.escapeHtml(fp)}">📄</span>`).join('')}
    </div>`;
  }

  // Project with color
  let projectHtml = '';
  if (project && !project.isInbox) {
    projectHtml = `<span class="master-list-project" style="border-left: 3px solid ${project.color}">${this.escapeHtml(project.name)}</span>`;
  }

  // Duration badge
  let durationHtml = '';
  if (task.estimatedMinutes) {
    durationHtml = `<span class="master-list-duration">${task.estimatedMinutes}m</span>`;
  }

  // Today indicators
  const today = this.getLocalDateString();
  const isWorkingOn = this.todayView.workingOnTaskIds.includes(task.id);
  const isScheduledToday = task.scheduledDate === today || task.dueDate === today;

  let todayBadgeHtml = '';
  if (isWorkingOn) {
    todayBadgeHtml = `<span class="master-list-badge working-on">Working On</span>`;
  } else if (isScheduledToday && !isCompleted) {
    todayBadgeHtml = `<span class="master-list-badge scheduled-today">Today</span>`;
  }

  el.innerHTML = `
    <button class="master-list-select ${isSelected ? 'selected' : ''}" data-action="select">${isSelected ? '✓' : ''}</button>
    <button class="master-list-checkbox ${isCompleted ? 'checked' : ''}" data-action="toggle">${isCompleted ? '✓' : ''}</button>
    <span class="master-list-name" data-action="edit-name">${this.escapeHtml(task.name)}</span>
    ${todayBadgeHtml}
    ${durationHtml}
    ${tagsHtml}
    ${projectHtml}
    ${task.priority !== 'none' ? `<span class="master-list-priority ${task.priority}">${task.priority}</span>` : ''}
    <span class="master-list-status ${task.status}">${this.formatStatus(task.status)}</span>
    ${filesHtml}
  `;

  // Selection checkbox
  el.querySelector('[data-action="select"]').addEventListener('click', (e) => {
    e.stopPropagation();
    this.toggleTaskSelection(task.id, e.shiftKey);
  });

  // Complete checkbox
  el.querySelector('[data-action="toggle"]').addEventListener('click', (e) => {
    e.stopPropagation();
    this.toggleTaskStatus(task.id);
  });

  // Inline editing on double-click
  const nameEl = el.querySelector('[data-action="edit-name"]');
  nameEl.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    this.enableMasterListInlineEdit(el, task);
  });

  // File icons
  el.querySelectorAll('.master-list-file-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openFilePath(icon.dataset.path);
    });
  });

  // Open detail panel on single click
  el.addEventListener('click', () => {
    this.selectTask(task.id, el);
    this.openDetailPanel(task.id);
  });

  return el;
}

export function enableMasterListInlineEdit(itemEl, task) {
  const nameEl = itemEl.querySelector('.master-list-name');
  const currentName = task.name;

  // Replace with input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'master-list-name-input';
  input.value = currentName;

  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const saveEdit = () => {
    const newName = input.value.trim();
    if (newName && newName !== currentName) {
      task.name = newName;
      this.saveData();
      this.showToast('Task updated');
    }
    this.renderMasterList();
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      this.renderMasterList();
    }
  });
}

// File Path Methods
export function openFilePath(filePath) {
  if (filePath && window.api && window.api.openPath) {
    window.api.openPath(filePath);
  }
}

export function renderFilePathsInModal() {
  const container = document.getElementById('file-paths-container');
  const taskId = document.getElementById('task-id').value;
  let filePaths = [];

  if (taskId) {
    const task = this.findTask(taskId);
    if (task && task.filePaths) {
      filePaths = task.filePaths;
    }
  }

  // Store in temp for new tasks
  if (!this._tempFilePaths) this._tempFilePaths = [];
  if (!taskId) filePaths = this._tempFilePaths;

  container.innerHTML = filePaths.map((fp, index) => `
    <div class="file-path-item" data-index="${index}">
      <span class="file-path-icon">📄</span>
      <span class="file-path-text" title="${this.escapeHtml(fp)}">${this.escapeHtml(fp)}</span>
      <button type="button" class="file-path-remove" data-action="remove">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.file-path-text').forEach(el => {
    el.addEventListener('click', () => this.openFilePath(el.title));
  });

  container.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.closest('.file-path-item').dataset.index);
      if (taskId) {
        const task = this.findTask(taskId);
        if (task) {
          task.filePaths.splice(index, 1);
          this.saveData();
        }
      } else {
        this._tempFilePaths.splice(index, 1);
      }
      this.renderFilePathsInModal();
    });
  });
}

export function addFilePathToModal(path) {
  const taskId = document.getElementById('task-id').value;
  if (taskId) {
    const task = this.findTask(taskId);
    if (task) {
      if (!task.filePaths) task.filePaths = [];
      task.filePaths.push(path);
      this.saveData();
    }
  } else {
    if (!this._tempFilePaths) this._tempFilePaths = [];
    this._tempFilePaths.push(path);
  }
  this.renderFilePathsInModal();
}

export function renderTaskList() {
  const container = document.getElementById('tasks-container');
  const tasks = this.getFilteredTasks();

  container.innerHTML = '';

  // Special rendering for upcoming view - group by date
  if (this.currentView === 'upcoming') {
    this.renderUpcomingList(container, tasks);
    return;
  }

  // Render project header if viewing a project
  if (this.currentView.startsWith('project-')) {
    const projectId = this.currentView.replace('project-', '');
    const project = this.data.projects.find(p => p.id === projectId);
    if (project) {
      container.appendChild(this.createProjectHeader(project));
    }
  }

  if (tasks.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128203;</div>
        <h3>No tasks here</h3>
        <p>Click "Add Task" to create your first task</p>
      </div>
    `;
    container.appendChild(emptyState);
    return;
  }

  for (const task of tasks) {
    container.appendChild(this.createTaskElement(task));
  }
}

export function renderUpcomingList(container, tasks) {
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <h3>No upcoming tasks</h3>
        <p>Schedule tasks to see them here</p>
      </div>
    `;
    return;
  }

  // Group tasks by date (scheduledDate or dueDate)
  const groupedTasks = {};
  const today = this.getLocalDateString();

  for (const task of tasks) {
    const taskDate = task.scheduledDate || task.dueDate || 'unscheduled';
    if (!groupedTasks[taskDate]) {
      groupedTasks[taskDate] = [];
    }
    groupedTasks[taskDate].push(task);
  }

  // Sort tasks within each date by scheduledTime
  for (const date of Object.keys(groupedTasks)) {
    groupedTasks[date].sort((a, b) => {
      // Tasks with scheduledTime come first, sorted by time
      const timeA = a.scheduledTime || '99:99';
      const timeB = b.scheduledTime || '99:99';
      return timeA.localeCompare(timeB);
    });
  }

  // Sort dates
  const sortedDates = Object.keys(groupedTasks).sort((a, b) => {
    if (a === 'unscheduled') return 1;
    if (b === 'unscheduled') return -1;
    return a.localeCompare(b);
  });

  // Initialize collapsed state if not exists
  if (!this._upcomingCollapsedDates) {
    this._upcomingCollapsedDates = {};
  }

  for (const date of sortedDates) {
    const dateGroup = document.createElement('div');
    dateGroup.className = 'upcoming-date-group';

    const isCollapsed = this._upcomingCollapsedDates[date] || false;
    const taskCount = groupedTasks[date].length;
    const scheduledCount = groupedTasks[date].filter(t => t.scheduledTime).length;

    // Create date header
    const header = document.createElement('div');
    header.className = `upcoming-date-header ${isCollapsed ? 'collapsed' : ''}`;
    header.dataset.dateKey = date;
    header.innerHTML = `
      <span class="upcoming-date-toggle">${isCollapsed ? '▶' : '▼'}</span>
      <span class="upcoming-date-label">${this.formatUpcomingDate(date, today)}</span>
      <span class="upcoming-date-count">${taskCount} task${taskCount !== 1 ? 's' : ''}${scheduledCount > 0 ? ` (${scheduledCount} scheduled)` : ''}</span>
    `;

    // Click handled via delegation on #tasks-container

    dateGroup.appendChild(header);

    // Create tasks container
    if (!isCollapsed) {
      const tasksContainer = document.createElement('div');
      tasksContainer.className = 'upcoming-tasks-container';

      for (const task of groupedTasks[date]) {
        const taskEl = this.createTaskElement(task, true); // true = collapsible subtasks

        // Add time badge if scheduled
        if (task.scheduledTime) {
          const timeBadge = document.createElement('span');
          timeBadge.className = 'upcoming-time-badge';
          timeBadge.textContent = this.formatTime(task.scheduledTime);
          const taskContent = taskEl.querySelector('.task-content');
          if (taskContent) {
            taskContent.insertBefore(timeBadge, taskContent.firstChild);
          }
        }

        tasksContainer.appendChild(taskEl);
      }

      dateGroup.appendChild(tasksContainer);
    }

    container.appendChild(dateGroup);
  }
}

export function createProjectHeader(project) {
  const tasks = project.tasks || [];
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');
  const blockedTasks = activeTasks.filter(t => this.isTaskBlocked(t));

  // Calculate momentum - completions this week and month
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const completedThisWeek = completedTasks.filter(t => {
    if (!t.completedAt) return false;
    const completed = new Date(t.completedAt);
    return completed >= weekAgo;
  }).length;

  const completedThisMonth = completedTasks.filter(t => {
    if (!t.completedAt) return false;
    const completed = new Date(t.completedAt);
    return completed >= monthAgo;
  }).length;

  // Find next action - highest priority active task that's not blocked
  const nextAction = activeTasks
    .filter(t => !this.isTaskBlocked(t))
    .sort((a, b) => {
      const priorities = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
      return (priorities[a.priority] || 4) - (priorities[b.priority] || 4);
    })[0];

  // Status badge
  const statusConfig = {
    active: { icon: '⚡', label: 'Active', class: 'status-active' },
    paused: { icon: '💤', label: 'Paused', class: 'status-paused' },
    blocked: { icon: '🚫', label: 'Blocked', class: 'status-blocked' }
  };
  const status = statusConfig[project.status] || statusConfig.active;

  const header = document.createElement('div');
  header.className = 'project-header-card';

  header.innerHTML = `
    <div class="project-header-top">
      <span class="project-header-color" style="background:${project.color}"></span>
      <h2 class="project-header-name">${this.escapeHtml(project.name)}</h2>
      <span class="project-status-badge ${status.class}">${status.icon} ${status.label}</span>
      <button class="project-header-edit" title="Edit Project">&#9998;</button>
    </div>
    ${project.goal ? `<p class="project-header-goal">"${this.escapeHtml(project.goal)}"</p>` : ''}
    ${project.description ? `<p class="project-header-description">${this.escapeHtml(project.description)}</p>` : ''}

    <div class="project-momentum-section">
      <div class="momentum-stats">
        <div class="momentum-stat">
          <span class="momentum-value">${activeTasks.length}</span>
          <span class="momentum-label">active</span>
        </div>
        <div class="momentum-stat highlight">
          <span class="momentum-value">${completedThisWeek}</span>
          <span class="momentum-label">this week</span>
        </div>
        <div class="momentum-stat">
          <span class="momentum-value">${completedThisMonth}</span>
          <span class="momentum-label">this month</span>
        </div>
        ${blockedTasks.length > 0 ? `
        <div class="momentum-stat blocked">
          <span class="momentum-value">${blockedTasks.length}</span>
          <span class="momentum-label">blocked</span>
        </div>
        ` : ''}
      </div>
    </div>

    ${nextAction ? `
    <div class="project-next-action">
      <span class="next-action-label">Next up:</span>
      <span class="next-action-task" data-task-id="${nextAction.id}">
        ${nextAction.priority !== 'none' ? `<span class="priority-dot ${nextAction.priority}"></span>` : ''}
        ${this.escapeHtml(nextAction.name)}
      </span>
    </div>
    ` : `
    <div class="project-next-action empty">
      <span class="next-action-label">No active tasks</span>
    </div>
    `}
  `;

  header.querySelector('.project-header-edit').addEventListener('click', () => {
    this.openProjectModal(project.id);
  });

  // Make next action clickable
  const nextActionEl = header.querySelector('.next-action-task');
  if (nextActionEl) {
    nextActionEl.addEventListener('click', () => {
      this.openDetailPanel(nextAction.id);
    });
  }

  return header;
}

export function createTaskElement(task, collapsibleSubtasks = false) {
  const project = this.data.projects.find(p => p.tasks.some(t => t.id === task.id));
  const el = document.createElement('div');

  // Check dependency status
  const isBlocked = this.isTaskBlocked(task);
  const blocksCount = (task.blocks || []).filter(id => {
    const t = this.findTask(id);
    return t && t.status !== 'done';
  }).length;
  const blockedByCount = this.getBlockingTasks(task).length;

  let dependencyClass = '';
  if (isBlocked) dependencyClass = 'is-blocked';
  else if (blocksCount > 0) dependencyClass = 'is-blocking';

  el.className = `task-item ${task.status === 'done' ? 'completed' : ''} ${dependencyClass}`;
  el.dataset.id = task.id;

  const priorityClass = task.priority !== 'none' ? `priority-${task.priority}` : '';
  const checkClass = task.status === 'done' ? 'checked' : '';

  let dueDateHtml = '';
  if (task.dueDate) {
    const today = this.getLocalDateString();
    const dateClass = task.dueDate < today ? 'overdue' : (task.dueDate === today ? 'today' : '');
    const dateLabel = this.formatDate(task.dueDate);
    dueDateHtml = `<span class="task-due-date ${dateClass}">&#128197; ${dateLabel}</span>`;
  }

  let tagsHtml = '';
  if (task.tags.length > 0) {
    tagsHtml = '<div class="task-tags">' + task.tags.map(tagId => {
      const tag = this.data.tags.find(t => t.id === tagId);
      return tag ? `<span class="task-tag" style="background:${tag.color}">${this.escapeHtml(tag.name)}</span>` : '';
    }).join('') + '</div>';
  }

  let projectBadge = '';
  if (project && !project.isInbox && this.currentView !== `project-${project.id}`) {
    projectBadge = `<span class="task-project-badge"><span class="dot" style="background:${project.color}"></span>${this.escapeHtml(project.name)}</span>`;
  }

  let priorityBadge = '';
  if (task.priority !== 'none') {
    priorityBadge = `<span class="task-priority-badge ${task.priority}">${task.priority}</span>`;
  }

  let subtaskCount = '';
  if (task.subtasks && task.subtasks.length > 0) {
    const completed = task.subtasks.filter(st => st.status === 'done').length;
    subtaskCount = `<span class="task-subtask-count">&#9744; ${completed}/${task.subtasks.length}</span>`;
  }

  // Dependency badges
  let dependencyBadges = '';
  if (isBlocked || blocksCount > 0) {
    dependencyBadges = '<div class="task-dependency-badges">';
    if (isBlocked) {
      dependencyBadges += `<span class="dependency-badge blocked" data-action="dependencies" title="Blocked by ${blockedByCount} task(s)">&#128274; Blocked (${blockedByCount})</span>`;
    }
    if (blocksCount > 0) {
      dependencyBadges += `<span class="dependency-badge blocking" data-action="dependencies" title="Blocks ${blocksCount} task(s)">&#9939; Blocks ${blocksCount}</span>`;
    }
    dependencyBadges += '</div>';
  }

  let assignedBadge = '';
  if (task.assignedTo === 'claude') {
    assignedBadge = '<span class="assigned-badge claude-badge" title="Assigned to Claude">&#129302;</span>';
  } else if (task.assignedTo === 'vin') {
    assignedBadge = '<span class="assigned-badge vin-badge" title="Assigned to Tom">T</span>';
  }

  el.innerHTML = `
    <button type="button" class="task-checkbox ${checkClass} ${priorityClass}" data-action="toggle" data-task-id="${task.id}">${task.status === 'done' ? '&#10003;' : ''}</button>
    <div class="task-content">
      <div class="task-header">
        <span class="task-name">${this.escapeHtml(task.name)}</span>
        ${assignedBadge}
        ${priorityBadge}
        ${dependencyBadges}
      </div>
      <div class="task-meta">
        ${projectBadge}
        ${dueDateHtml}
        ${subtaskCount}
        ${tagsHtml}
      </div>
    </div>
    <div class="task-actions">
      <button class="task-action-btn" data-action="dependencies" title="Dependencies">&#128279;</button>
      <button class="task-action-btn" data-action="edit" title="Edit">&#9998;</button>
      <button class="task-action-btn" data-action="delete" title="Delete">&#128465;</button>
    </div>
  `;

  // Event listeners handled via delegation on #tasks-container (see bindEvents)

  // Render subtasks
  if (task.subtasks && task.subtasks.length > 0) {
    const completed = task.subtasks.filter(st => st.status === 'done').length;
    const total = task.subtasks.length;

    // Initialize collapsed state for this task if not exists
    if (!this._collapsedSubtasks) {
      this._collapsedSubtasks = {};
    }
    const isCollapsed = collapsibleSubtasks && this._collapsedSubtasks[task.id];

    const subtasksWrapper = document.createElement('div');
    subtasksWrapper.className = 'subtasks-wrapper';

    // Add toggle button if collapsible
    if (collapsibleSubtasks) {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = `subtasks-toggle ${isCollapsed ? 'collapsed' : ''}`;
      toggleBtn.innerHTML = `
        <span class="subtasks-toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
        <span class="subtasks-toggle-label">${completed}/${total} subtasks</span>
      `;
      // Click handled via delegation on #tasks-container
      subtasksWrapper.appendChild(toggleBtn);
    }

    if (!isCollapsed) {
      const subtasksContainer = document.createElement('div');
      subtasksContainer.className = 'subtasks-container';

      for (const subtask of task.subtasks) {
        subtasksContainer.appendChild(this.createSubtaskElement(subtask));
      }

      subtasksWrapper.appendChild(subtasksContainer);
    }

    el.querySelector('.task-content').appendChild(subtasksWrapper);
  }

  return el;
}

export function createSubtaskElement(subtask) {
  const el = document.createElement('div');
  el.className = `subtask-item ${subtask.status === 'done' ? 'completed' : ''}`;
  el.dataset.subtaskId = subtask.id;
  let assignedBadge = '';
  if (subtask.assignedTo === 'claude') {
    assignedBadge = '<span class="assigned-badge claude-badge" title="Assigned to Claude">&#129302;</span>';
  } else if (subtask.assignedTo === 'vin') {
    assignedBadge = '<span class="assigned-badge vin-badge" title="Assigned to Tom">T</span>';
  }
  el.innerHTML = `
    <button type="button" class="subtask-checkbox ${subtask.status === 'done' ? 'checked' : ''}">${subtask.status === 'done' ? '&#10003;' : ''}</button>
    <span class="subtask-name">${this.escapeHtml(subtask.name)}</span>
    ${assignedBadge}
  `;

  // Click handled via delegation on #tasks-container

  return el;
}

export function renderTaskBoard() {
  const tasks = this.getFilteredTasks();
  // Map new statuses to board columns:
  // - 'ready' displays in 'todo' column
  // - 'waiting' displays in 'review' column
  const statusMap = {
    'todo': ['todo', 'ready'],
    'in-progress': ['in-progress'],
    'review': ['review', 'waiting'],
    'done': ['done']
  };

  Object.entries(statusMap).forEach(([columnStatus, taskStatuses]) => {
    const column = document.querySelector(`.column-tasks[data-status="${columnStatus}"]`);
    const countEl = document.querySelector(`.board-column[data-status="${columnStatus}"] .column-count`);
    if (!column || !countEl) return;

    const statusTasks = tasks.filter(t => taskStatuses.includes(t.status));

    countEl.textContent = statusTasks.length;
    column.innerHTML = '';

    for (const task of statusTasks) {
      column.appendChild(this.createBoardTaskElement(task));
    }
  });
}

export function createBoardTaskElement(task) {
  const el = document.createElement('div');
  el.className = 'board-task';
  el.dataset.id = task.id;
  el.draggable = true;

  let priorityBadge = '';
  if (task.priority !== 'none') {
    priorityBadge = `<span class="task-priority-badge ${task.priority}">${task.priority}</span>`;
  }

  let dueDateHtml = '';
  if (task.dueDate) {
    const today = this.getLocalDateString();
    const dateClass = task.dueDate < today ? 'overdue' : (task.dueDate === today ? 'today' : '');
    dueDateHtml = `<span class="task-due-date ${dateClass}">&#128197; ${this.formatDate(task.dueDate)}</span>`;
  }

  let tagsHtml = task.tags.slice(0, 2).map(tagId => {
    const tag = this.data.tags.find(t => t.id === tagId);
    return tag ? `<span class="task-tag" style="background:${tag.color}">${this.escapeHtml(tag.name)}</span>` : '';
  }).join('');

  el.innerHTML = `
    <div class="board-task-header">
      <span class="board-task-name">${this.escapeHtml(task.name)}</span>
      ${priorityBadge}
    </div>
    <div class="board-task-meta">
      ${dueDateHtml}
      ${tagsHtml}
    </div>
  `;

  // Click and drag events handled via delegation on #tasks-container

  return el;
}

export function openTaskModal(taskId = null, preselectedProjectId = null) {
  const modal = document.getElementById('task-modal');
  const form = document.getElementById('task-form');
  const title = document.getElementById('task-modal-title');

  form.reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-parent-id').value = '';

  // Reset context guide
  const contextToggle = document.getElementById('context-guide-toggle');
  const contextGuide = document.getElementById('context-guide');
  if (contextToggle && contextGuide) {
    contextToggle.classList.remove('expanded');
    contextGuide.classList.remove('show');
    contextToggle.querySelector('span').textContent = 'Show prompts';
  }

  // Reset tag checkboxes
  document.querySelectorAll('#tags-selector input').forEach(cb => {
    cb.checked = false;
    cb.parentElement.classList.remove('selected');
  });

  // Populate project dropdown
  const projectSelect = document.getElementById('task-project');
  projectSelect.innerHTML = '<option value="">No Project (Inbox)</option>';
  this.data.projects.filter(p => !p.isInbox).forEach(p => {
    projectSelect.innerHTML += `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`;
  });

  // Reset scheduling fields
  document.getElementById('task-scheduled-time').value = '';
  document.getElementById('task-scheduled-date').value = '';
  document.getElementById('task-estimated-minutes').value = '';
  document.querySelectorAll('.duration-btn').forEach(btn => btn.classList.remove('selected'));

  if (taskId) {
    const task = this.findTask(taskId);
    if (task) {
      title.textContent = 'Edit Task';
      document.getElementById('task-id').value = task.id;
      document.getElementById('task-name').value = task.name;
      document.getElementById('task-description').value = task.description || '';
      document.getElementById('task-context').value = task.context || '';
      document.getElementById('task-project').value = task.projectId || '';
      document.getElementById('task-status').value = task.status;
      document.getElementById('task-priority').value = task.priority;
      document.getElementById('task-due-date').value = task.dueDate || '';

      // Set scheduling fields
      document.getElementById('task-scheduled-time').value = task.scheduledTime || '';
      document.getElementById('task-scheduled-date').value = task.scheduledDate || '';
      document.getElementById('task-estimated-minutes').value = task.estimatedMinutes || '';

      // Select duration button if estimatedMinutes is set
      if (task.estimatedMinutes) {
        const durationBtn = document.querySelector(`.duration-btn[data-minutes="${task.estimatedMinutes}"]`);
        if (durationBtn) durationBtn.classList.add('selected');
      }

      // Set tags
      task.tags.forEach(tagId => {
        const cb = document.querySelector(`#tags-selector input[value="${tagId}"]`);
        if (cb) {
          cb.checked = true;
          cb.parentElement.classList.add('selected');
        }
      });
    }
  } else {
    title.textContent = 'Add Task';

    // Pre-select project if specified or if viewing a project
    const presetProjectId = preselectedProjectId || (this.currentView.startsWith('project-') ? this.currentView.replace('project-', '') : null);
    if (presetProjectId) {
      document.getElementById('task-project').value = presetProjectId;
    }
    // Clear temp file paths for new tasks
    this._tempFilePaths = [];
  }

  // Render file paths
  this.renderFilePathsInModal();

  this.openModal('task-modal');
  document.getElementById('task-name').focus();
}

export function saveTaskForm() {
  const taskId = document.getElementById('task-id').value;
  const selectedTags = Array.from(document.querySelectorAll('#tags-selector input:checked'))
    .map(cb => cb.value);

  // Get scheduling fields
  const scheduledTime = document.getElementById('task-scheduled-time').value || null;
  const scheduledDate = document.getElementById('task-scheduled-date').value || null;
  const estimatedMinutes = parseInt(document.getElementById('task-estimated-minutes').value) || null;

  const taskData = {
    name: document.getElementById('task-name').value.trim(),
    description: document.getElementById('task-description').value.trim(),
    context: document.getElementById('task-context').value.trim(),
    projectId: document.getElementById('task-project').value || null,
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    dueDate: document.getElementById('task-due-date').value || null,
    scheduledTime: scheduledTime,
    scheduledDate: scheduledDate || (scheduledTime ? this.getLocalDateString() : null),
    estimatedMinutes: estimatedMinutes,
    tags: selectedTags,
    filePaths: this._tempFilePaths || []
  };

  if (taskId) {
    // Don't overwrite file paths when editing - they're managed separately
    delete taskData.filePaths;
    this.updateTask(taskId, taskData);
  } else {
    this.createTask(taskData);
  }

  this.closeModal('task-modal');
  this.render();
}

export function openProjectModal(projectId = null) {
  const modal = document.getElementById('project-modal');
  const form = document.getElementById('project-form');
  const title = document.getElementById('project-modal-title');
  const deleteBtn = document.getElementById('delete-project-btn');

  form.reset();
  document.getElementById('project-id').value = '';

  // Populate category dropdown
  const categorySelect = document.getElementById('project-category');
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">No Category</option>';
    for (const category of this.data.categories || []) {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    }
  }

  // Reset color selection
  document.querySelectorAll('#project-color-picker .color-option').forEach(o => o.classList.remove('selected'));
  document.querySelector('#project-color-picker .color-option').classList.add('selected');
  document.getElementById('project-color').value = '#3498db';

  // Reset goal and status
  const goalInput = document.getElementById('project-goal');
  if (goalInput) goalInput.value = '';
  const statusSelect = document.getElementById('project-status');
  if (statusSelect) statusSelect.value = 'active';

  if (projectId) {
    const project = this.data.projects.find(p => p.id === projectId);
    if (project) {
      title.textContent = 'Edit Project';
      document.getElementById('project-id').value = project.id;
      document.getElementById('project-name').value = project.name;
      document.getElementById('project-description').value = project.description || '';
      document.getElementById('project-color').value = project.color;

      // Set category
      if (categorySelect && project.categoryId) {
        categorySelect.value = project.categoryId;
      }

      // Set goal
      if (goalInput && project.goal) {
        goalInput.value = project.goal;
      }

      // Set status
      if (statusSelect && project.status) {
        statusSelect.value = project.status;
      }

      // Select color
      document.querySelectorAll('#project-color-picker .color-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.color === project.color);
      });

      deleteBtn.style.display = 'block';
    }
  } else {
    title.textContent = 'Add Project';
    deleteBtn.style.display = 'none';
  }

  this.openModal('project-modal');
  document.getElementById('project-name').focus();
}

export function saveProjectForm() {
  const projectId = document.getElementById('project-id').value;
  const categorySelect = document.getElementById('project-category');
  const goalInput = document.getElementById('project-goal');
  const statusSelect = document.getElementById('project-status');

  const projectData = {
    name: document.getElementById('project-name').value.trim(),
    description: document.getElementById('project-description').value.trim(),
    color: document.getElementById('project-color').value,
    categoryId: categorySelect ? categorySelect.value || null : null,
    goal: goalInput ? goalInput.value.trim() : '',
    status: statusSelect ? statusSelect.value : 'active'
  };

  if (projectId) {
    this.updateProject(projectId, projectData);
  } else {
    this.createProject(projectData);
  }

  this.closeModal('project-modal');
  this.render();
}

// Category Modal Methods
export function openCategoryModal(categoryId = null) {
  const modal = document.getElementById('category-modal');
  if (!modal) return;

  const form = document.getElementById('category-form');
  const title = document.getElementById('category-modal-title');
  const deleteBtn = document.getElementById('delete-category-btn');

  form.reset();
  document.getElementById('category-id').value = '';

  // Reset color selection
  document.querySelectorAll('#category-color-picker .color-option').forEach(o => o.classList.remove('selected'));
  const firstColor = document.querySelector('#category-color-picker .color-option');
  if (firstColor) firstColor.classList.add('selected');
  document.getElementById('category-color').value = '#6366f1';

  if (categoryId) {
    const category = this.data.categories.find(c => c.id === categoryId);
    if (category) {
      title.textContent = 'Edit Category';
      document.getElementById('category-id').value = category.id;
      document.getElementById('category-name').value = category.name;
      document.getElementById('category-color').value = category.color;

      // Select color
      document.querySelectorAll('#category-color-picker .color-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.color === category.color);
      });

      deleteBtn.style.display = 'block';
    }
  } else {
    title.textContent = 'Add Category';
    deleteBtn.style.display = 'none';
  }

  this.openModal('category-modal');
  document.getElementById('category-name').focus();
}

export function saveCategoryForm() {
  const categoryId = document.getElementById('category-id').value;
  const categoryData = {
    name: document.getElementById('category-name').value.trim(),
    color: document.getElementById('category-color').value
  };

  if (categoryId) {
    this.updateCategory(categoryId, categoryData);
  } else {
    this.createCategory(categoryData);
  }

  this.closeModal('category-modal');
  this.render();
}

export function confirmDeleteCategory() {
  const categoryId = document.getElementById('category-id').value;
  if (!categoryId) return;

  const category = this.data.categories.find(c => c.id === categoryId);
  if (!category) return;

  // Count projects in this category
  const projectCount = this.data.projects.filter(p => p.categoryId === categoryId).length;

  this.showConfirmDialog(
    'Delete Category',
    `Delete "${category.name}"? ${projectCount > 0 ? `${projectCount} project(s) will become uncategorized.` : ''}`,
    () => {
      this.deleteCategory(categoryId);
      this.closeModal('category-modal');
      this.render();
    }
  );
}

// Dependency Modal Methods
export function openDependencyModal(taskId) {
  const task = this.findTask(taskId);
  if (!task) return;

  const modal = document.getElementById('dependency-modal');
  if (!modal) return;

  document.getElementById('dependency-task-id').value = taskId;
  document.querySelector('#dependency-task-info .dependency-task-name').textContent = task.name;

  // Render blocked by list
  this.renderBlockedByList(task);

  // Render blocks list
  this.renderBlocksList(task);

  // Populate available tasks for adding blockers
  this.populateBlockerSelect(task);

  this.openModal('dependency-modal');
}

export function renderBlockedByList(task) {
  const container = document.getElementById('blocked-by-list');
  const countEl = document.getElementById('blocked-by-count');
  container.innerHTML = '';

  const blockers = (task.blockedBy || [])
    .map(id => this.findTask(id))
    .filter(Boolean);

  countEl.textContent = `(${blockers.length})`;

  if (blockers.length === 0) {
    container.innerHTML = '<div class="dependency-empty">No blockers</div>';
    return;
  }

  for (const blocker of blockers) {
    const item = document.createElement('div');
    item.className = 'dependency-item';
    item.innerHTML = `
      <span class="dependency-item-status ${blocker.status}"></span>
      <span class="dependency-item-name">${this.escapeHtml(blocker.name)}</span>
      <button class="dependency-item-remove" title="Remove blocker" data-blocker-id="${blocker.id}">&#10005;</button>
    `;

    item.querySelector('.dependency-item-remove').addEventListener('click', () => {
      this.removeDependency(task.id, blocker.id);
      this.openDependencyModal(task.id); // Refresh modal
      this.render();
    });

    container.appendChild(item);
  }
}

export function renderBlocksList(task) {
  const container = document.getElementById('blocks-list');
  const countEl = document.getElementById('blocks-count');
  container.innerHTML = '';

  const blocked = (task.blocks || [])
    .map(id => this.findTask(id))
    .filter(Boolean);

  countEl.textContent = `(${blocked.length})`;

  if (blocked.length === 0) {
    container.innerHTML = '<div class="dependency-empty">Not blocking any tasks</div>';
    return;
  }

  for (const blockedTask of blocked) {
    const item = document.createElement('div');
    item.className = 'dependency-item';
    item.innerHTML = `
      <span class="dependency-item-status ${blockedTask.status}"></span>
      <span class="dependency-item-name">${this.escapeHtml(blockedTask.name)}</span>
    `;
    container.appendChild(item);
  }
}

export function populateBlockerSelect(task) {
  const select = document.getElementById('add-blocker-select');
  if (!select) return;

  select.innerHTML = '<option value="">Select a task...</option>';

  const allTasks = this.getAllTasks();
  const currentBlockers = task.blockedBy || [];

  for (const t of allTasks) {
    // Skip current task, already blockers, and completed tasks
    if (t.id === task.id || currentBlockers.includes(t.id) || t.status === 'done') {
      continue;
    }
    // Skip if adding would create circular dependency
    if (this.wouldCreateCircularDependency(task.id, t.id)) {
      continue;
    }

    const option = document.createElement('option');
    option.value = t.id;
    option.textContent = t.name;
    select.appendChild(option);
  }
}

export function addBlockerFromModal() {
  const taskId = document.getElementById('dependency-task-id').value;
  const select = document.getElementById('add-blocker-select');
  const blockerId = select.value;

  if (!taskId || !blockerId) return;

  this.addDependency(taskId, blockerId);
  this.openDependencyModal(taskId); // Refresh modal
  this.render();
}

export function openTagModal(tagId = null) {
  const modal = document.getElementById('tag-modal');
  const form = document.getElementById('tag-form');
  const title = document.getElementById('tag-modal-title');
  const deleteBtn = document.getElementById('delete-tag-btn');

  form.reset();
  document.getElementById('tag-id').value = '';

  // Reset color selection
  document.querySelectorAll('#tag-color-picker .color-option').forEach(o => o.classList.remove('selected'));
  document.querySelector('#tag-color-picker .color-option').classList.add('selected');
  document.getElementById('tag-color').value = '#3498db';

  if (tagId) {
    const tag = this.data.tags.find(t => t.id === tagId);
    if (tag) {
      title.textContent = 'Edit Tag';
      document.getElementById('tag-id').value = tag.id;
      document.getElementById('tag-name').value = tag.name;
      document.getElementById('tag-color').value = tag.color;

      // Select color
      document.querySelectorAll('#tag-color-picker .color-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.color === tag.color);
      });

      deleteBtn.style.display = 'block';
    }
  } else {
    title.textContent = 'Add Tag';
    deleteBtn.style.display = 'none';
  }

  this.openModal('tag-modal');
  document.getElementById('tag-name').focus();
}

export function saveTagForm() {
  const tagId = document.getElementById('tag-id').value;
  const tagData = {
    name: document.getElementById('tag-name').value.trim(),
    color: document.getElementById('tag-color').value
  };

  if (tagId) {
    this.updateTag(tagId, tagData);
  } else {
    this.createTag(tagData);
  }

  this.closeModal('tag-modal');
  this.render();
}

export function confirmDeleteTask(taskId) {
  const task = this.findTask(taskId);
  if (!task) return;

  document.getElementById('confirm-title').textContent = 'Delete Task';
  document.getElementById('confirm-message').textContent = `Are you sure you want to delete "${task.name}"?`;

  const okBtn = document.getElementById('confirm-ok');
  const cancelBtn = document.getElementById('confirm-cancel');

  const handleOk = () => {
    this.deleteTask(taskId);
    this.closeDetailPanel();
    this.render();
    cleanup();
  };

  const handleCancel = () => {
    cleanup();
  };

  const cleanup = () => {
    okBtn.removeEventListener('click', handleOk);
    cancelBtn.removeEventListener('click', handleCancel);
    this.closeModal('confirm-modal');
  };

  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
  this.openModal('confirm-modal');
}

export function confirmDeleteProject() {
  const projectId = document.getElementById('project-id').value;
  const project = this.data.projects.find(p => p.id === projectId);
  if (!project) return;

  document.getElementById('confirm-title').textContent = 'Delete Project';
  document.getElementById('confirm-message').textContent = `Are you sure you want to delete "${project.name}" and all its tasks?`;

  const okBtn = document.getElementById('confirm-ok');
  const cancelBtn = document.getElementById('confirm-cancel');

  const handleOk = () => {
    this.deleteProject(projectId);
    this.closeModal('project-modal');
    this.render();
    cleanup();
  };

  const handleCancel = () => {
    cleanup();
  };

  const cleanup = () => {
    okBtn.removeEventListener('click', handleOk);
    cancelBtn.removeEventListener('click', handleCancel);
    this.closeModal('confirm-modal');
  };

  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
  this.openModal('confirm-modal');
}

export function confirmDeleteTag() {
  const tagId = document.getElementById('tag-id').value;
  const tag = this.data.tags.find(t => t.id === tagId);
  if (!tag) return;

  document.getElementById('confirm-title').textContent = 'Delete Tag';
  document.getElementById('confirm-message').textContent = `Are you sure you want to delete the tag "${tag.name}"?`;

  const okBtn = document.getElementById('confirm-ok');
  const cancelBtn = document.getElementById('confirm-cancel');

  const handleOk = () => {
    this.deleteTag(tagId);
    this.closeModal('tag-modal');
    this.render();
    cleanup();
  };

  const handleCancel = () => {
    cleanup();
  };

  const cleanup = () => {
    okBtn.removeEventListener('click', handleOk);
    cancelBtn.removeEventListener('click', handleCancel);
    this.closeModal('confirm-modal');
  };

  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
  this.openModal('confirm-modal');
}

// Detail Panel
export function openDetailPanel(taskId) {
  const task = this.findTask(taskId);
  if (!task) return;

  this.selectedTask = task;
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');

  const project = this.data.projects.find(p => p.tasks.some(t => t.id === task.id));

  let statusOptions = ['todo', 'ready', 'in-progress', 'waiting', 'review', 'done'].map(s =>
    `<option value="${s}" ${task.status === s ? 'selected' : ''}>${this.formatStatus(s)}</option>`
  ).join('');

  let priorityOptions = ['none', 'low', 'medium', 'high', 'urgent'].map(p =>
    `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`
  ).join('');

  let subtasksHtml = '';
  if (task.subtasks && task.subtasks.length > 0) {
    subtasksHtml = task.subtasks.map(st => `
      <div class="subtask-item ${st.status === 'done' ? 'completed' : ''}" data-id="${st.id}">
        <div class="subtask-checkbox ${st.status === 'done' ? 'checked' : ''}">${st.status === 'done' ? '&#10003;' : ''}</div>
        <span class="subtask-name">${this.escapeHtml(st.name)}</span>
        <select class="subtask-assigned-to" data-subtask-id="${st.id}">
          <option value="" ${!st.assignedTo ? 'selected' : ''}>-</option>
          <option value="vin" ${st.assignedTo === 'vin' ? 'selected' : ''}>Tom</option>
          <option value="claude" ${st.assignedTo === 'claude' ? 'selected' : ''}>Claude</option>
        </select>
        <button class="task-action-btn delete-subtask" title="Delete">&#10005;</button>
      </div>
    `).join('');
  }

  // File paths HTML
  let filePathsHtml = '';
  if (task.filePaths && task.filePaths.length > 0) {
    filePathsHtml = `
      <div class="detail-section">
        <h4>Attached Files</h4>
        <div class="detail-files">
          ${task.filePaths.map(fp => `
            <div class="detail-file-item" data-path="${this.escapeHtml(fp)}">
              <span class="detail-file-icon">📄</span>
              <span class="detail-file-path">${this.escapeHtml(fp)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="detail-section detail-header-section">
      <h4 class="detail-task-name">${this.escapeHtml(task.name)}</h4>
      <button class="btn btn-small btn-ghost" id="detail-copy-btn" title="Copy task to clipboard">📋 Copy</button>
    </div>
    ${task.description ? `<p class="detail-description">${this.escapeHtml(task.description)}</p>` : ''}
    ${task.context ? `
      <div class="detail-context">
        <div class="detail-context-header">Brain Dump / Context</div>
        <div class="detail-context-content">${this.escapeHtml(task.context)}</div>
      </div>
    ` : ''}

    <div class="detail-section">
      <div class="detail-field">
        <span class="detail-field-label">Status</span>
        <select class="detail-field-value" id="detail-status">${statusOptions}</select>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Priority</span>
        <select class="detail-field-value" id="detail-priority">${priorityOptions}</select>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Due Date</span>
        <input type="date" class="detail-field-value" id="detail-due-date" value="${task.dueDate || ''}">
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Project</span>
        <span class="detail-field-value">${project && !project.isInbox ? this.escapeHtml(project.name) : 'Inbox'}</span>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Assigned To</span>
        <select class="detail-field-value" id="detail-assigned-to">
          <option value="" ${!task.assignedTo ? 'selected' : ''}>Unassigned</option>
          <option value="vin" ${task.assignedTo === 'vin' ? 'selected' : ''}>Tom</option>
          <option value="claude" ${task.assignedTo === 'claude' ? 'selected' : ''}>Claude</option>
        </select>
      </div>
    </div>

    ${task.scheduledDate || task.scheduledTime || task.estimatedMinutes || task.waitingReason ? `
    <div class="detail-section detail-scheduling">
      <h4>Scheduling</h4>
      ${task.scheduledDate || task.scheduledTime ? `
      <div class="detail-field">
        <span class="detail-field-label">Scheduled</span>
        <span class="detail-field-value">${task.scheduledTime ? `${task.scheduledTime} on ` : ''}${task.scheduledDate || 'today'}</span>
      </div>` : ''}
      ${task.estimatedMinutes ? `
      <div class="detail-field">
        <span class="detail-field-label">Estimated Duration</span>
        <span class="detail-field-value">${task.estimatedMinutes} minutes</span>
      </div>` : ''}
      ${task.waitingReason ? `
      <div class="detail-field detail-waiting-reason">
        <span class="detail-field-label">Waiting Reason</span>
        <span class="detail-field-value">${this.escapeHtml(task.waitingReason)}${task.blockedBy ? ` (${this.escapeHtml(task.blockedBy)})` : ''}</span>
      </div>` : ''}
    </div>` : ''}

    ${filePathsHtml}

    <div class="detail-section">
      <h4>Subtasks</h4>
      <div class="detail-subtasks">
        ${subtasksHtml}
      </div>
      <div class="detail-add-subtask">
        <input type="text" id="new-subtask-input" placeholder="Add a subtask...">
        <button class="btn btn-primary" id="add-subtask-btn">Add</button>
      </div>
    </div>

    <div class="detail-section">
      <h4>Notes</h4>
      <textarea class="detail-notes" id="detail-notes" placeholder="Add notes about this task...">${this.escapeHtml(task.workNotes || '')}</textarea>
    </div>

    ${task.status === 'done' && task.completionSummary ? `
    <div class="detail-section detail-completion">
      <h4>Completion Summary</h4>
      <div class="detail-completion-content">${this.escapeHtml(task.completionSummary)}</div>
    </div>
    ` : ''}

    <div class="detail-actions">
      <button class="btn btn-secondary" id="detail-edit-btn">Edit</button>
      <button class="btn btn-danger" id="detail-delete-btn">Delete</button>
    </div>
  `;

  // Bind detail panel events
  content.querySelector('#detail-status').addEventListener('change', (e) => {
    const newStatus = e.target.value;
    if (newStatus === 'done' && task.status !== 'done') {
      // Show completion summary modal
      this.showCompletionSummaryModal(task.id, () => {
        this.render();
        this.refreshCommandCenter();
        this.openDetailPanel(task.id);
      });
    } else if (newStatus === 'waiting' && task.status !== 'waiting') {
      this.showBlockerReasonPopup(task.id, () => {
        this.render();
        this.refreshCommandCenter();
        this.openDetailPanel(task.id);
      });
    } else {
      this.updateTask(task.id, { status: newStatus });
      this.render();
      this.refreshCommandCenter();
    }
  });

  content.querySelector('#detail-priority').addEventListener('change', (e) => {
    this.updateTask(task.id, { priority: e.target.value });
    this.render();
    this.refreshCommandCenter();
  });

  content.querySelector('#detail-due-date').addEventListener('change', (e) => {
    this.updateTask(task.id, { dueDate: e.target.value || null });
    this.render();
    this.refreshCommandCenter();
  });

  content.querySelector('#detail-assigned-to').addEventListener('change', (e) => {
    this.updateTask(task.id, { assignedTo: e.target.value || null });
    this.render();
    this.refreshCommandCenter();
  });

  content.querySelector('#add-subtask-btn').addEventListener('click', () => {
    const input = content.querySelector('#new-subtask-input');
    const name = input.value.trim();
    if (name) {
      this.createTask({ name, parentId: task.id });
      input.value = '';
      this.openDetailPanel(task.id);
      this.render();
    }
  });

  content.querySelector('#new-subtask-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      content.querySelector('#add-subtask-btn').click();
    }
  });

  content.querySelectorAll('.subtask-checkbox').forEach(cb => {
    cb.addEventListener('click', () => {
      const subtaskId = cb.closest('.subtask-item').dataset.id;
      this.toggleTaskStatus(subtaskId);
      this.openDetailPanel(task.id);
    });
  });

  content.querySelectorAll('.delete-subtask').forEach(btn => {
    btn.addEventListener('click', () => {
      const subtaskId = btn.closest('.subtask-item').dataset.id;
      this.deleteTask(subtaskId);
      this.openDetailPanel(task.id);
      this.render();
    });
  });

  content.querySelectorAll('.subtask-assigned-to').forEach(select => {
    select.addEventListener('change', (e) => {
      const subtaskId = e.target.dataset.subtaskId;
      this.updateSubtask(task.id, subtaskId, { assignedTo: e.target.value || null });
      this.render();
    });
  });

  content.querySelector('#detail-edit-btn').addEventListener('click', () => {
    this.openTaskModal(task.id);
  });

  content.querySelector('#detail-delete-btn').addEventListener('click', () => {
    this.confirmDeleteTask(task.id);
  });

  // Copy button
  content.querySelector('#detail-copy-btn').addEventListener('click', () => {
    this.copyTaskToClipboard(task);
  });

  // File path clicks
  content.querySelectorAll('.detail-file-item').forEach(item => {
    item.addEventListener('click', () => {
      this.openFilePath(item.dataset.path);
    });
  });

  // Notes - save on blur
  const notesInput = content.querySelector('#detail-notes');
  if (notesInput) {
    notesInput.addEventListener('blur', () => {
      this.updateTask(task.id, { workNotes: notesInput.value });
    });
  }

  panel.classList.add('open');
}

export function copyTaskToClipboard(task) {
  const project = this.data.projects.find(p => p.tasks.some(t => t.id === task.id));
  const projectName = project && !project.isInbox ? project.name : 'Inbox';

  let text = `# ${task.name}\n\n`;
  text += `**Status:** ${this.formatStatus(task.status)}\n`;
  text += `**Priority:** ${task.priority}\n`;
  text += `**Project:** ${projectName}\n`;
  if (task.dueDate) text += `**Due:** ${task.dueDate}\n`;

  if (task.description) {
    text += `\n## Description\n${task.description}\n`;
  }

  if (task.context) {
    text += `\n## Context / Brain Dump\n${task.context}\n`;
  }

  if (task.filePaths && task.filePaths.length > 0) {
    text += `\n## Attached Files\n`;
    task.filePaths.forEach(fp => {
      text += `- ${fp}\n`;
    });
  }

  if (task.subtasks && task.subtasks.length > 0) {
    text += `\n## Subtasks\n`;
    task.subtasks.forEach(st => {
      text += `- [${st.status === 'done' ? 'x' : ' '}] ${st.name}\n`;
    });
  }

  if (window.api && window.api.copyToClipboard) {
    window.api.copyToClipboard(text);
    // Show quick feedback
    const btn = document.getElementById('detail-copy-btn');
    const original = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  }
}

export function closeDetailPanel() {
  document.getElementById('detail-panel').classList.remove('open');
  this.selectedTask = null;
}

export function showCompletionSummaryModal(taskId, onComplete) {
  const task = this.findTask(taskId);
  if (!task) return;

  // Remove existing modal if any
  document.querySelector('.completion-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'completion-modal';
  modal.innerHTML = `
    <div class="completion-modal-backdrop"></div>
    <div class="completion-modal-content">
      <div class="completion-modal-header">
        <span class="completion-modal-icon">✓</span>
        <h3>Task Complete!</h3>
      </div>
      <div class="completion-modal-task">${this.escapeHtml(task.name)}</div>
      <div class="completion-modal-body">
        <label for="completion-summary">What did you accomplish? (optional)</label>
        <textarea id="completion-summary" placeholder="Brief summary of what was done, decisions made, or outcomes..."></textarea>
        <div class="completion-energy-row">
          <label>How did that feel?</label>
          <div class="completion-energy-options">
            <button type="button" class="energy-choice" data-rating="1" title="Drained">&#128553;</button>
            <button type="button" class="energy-choice" data-rating="2" title="Neutral">&#128528;</button>
            <button type="button" class="energy-choice" data-rating="3" title="Energized">&#128170;</button>
          </div>
        </div>
      </div>
      <div class="completion-modal-actions">
        <button class="btn btn-secondary" id="completion-skip">Skip</button>
        <button class="btn btn-success" id="completion-save">Save & Complete</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Focus textarea
  setTimeout(() => modal.querySelector('#completion-summary').focus(), 100);

  let selectedEnergy = null;

  // Energy rating buttons
  modal.querySelectorAll('.energy-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.energy-choice').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEnergy = parseInt(btn.dataset.rating);
    });
  });

  const closeModal = () => {
    modal.remove();
  };

  // Skip button - complete without summary
  modal.querySelector('#completion-skip').addEventListener('click', () => {
    const updates = { status: 'done' };
    if (selectedEnergy) updates.energyRating = selectedEnergy;
    this.updateTask(taskId, updates);
    this.addCompletionToRecap(task.name, null);
    closeModal();
    if (onComplete) onComplete();
  });

  // Save button - complete with summary
  modal.querySelector('#completion-save').addEventListener('click', () => {
    const summary = modal.querySelector('#completion-summary').value.trim();
    const updates = {
      status: 'done',
      completionSummary: summary || null
    };
    if (selectedEnergy) updates.energyRating = selectedEnergy;
    this.updateTask(taskId, updates);
    this.addCompletionToRecap(task.name, summary || null);
    closeModal();
    if (onComplete) onComplete();
  });

  // Backdrop click closes
  modal.querySelector('.completion-modal-backdrop').addEventListener('click', () => {
    // Revert the status dropdown if they cancel
    closeModal();
    this.openDetailPanel(taskId);
  });

  // Enter key saves
  modal.querySelector('#completion-summary').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      modal.querySelector('#completion-save').click();
    }
  });
}

// Log completed task to recap
export function addCompletionToRecap(taskName, summary) {
  if (!this.data.recapLog) this.data.recapLog = [];
  const content = summary
    ? `Completed: ${taskName} — ${summary}`
    : `Completed: ${taskName}`;
  this.data.recapLog.push({
    id: this.generateId(),
    type: 'accomplishment',
    content: content,
    date: this.getLocalDateString(),
    relatedTaskId: null,
    tags: [],
    createdAt: new Date().toISOString()
  });
  this.saveData();
}

// Task Actions
export function toggleTaskStatus(taskId) {
  const task = this.findTask(taskId);
  if (task) {
    const wasDone = task.status === 'done';
    const newStatus = wasDone ? 'todo' : 'done';
    this.updateTask(taskId, { status: newStatus });
    if (!wasDone) {
      this.showToast(`${task.name} completed`);
      this.addCompletionToRecap(task.name, null);
    }
    this.render();
  }
}

// P3.2 - Inline Edit
export function enableInlineEdit(taskElement, task) {
  // Find the name element - check all possible class names used in the app
  const nameEl = taskElement.querySelector('.task-name, .focus-queue-name, .timeline-task-name, .board-task-name, .master-list-name');
  if (!nameEl || nameEl.classList.contains('editing')) return;

  const originalText = task.name;
  nameEl.contentEditable = 'true';
  nameEl.classList.add('editing', 'task-name-editable');
  nameEl.focus();

  // Select all text
  const range = document.createRange();
  range.selectNodeContents(nameEl);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  const finishEdit = (save) => {
    nameEl.contentEditable = 'false';
    nameEl.classList.remove('editing');

    const newText = nameEl.textContent.trim();
    if (save && newText && newText !== originalText) {
      this.updateTask(task.id, { name: newText });
    } else {
      nameEl.textContent = originalText;
    }
  };

  const keyHandler = (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      finishEdit(true);
      nameEl.removeEventListener('keydown', keyHandler);
      nameEl.removeEventListener('blur', blurHandler);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      finishEdit(false);
      nameEl.removeEventListener('keydown', keyHandler);
      nameEl.removeEventListener('blur', blurHandler);
    }
  };

  const blurHandler = () => {
    finishEdit(true);
    nameEl.removeEventListener('keydown', keyHandler);
    nameEl.removeEventListener('blur', blurHandler);
  };

  nameEl.addEventListener('keydown', keyHandler);
  nameEl.addEventListener('blur', blurHandler);
}

// P3.3 - Task Resize
export function makeTaskResizable(taskBlock, task) {
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

    const onMouseMove = (ev) => {
      const deltaY = ev.clientY - startY;
      const slotHeight = 35; // Height of one 30-min slot
      const deltaSlots = Math.round(deltaY / slotHeight);
      const newMinutes = Math.max(15, Math.min(240, startMinutes + (deltaSlots * 30)));

      // Visual feedback
      taskBlock.style.height = `${Math.max(30, startHeight + deltaY)}px`;
      taskBlock.dataset.previewDuration = `${newMinutes}m`;
    };

    const onMouseUp = (ev) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      taskBlock.classList.remove('resizing');
      taskBlock.style.height = '';
      delete taskBlock.dataset.previewDuration;

      const deltaY = ev.clientY - startY;
      const slotHeight = 35;
      const deltaSlots = Math.round(deltaY / slotHeight);
      const newMinutes = Math.max(15, Math.min(240, startMinutes + (deltaSlots * 30)));

      if (newMinutes !== task.estimatedMinutes) {
        this.updateTask(task.id, { estimatedMinutes: newMinutes });
        this.render();
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

// Bind context menu and inline edit to task elements using event delegation
export function bindTaskInteractions() {
  // Only set up delegation once
  if (!this._taskInteractionsBound) {
    this._taskInteractionsBound = true;

    // Context menu on right-click (delegated to document)
    document.addEventListener('contextmenu', (e) => {
      const taskEl = e.target.closest('.task-item, .focus-queue-item, .timeline-task-block');
      if (taskEl) {
        const taskId = taskEl.dataset.taskId;
        const task = this.findTask(taskId);
        if (task) {
          this.showContextMenu(e, task);
        }
      }
    });

    // Double-click to edit (delegated to document)
    document.addEventListener('dblclick', (e) => {
      // Check if clicked on a task name element
      const nameClasses = ['task-name', 'focus-queue-name', 'timeline-task-name', 'board-task-name', 'master-list-name'];
      const isNameElement = nameClasses.some(cls => e.target.classList.contains(cls));

      if (isNameElement) {
        const taskEl = e.target.closest('.task-item, .focus-queue-item, .timeline-task-block');
        if (taskEl) {
          const taskId = taskEl.dataset.taskId;
          const task = this.findTask(taskId);
          if (task) {
            e.preventDefault();
            e.stopPropagation();
            this.enableInlineEdit(taskEl, task);
          }
        }
      }
    });
  }

  // Add resize handles to timeline task blocks (these need to be added per-render)
  document.querySelectorAll('.timeline-task-block').forEach(block => {
    const taskId = block.dataset.taskId;
    const task = this.findTask(taskId);
    if (task && !block.querySelector('.resize-handle')) {
      this.makeTaskResizable(block, task);
    }
  });
}

// P2.1 - Drag Ghost Preview
export function createDragGhost(task, initialX, initialY) {
  // Remove any existing ghost first
  this.removeDragGhost();

  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.id = 'drag-ghost';
  ghost.innerHTML = `
    <div class="drag-ghost-content">
      <span class="drag-ghost-priority ${task.priority || 'none'}"></span>
      <span class="drag-ghost-name">${this.escapeHtml(task.name)}</span>
      <span class="drag-ghost-time">${task.estimatedMinutes || 30}m</span>
    </div>
  `;

  // Set initial position
  ghost.style.left = `${initialX + 15}px`;
  ghost.style.top = `${initialY + 15}px`;

  document.body.appendChild(ghost);

  // Use document-level dragover to track position (more reliable than drag event)
  this._ghostDragHandler = (e) => {
    if (e.clientX && e.clientY) {
      ghost.style.left = `${e.clientX + 15}px`;
      ghost.style.top = `${e.clientY + 15}px`;
    }
  };
  document.addEventListener('dragover', this._ghostDragHandler);

  return ghost;
}

export function updateDragGhostPosition(e) {
  // Kept for compatibility but main tracking is now via document dragover
  const ghost = document.getElementById('drag-ghost');
  if (ghost && e.clientX && e.clientY) {
    ghost.style.left = `${e.clientX + 15}px`;
    ghost.style.top = `${e.clientY + 15}px`;
  }
}

export function removeDragGhost() {
  const ghost = document.getElementById('drag-ghost');
  if (ghost) {
    ghost.remove();
  }
  // Remove the dragover listener
  if (this._ghostDragHandler) {
    document.removeEventListener('dragover', this._ghostDragHandler);
    this._ghostDragHandler = null;
  }
  this.draggedTask = null;
}
