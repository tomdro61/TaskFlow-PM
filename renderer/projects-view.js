// renderer/projects-view.js — Sidebar, projects, categories, project views

export function renderSidebar() {
  this.renderFavorites();
  this.renderCategoriesTree();
}

export function renderFavorites() {
  const container = document.getElementById('sidebar-favorites');
  if (!container) return;
  container.innerHTML = '';

  const favoriteIds = this.data.favorites || [];
  const favorites = favoriteIds
    .map(id => this.data.projects.find(p => p.id === id))
    .filter(p => p && !p.isInbox);

  if (favorites.length === 0) {
    return;
  }

  // Add favorites header
  const header = document.createElement('div');
  header.className = 'favorites-header';
  header.innerHTML = '<span class="star-icon">&#9733;</span><span>Favorites</span>';
  container.appendChild(header);

  for (const project of favorites) {
    container.appendChild(this.createProjectItem(project, true));
  }
}

export function renderCategoriesTree() {
  const container = document.getElementById('categories-tree');
  if (!container) return;
  container.innerHTML = '';

  // Set up event delegation once on the projects nav section (covers both favorites and categories)
  const projectsSection = container.closest('.nav-section-projects') || container;
  if (!projectsSection._delegated) {
    projectsSection._delegated = true;

    projectsSection.addEventListener('click', (e) => {
      const target = e.target;

      // Category edit button
      const editBtn = target.closest('.category-edit');
      if (editBtn) {
        e.stopPropagation();
        const group = editBtn.closest('.category-group');
        if (group?.dataset.categoryId) {
          this.openCategoryModal(group.dataset.categoryId);
        }
        return;
      }

      // Category header click (toggle collapse)
      const header = target.closest('.category-header');
      if (header) {
        const group = header.closest('.category-group');
        if (group?.dataset.categoryId) {
          this.toggleCategoryCollapsed(group.dataset.categoryId);
        } else if (group) {
          // Uncategorized group — toggle manually
          group.classList.toggle('collapsed');
          const projectsEl = group.querySelector('.category-projects');
          if (projectsEl) {
            const count = projectsEl.children.length;
            projectsEl.style.maxHeight = group.classList.contains('collapsed') ? '0' : (count * 40 + 8) + 'px';
          }
        }
        return;
      }

      // Project favorite button
      const favBtn = target.closest('.project-favorite-btn');
      if (favBtn) {
        e.stopPropagation();
        const projectItem = favBtn.closest('.project-item');
        if (projectItem) this.toggleFavorite(projectItem.dataset.id);
        return;
      }

      // Project edit button
      const projEditBtn = target.closest('.project-edit');
      if (projEditBtn) {
        e.stopPropagation();
        const projectItem = projEditBtn.closest('.project-item');
        if (projectItem) this.openProjectModal(projectItem.dataset.id);
        return;
      }

      // Project item click (navigate to project)
      const projectItem = target.closest('.project-item');
      if (projectItem) {
        this.setView(`project-${projectItem.dataset.id}`);
      }
    });
  }

  const categories = this.data.categories || [];
  const projects = this.data.projects.filter(p => !p.isInbox);

  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Render each category
  for (const category of sortedCategories) {
    const categoryProjects = projects.filter(p => p.categoryId === category.id);
    const totalTasks = categoryProjects.reduce((sum, p) =>
      sum + p.tasks.filter(t => t.status !== 'done').length, 0);

    const group = document.createElement('div');
    group.className = `category-group${category.collapsed ? ' collapsed' : ''}`;
    group.dataset.categoryId = category.id;

    group.innerHTML = `
      <div class="category-header">
        <span class="category-toggle">&#9660;</span>
        <span class="category-color" style="background:${category.color}"></span>
        <span class="category-name">${this.escapeHtml(category.name)}</span>
        <span class="category-count">${totalTasks}</span>
        <button class="category-edit" title="Edit">&#9998;</button>
      </div>
      <div class="category-projects" style="max-height: ${category.collapsed ? 0 : categoryProjects.length * 40 + 8}px"></div>
    `;

    const projectsContainer = group.querySelector('.category-projects');
    for (const project of categoryProjects) {
      projectsContainer.appendChild(this.createProjectItem(project, false));
    }

    container.appendChild(group);
  }

  // Render uncategorized projects
  const uncategorized = projects.filter(p => !p.categoryId);
  if (uncategorized.length > 0) {
    const group = document.createElement('div');
    group.className = 'category-group';

    const totalTasks = uncategorized.reduce((sum, p) =>
      sum + p.tasks.filter(t => t.status !== 'done').length, 0);

    group.innerHTML = `
      <div class="category-header">
        <span class="category-toggle">&#9660;</span>
        <span class="category-color" style="background:var(--text-muted)"></span>
        <span class="category-name">Uncategorized</span>
        <span class="category-count">${totalTasks}</span>
      </div>
      <div class="category-projects" style="max-height: ${uncategorized.length * 40 + 8}px"></div>
    `;

    const projectsContainer = group.querySelector('.category-projects');
    for (const project of uncategorized) {
      projectsContainer.appendChild(this.createProjectItem(project, false));
    }

    container.appendChild(group);
  }
}

export function createProjectItem(project, inFavorites) {
  const taskCount = project.tasks.filter(t => t.status !== 'done').length;
  const isFavorite = this.isFavorite(project.id);

  const el = document.createElement('button');
  el.className = 'project-item';
  el.dataset.id = project.id;

  el.innerHTML = `
    <span class="project-color" style="background:${project.color}"></span>
    <span class="project-name">${this.escapeHtml(project.name)}</span>
    <span class="project-count">${taskCount}</span>
    <button class="project-favorite-btn ${isFavorite ? 'favorited' : ''}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
      ${isFavorite ? '&#9733;' : '&#9734;'}
    </button>
    <button class="project-edit" title="Edit">&#9998;</button>
  `;

  return el;
}

export function filterProjects(query) {
  const projects = this.data.projects.filter(p => !p.isInbox);
  if (!query) {
    this.renderCategoriesTree();
    return;
  }

  const lowerQuery = query.toLowerCase();
  const matching = projects.filter(p =>
    p.name.toLowerCase().includes(lowerQuery)
  );

  const container = document.getElementById('categories-tree');
  if (!container) return;
  container.innerHTML = '';

  for (const project of matching) {
    container.appendChild(this.createProjectItem(project, false));
  }
}

// Legacy method for compatibility
export function renderProjects() {
  this.renderSidebar();
}

export function renderProjectView() {
  const container = document.getElementById('tasks-container');
  if (!container) return;

  const projectId = this.currentView.replace('project-', '');
  const project = this.data.projects.find(p => p.id === projectId);
  if (!project) {
    container.innerHTML = '<div class="empty-state"><h3>Project not found</h3></div>';
    return;
  }

  const viewState = this.getProjectViewState(projectId);
  const tasks = this.getProjectFilteredTasks(project, viewState);

  container.innerHTML = '';

  // Enhanced header
  container.appendChild(this.createEnhancedProjectHeader(project));

  // Planning section — what to focus on
  container.appendChild(this.createProjectPlanningSection(project));

  // Toolbar
  container.appendChild(this.createProjectToolbar(projectId, viewState));

  // View content container
  const viewContent = document.createElement('div');
  viewContent.className = 'project-view-content';
  container.appendChild(viewContent);

  // Render based on view mode
  switch (viewState.viewMode) {
    case 'board':
      this.renderProjectBoardView(viewContent, project, tasks, viewState);
      break;
    case 'timeline':
      this.renderProjectTimelineView(viewContent, project, tasks, viewState);
      break;
    case 'list':
    default:
      this.renderProjectListView(viewContent, project, tasks, viewState);
      break;
  }
}

export function createProjectPlanningSection(project) {
  const today = this.getLocalDateString();
  const activeTasks = (project.tasks || []).filter(t => t.status !== 'done');

  // Overdue tasks
  const overdueTasks = activeTasks.filter(t => t.dueDate && t.dueDate < today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Blocked tasks
  const blockedTasks = activeTasks.filter(t => this.isTaskBlocked(t) || (t.status === 'waiting' && t.waitingReason));

  // AI-ready tasks (executionType is ai, not yet assigned to claude)
  const aiReadyTasks = activeTasks.filter(t =>
    (t.executionType === 'ai' || t.executionType === 'hybrid') && t.assignedTo !== 'claude'
  );
  const claudeQueuedTasks = activeTasks.filter(t => t.assignedTo === 'claude');

  const hasAttention = overdueTasks.length > 0 || blockedTasks.length > 0;
  const hasClaude = aiReadyTasks.length > 0 || claudeQueuedTasks.length > 0;

  if (!hasAttention && !hasClaude) {
    const section = document.createElement('div');
    section.className = 'project-planning';
    return section;
  }

  const section = document.createElement('div');
  section.className = 'project-planning';
  let html = '';

  // Needs Attention card
  if (hasAttention) {
    html += '<div class="project-attention-card">';
    html += '<div class="attention-header">Needs Attention</div>';

    if (overdueTasks.length > 0) {
      const overdueExtra = (task) => {
        const diffMs = new Date(today + 'T00:00:00') - new Date(task.dueDate + 'T00:00:00');
        const days = Math.round(diffMs / 86400000);
        return `${days}d overdue`;
      };
      html += `<div class="attention-row overdue">
        <span class="attention-label">OVERDUE</span>
        <div class="attention-pills">${overdueTasks.map(t => this._planningTaskPill(t, overdueExtra(t))).join('')}</div>
      </div>`;
    }

    if (blockedTasks.length > 0) {
      const blockedExtra = (task) => {
        const blockers = this.getBlockingTasks(task);
        if (blockers.length > 0) return '\u2190 ' + blockers.map(b => b.name).join(', ');
        if (task.waitingReason) return '\u2190 ' + task.waitingReason;
        return '';
      };
      html += `<div class="attention-row blocked">
        <span class="attention-label">BLOCKED</span>
        <div class="attention-pills">${blockedTasks.map(t => this._planningTaskPill(t, blockedExtra(t))).join('')}</div>
      </div>`;
    }

    html += '</div>';
  }

  // Claude Can Help card
  if (hasClaude) {
    html += '<div class="project-claude-card">';
    html += '<div class="claude-card-header">';
    html += '<div class="attention-header">Claude Can Help</div>';
    if (aiReadyTasks.length > 0) {
      html += `<button class="claude-queue-btn" data-action="queue-all">\u{1F916} Queue ${aiReadyTasks.length} for Tonight</button>`;
    }
    html += '</div>';

    if (aiReadyTasks.length > 0) {
      html += `<div class="attention-row claude-ready">
        <span class="attention-label">${aiReadyTasks.length} READY</span>
        <div class="attention-pills">${aiReadyTasks.map(t => this._planningTaskPill(t)).join('')}</div>
      </div>`;
    }

    if (claudeQueuedTasks.length > 0) {
      html += `<div class="attention-row claude-queued">
        <span class="claude-queued-label">\u2713 Already queued: ${claudeQueuedTasks.length} task${claudeQueuedTasks.length !== 1 ? 's' : ''}</span>
      </div>`;
    }

    html += '</div>';
  }

  section.innerHTML = html;

  // Bind pill clicks
  section.querySelectorAll('.planning-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      this.openDetailPanel(pill.dataset.taskId);
    });
  });

  // Bind "Queue All" button
  const queueBtn = section.querySelector('[data-action="queue-all"]');
  if (queueBtn) {
    queueBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      aiReadyTasks.forEach(task => {
        task.assignedTo = 'claude';
      });
      this.saveData();
      this.showToast(`Queued ${aiReadyTasks.length} tasks for Claude`);
      this.renderProjectView();
    });
  }

  return section;
}

export function _planningTaskPill(task, extra = '') {
  const priorityColors = { urgent: '#dc2626', high: '#f97316', medium: '#eab308', low: '#22c55e', none: 'var(--border-medium)' };
  const borderColor = priorityColors[task.priority] || 'var(--border-medium)';
  const execType = task.executionType || 'manual';
  const execTag = execType === 'ai' ? ' <span class="pill-exec ai">AI</span>' : execType === 'hybrid' ? ' <span class="pill-exec hybrid">HY</span>' : '';

  const extraTag = extra ? ` <span class="pill-extra">${this.escapeHtml(extra)}</span>` : '';

  return `<span class="planning-pill" data-task-id="${task.id}" style="border-left-color:${borderColor}">
    ${this.escapeHtml(task.name)}${execTag}${extraTag}
  </span>`;
}

export function createEnhancedProjectHeader(project) {
  const tasks = project.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done');
  const activeTasks = tasks.filter(t => t.status !== 'done');

  const estMinutesRemaining = activeTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const progressPercent = totalTasks > 0 ? Math.round(completedTasks.length / totalTasks * 100) : 0;

  // Stats summary line
  const blockedCount = activeTasks.filter(t => this.isTaskBlocked(t)).length;
  const claudeCount = activeTasks.filter(t => t.assignedTo === 'claude' || t.executionType === 'ai').length;

  const statParts = [`${activeTasks.length} remaining`];
  if (blockedCount > 0) statParts.push(`${blockedCount} blocked`);
  if (claudeCount > 0) statParts.push(`${claudeCount} for Claude`);
  if (estMinutesRemaining > 0) {
    const h = Math.round(estMinutesRemaining / 60 * 10) / 10;
    statParts.push(`~${h}h est.`);
  }
  statParts.push(`${completedTasks.length}/${totalTasks} done`);

  const header = document.createElement('div');
  header.className = 'project-header-card';

  header.innerHTML = `
    <div class="project-header-top">
      <span class="project-header-color" style="background:${project.color}"></span>
      <h2 class="project-header-name">${this.escapeHtml(project.name)}</h2>
      <button class="project-header-edit" title="Edit Project">&#9998;</button>
    </div>
    ${project.goal ? `<p class="project-header-goal">${this.escapeHtml(project.goal)}</p>` : ''}
    <div class="project-progress-section">
      <div class="project-progress-inline">
        <div class="project-progress-track">
          <div class="project-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <span class="project-progress-pct">${progressPercent}%</span>
      </div>
      <span class="project-progress-stats">${statParts.join(' &middot; ')}</span>
    </div>
  `;

  header.querySelector('.project-header-edit').addEventListener('click', () => {
    this.openProjectModal(project.id);
  });

  return header;
}

export function createProjectToolbar(projectId, viewState) {
  const toolbar = document.createElement('div');
  toolbar.className = 'project-toolbar';

  toolbar.innerHTML = `
    <div class="project-view-switcher">
      <button class="project-view-btn ${viewState.viewMode === 'list' ? 'active' : ''}" data-mode="list" title="List view">List</button>
      <button class="project-view-btn ${viewState.viewMode === 'board' ? 'active' : ''}" data-mode="board" title="Board view">Board</button>
      <button class="project-view-btn ${viewState.viewMode === 'timeline' ? 'active' : ''}" data-mode="timeline" title="Timeline view">Timeline</button>
    </div>
    <div class="project-filters">
      <select class="project-filter-select" data-filter="filterStatus">
        <option value="active" ${viewState.filterStatus === 'active' ? 'selected' : ''}>Active</option>
        <option value="all" ${viewState.filterStatus === 'all' ? 'selected' : ''}>All</option>
        <option value="todo" ${viewState.filterStatus === 'todo' ? 'selected' : ''}>To Do</option>
        <option value="in-progress" ${viewState.filterStatus === 'in-progress' ? 'selected' : ''}>In Progress</option>
        <option value="waiting" ${viewState.filterStatus === 'waiting' ? 'selected' : ''}>Waiting</option>
        <option value="done" ${viewState.filterStatus === 'done' ? 'selected' : ''}>Done</option>
      </select>
      <select class="project-filter-select" data-filter="sortBy">
        <option value="priority" ${viewState.sortBy === 'priority' ? 'selected' : ''}>Priority</option>
        <option value="dueDate" ${viewState.sortBy === 'dueDate' ? 'selected' : ''}>Due Date</option>
        <option value="created" ${viewState.sortBy === 'created' ? 'selected' : ''}>Created</option>
        <option value="name" ${viewState.sortBy === 'name' ? 'selected' : ''}>Name</option>
      </select>
    </div>
    <button class="project-add-task-btn" title="Add task to this project">+ Add Task</button>
  `;

  // View switcher events
  toolbar.querySelectorAll('.project-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      this.updateProjectViewPref(projectId, 'viewMode', btn.dataset.mode);
    });
  });

  // Filter events
  toolbar.querySelectorAll('.project-filter-select').forEach(select => {
    select.addEventListener('change', () => {
      this.updateProjectViewPref(projectId, select.dataset.filter, select.value);
    });
  });

  // Add task button
  toolbar.querySelector('.project-add-task-btn').addEventListener('click', () => {
    this.openTaskModal(null, projectId);
  });

  return toolbar;
}

export function createEnhancedTaskCard(task, options = {}) {
  const { compact = false } = options;
  const el = document.createElement('div');
  el.className = `enhanced-task-card ${compact ? 'compact' : ''} ${task.status === 'done' ? 'completed' : ''}`;
  el.dataset.id = task.id;
  el.draggable = true;

  // Priority stripe color
  const priorityColors = { urgent: '#dc2626', high: '#f97316', medium: '#eab308', low: '#22c55e', none: 'transparent' };
  const stripeColor = priorityColors[task.priority] || 'transparent';

  // Only show exec badge for non-default types (AI, Hybrid)
  const execType = task.executionType || 'manual';
  let execBadge = '';
  if (execType === 'ai') execBadge = '<span class="exec-badge exec-ai">AI</span>';
  else if (execType === 'hybrid') execBadge = '<span class="exec-badge exec-hybrid">Hybrid</span>';

  // Claude assign button / queued indicator
  let claudeBadge = '';
  if (execType === 'ai' || execType === 'hybrid') {
    if (task.assignedTo === 'claude') {
      claudeBadge = '<span class="claude-queued-indicator" title="Queued for Claude">\u{1F916}</span>';
    } else {
      claudeBadge = `<button type="button" class="assign-claude-btn" data-action="assign-claude" data-task-id="${task.id}" title="Queue for Claude">\u{1F916}</button>`;
    }
  }

  // Due date — short inline
  let dueHtml = '';
  if (task.dueDate) {
    const today = this.getLocalDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let dueClass = '', dueLabel = this.formatDate(task.dueDate);
    if (task.dueDate < today) { dueClass = 'overdue'; dueLabel = 'Overdue'; }
    else if (task.dueDate === today) { dueClass = 'due-today'; dueLabel = 'Today'; }
    else if (task.dueDate === tomorrowStr) { dueClass = 'due-tomorrow'; dueLabel = 'Tomorrow'; }
    dueHtml = `<span class="due-badge ${dueClass}">${dueLabel}</span>`;
  }

  // Subtask count
  let subtaskHtml = '';
  if (task.subtasks && task.subtasks.length > 0) {
    const done = task.subtasks.filter(st => st.status === 'done').length;
    subtaskHtml = `<span class="subtask-count-badge">${done}/${task.subtasks.length}</span>`;
  }

  // Time estimate
  let timeHtml = '';
  if (task.estimatedMinutes) {
    const m = task.estimatedMinutes;
    timeHtml = `<span class="task-time-badge">${m >= 60 ? Math.round(m / 60 * 10) / 10 + 'h' : m + 'm'}</span>`;
  }

  const checkClass = task.status === 'done' ? 'checked' : '';
  const priorityClass = task.priority !== 'none' ? `priority-${task.priority}` : '';

  // Single row: [stripe] [checkbox] [name] [badges...right-aligned]
  el.innerHTML = `
    <div class="task-card-priority-stripe" style="background:${stripeColor}"></div>
    <div class="task-card-body">
      <button type="button" class="task-checkbox ${checkClass} ${priorityClass}" data-action="toggle" data-task-id="${task.id}">${task.status === 'done' ? '&#10003;' : ''}</button>
      <span class="task-card-name">${this.escapeHtml(task.name)}</span>
      <div class="task-card-badges">
        ${execBadge}
        ${claudeBadge}
        ${subtaskHtml}
        ${timeHtml}
        ${dueHtml}
      </div>
    </div>
  `;

  // Checkbox
  const checkbox = el.querySelector('[data-action="toggle"]');
  checkbox.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.toggleTaskStatus(task.id);
  });
  checkbox.addEventListener('mousedown', (e) => e.stopPropagation());

  // Assign to Claude button
  const assignBtn = el.querySelector('[data-action="assign-claude"]');
  if (assignBtn) {
    assignBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.updateTask(task.id, { assignedTo: 'claude' });
      this.showToast(`Queued "${task.name}" for Claude`);
      this.render();
    });
    assignBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  // Click to open detail
  el.addEventListener('click', () => {
    this.openDetailPanel(task.id);
  });

  // Drag events
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
  });

  return el;
}

// ---- LIST VIEW ----

export function renderProjectListView(container, project, tasks, viewState) {
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128203;</div>
        <h3>No tasks match filters</h3>
        <p>Try adjusting your filters or add a new task</p>
      </div>
    `;
    return;
  }

  if (viewState.groupBy !== 'none') {
    const groups = this.groupTasksBy(tasks, viewState.groupBy);

    // Sort group keys
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (viewState.groupBy === 'priority') {
        const order = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
        return (order[a] ?? 5) - (order[b] ?? 5);
      }
      if (viewState.groupBy === 'status') {
        const order = { 'in-progress': 0, todo: 1, ready: 2, waiting: 3, done: 4 };
        return (order[a] ?? 5) - (order[b] ?? 5);
      }
      if (a === 'overdue') return -1;
      if (b === 'overdue') return 1;
      if (a === 'today') return -1;
      if (b === 'today') return 1;
      if (a === 'no-date') return 1;
      if (b === 'no-date') return -1;
      return a.localeCompare(b);
    });

    // Initialize collapsed groups state
    if (!this._projectCollapsedGroups) this._projectCollapsedGroups = {};

    sortedKeys.forEach(key => {
      const group = groups[key];
      const section = document.createElement('div');
      section.className = 'project-list-group';

      const isCollapsed = this._projectCollapsedGroups[key] || false;

      const groupHeader = document.createElement('div');
      groupHeader.className = `project-list-group-header ${isCollapsed ? 'collapsed' : ''}`;
      groupHeader.innerHTML = `
        <span class="group-toggle">${isCollapsed ? '&#9654;' : '&#9660;'}</span>
        <span class="group-color-dot" style="background:${group.color}"></span>
        <span class="group-label">${this.escapeHtml(group.label)}</span>
        <span class="group-count">${group.tasks.length}</span>
      `;
      groupHeader.addEventListener('click', () => {
        this._projectCollapsedGroups[key] = !this._projectCollapsedGroups[key];
        this.renderProjectView();
      });
      section.appendChild(groupHeader);

      if (!isCollapsed) {
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'project-list-group-tasks';
        group.tasks.forEach(task => {
          tasksContainer.appendChild(this.createEnhancedTaskCard(task));
        });
        section.appendChild(tasksContainer);
      }

      container.appendChild(section);
    });
  } else {
    tasks.forEach(task => {
      container.appendChild(this.createEnhancedTaskCard(task));
    });
  }
}

// ---- BOARD VIEW ----

export function renderProjectBoardView(container, project, tasks, viewState) {
  // Board always shows all statuses, so get tasks without status filter
  const allTasks = this.getProjectFilteredTasks(project, { ...viewState, filterStatus: 'all' });

  const board = document.createElement('div');
  board.className = 'project-board';

  const columns = [
    { status: 'todo', label: 'To Do', dot: 'todo' },
    { status: 'in-progress', label: 'In Progress', dot: 'in-progress' },
    { status: 'waiting', label: 'Waiting', dot: 'waiting' },
    { status: 'done', label: 'Done', dot: 'done' }
  ];

  columns.forEach(col => {
    const colTasks = allTasks.filter(t => t.status === col.status);
    const column = document.createElement('div');
    column.className = 'project-board-column';
    column.dataset.status = col.status;

    column.innerHTML = `
      <div class="project-board-column-header">
        <span class="column-dot ${col.dot}"></span>
        <h3>${col.label}</h3>
        <span class="column-count">${colTasks.length}</span>
      </div>
    `;

    const tasksDiv = document.createElement('div');
    tasksDiv.className = 'project-board-tasks';
    tasksDiv.dataset.status = col.status;

    colTasks.forEach(task => {
      tasksDiv.appendChild(this.createEnhancedTaskCard(task, { compact: true }));
    });

    // Drop zone handlers
    tasksDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      tasksDiv.classList.add('drag-over');
    });
    tasksDiv.addEventListener('dragleave', (e) => {
      if (!tasksDiv.contains(e.relatedTarget)) {
        tasksDiv.classList.remove('drag-over');
      }
    });
    tasksDiv.addEventListener('drop', (e) => {
      e.preventDefault();
      tasksDiv.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      if (taskId) {
        this.updateTask(taskId, { status: col.status });
        this.renderProjectView();
      }
    });

    column.appendChild(tasksDiv);
    board.appendChild(column);
  });

  container.appendChild(board);
}

// ---- TIMELINE VIEW ----

export function renderProjectTimelineView(container, project, tasks, viewState) {
  const projectId = project.id;

  // Initialize timeline state
  if (!this._projectTimelineState[projectId]) {
    this._projectTimelineState[projectId] = { anchorDate: this.getLocalDateString() };
  }
  const tlState = this._projectTimelineState[projectId];
  const range = viewState.timelineRange || 'month';

  // Calculate date range
  const anchor = new Date(tlState.anchorDate + 'T12:00:00');
  let startDate, endDate;

  if (range === 'week') {
    const dayOfWeek = anchor.getDay();
    startDate = new Date(anchor);
    startDate.setDate(anchor.getDate() - dayOfWeek); // Sunday
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
  } else {
    startDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    endDate = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  }

  // Generate day columns
  const days = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const todayStr = this.getLocalDateString();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Format range label
  const rangeLabel = range === 'week'
    ? `${monthNames[startDate.getMonth()]} ${startDate.getDate()} - ${monthNames[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`
    : `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

  // Build header
  const timeline = document.createElement('div');
  timeline.className = 'project-timeline';

  const header = document.createElement('div');
  header.className = 'project-timeline-header';
  header.innerHTML = `
    <button class="timeline-nav-btn" data-dir="prev">&#9664; Prev</button>
    <span class="timeline-range-label">${rangeLabel}</span>
    <button class="timeline-nav-btn" data-dir="next">Next &#9654;</button>
    <div class="timeline-range-toggle">
      <button class="timeline-range-btn ${range === 'week' ? 'active' : ''}" data-range="week">Week</button>
      <button class="timeline-range-btn ${range === 'month' ? 'active' : ''}" data-range="month">Month</button>
    </div>
  `;

  // Navigation events
  header.querySelectorAll('.timeline-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.dir;
      const current = new Date(tlState.anchorDate + 'T12:00:00');
      if (range === 'week') {
        current.setDate(current.getDate() + (dir === 'next' ? 7 : -7));
      } else {
        current.setMonth(current.getMonth() + (dir === 'next' ? 1 : -1));
      }
      tlState.anchorDate = current.toISOString().split('T')[0];
      this.renderProjectView();
    });
  });

  header.querySelectorAll('.timeline-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      this.updateProjectViewPref(projectId, 'timelineRange', btn.dataset.range);
    });
  });

  timeline.appendChild(header);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'timeline-legend';
  legend.innerHTML = `
    <span class="timeline-legend-item"><span class="legend-dot exec-ai"></span>AI</span>
    <span class="timeline-legend-item"><span class="legend-dot exec-manual"></span>Manual</span>
    <span class="timeline-legend-item"><span class="legend-dot exec-hybrid"></span>Hybrid</span>
    <span class="timeline-legend-sep"></span>
    <span class="timeline-legend-item"><span class="legend-dot priority-urgent"></span>Urgent</span>
    <span class="timeline-legend-item"><span class="legend-dot priority-high"></span>High</span>
    <span class="timeline-legend-item"><span class="legend-dot priority-medium"></span>Medium</span>
  `;
  timeline.appendChild(legend);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'project-timeline-grid';
  grid.style.gridTemplateColumns = `repeat(${days.length}, 1fr)`;

  // Day headers
  days.forEach(day => {
    const dayStr = day.toISOString().split('T')[0];
    const isToday = dayStr === todayStr;
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const dayHeader = document.createElement('div');
    dayHeader.className = `timeline-day-header ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`;
    dayHeader.innerHTML = `<span class="day-name">${dayNames[day.getDay()]}</span><span class="day-num">${day.getDate()}</span>`;
    grid.appendChild(dayHeader);
  });

  // Date strings for column lookup
  const dayStrs = days.map(d => d.toISOString().split('T')[0]);
  const firstDayStr = dayStrs[0];
  const lastDayStr = dayStrs[dayStrs.length - 1];

  // Tasks with dates
  const datedTasks = [];
  const undatedTasks = [];

  // Use all project tasks (not filtered by status for timeline context)
  const allTasks = this.getProjectFilteredTasks(project, { ...this.getProjectViewState(projectId), filterStatus: 'active' });

  allTasks.forEach(task => {
    if (!task.scheduledDate && !task.dueDate) {
      undatedTasks.push(task);
    } else {
      datedTasks.push(task);
    }
  });

  // Render task rows
  const tasksArea = document.createElement('div');
  tasksArea.className = 'timeline-tasks-area';
  tasksArea.style.gridTemplateColumns = `repeat(${days.length}, 1fr)`;

  datedTasks.forEach(task => {
    // Start = scheduledDate (when work begins), End = dueDate (deadline)
    // If only one is set, single-day bar on that date
    const taskStart = task.scheduledDate && task.dueDate
      ? (task.scheduledDate < task.dueDate ? task.scheduledDate : task.dueDate)
      : (task.scheduledDate || task.dueDate);
    const taskEnd = task.scheduledDate && task.dueDate
      ? (task.dueDate > task.scheduledDate ? task.dueDate : task.scheduledDate)
      : taskStart;

    // Clamp to visible range
    const clampedStart = taskStart < firstDayStr ? firstDayStr : taskStart;
    const clampedEnd = taskEnd > lastDayStr ? lastDayStr : taskEnd;

    const startIdx = dayStrs.indexOf(clampedStart);
    const endIdx = dayStrs.indexOf(clampedEnd);

    if (startIdx === -1 && endIdx === -1) return; // out of range entirely

    const effectiveStart = startIdx >= 0 ? startIdx : 0;
    const effectiveEnd = endIdx >= 0 ? endIdx : days.length - 1;

    const execType = task.executionType || 'manual';
    const priority = task.priority || 'none';
    const bar = document.createElement('div');
    bar.className = `timeline-task-bar exec-${execType} priority-${priority} ${task.status === 'done' ? 'completed' : ''}`;
    bar.style.gridColumn = `${effectiveStart + 1} / ${effectiveEnd + 2}`;

    // Priority icon
    const priorityIcons = { urgent: '!!', high: '!', medium: '', low: '', none: '' };
    const priorityLabel = priorityIcons[priority] || '';

    // Status icon
    const statusIcons = { 'done': '\u2713', 'in-progress': '\u25B6', 'waiting': '\u23F8', 'todo': '' };
    const statusIcon = statusIcons[task.status] || '';

    // Time estimate
    const timeLabel = task.estimatedMinutes
      ? (task.estimatedMinutes >= 60 ? `${(task.estimatedMinutes / 60).toFixed(1).replace(/\.0$/, '')}h` : `${task.estimatedMinutes}m`)
      : '';

    // Subtask progress
    const subtaskLabel = task.subtasks && task.subtasks.length > 0
      ? `${task.subtasks.filter(s => s.done).length}/${task.subtasks.length}`
      : '';

    // Build bar content
    let barHTML = '';
    if (statusIcon) barHTML += `<span class="tbar-status">${statusIcon}</span>`;
    if (priorityLabel) barHTML += `<span class="tbar-priority">${priorityLabel}</span>`;
    barHTML += `<span class="tbar-name">${this.escapeHtml(task.name)}</span>`;
    if (timeLabel) barHTML += `<span class="tbar-meta">${timeLabel}</span>`;
    if (subtaskLabel) barHTML += `<span class="tbar-meta">${subtaskLabel}</span>`;
    bar.innerHTML = barHTML;

    // Rich tooltip
    const tooltipParts = [task.name];
    if (priority !== 'none') tooltipParts.push(`Priority: ${priority}`);
    tooltipParts.push(`Status: ${task.status}`);
    if (task.scheduledDate) tooltipParts.push(`Scheduled: ${task.scheduledDate}`);
    if (task.dueDate) tooltipParts.push(`Due: ${task.dueDate}`);
    if (timeLabel) tooltipParts.push(`Est: ${timeLabel}`);
    if (subtaskLabel) tooltipParts.push(`Subtasks: ${subtaskLabel}`);
    const execLabels = { ai: 'AI', manual: 'Manual', hybrid: 'Hybrid' };
    tooltipParts.push(`Type: ${execLabels[execType] || execType}`);
    bar.title = tooltipParts.join('\n');
    bar.addEventListener('click', () => this.openDetailPanel(task.id));
    tasksArea.appendChild(bar);
  });

  grid.appendChild(tasksArea);
  timeline.appendChild(grid);

  // Undated tasks section
  if (undatedTasks.length > 0) {
    const noDateSection = document.createElement('div');
    noDateSection.className = 'timeline-no-date';
    noDateSection.innerHTML = '<h4>No Date Assigned</h4>';
    const noDateList = document.createElement('div');
    noDateList.className = 'timeline-no-date-list';
    undatedTasks.forEach(task => {
      noDateList.appendChild(this.createEnhancedTaskCard(task, { compact: true }));
    });
    noDateSection.appendChild(noDateList);
    timeline.appendChild(noDateSection);
  }

  container.appendChild(timeline);
}

export function groupTasksBy(tasks, groupBy) {
  const groups = {};

  tasks.forEach(task => {
    let key;
    let label;
    let color;

    switch (groupBy) {
      case 'project':
        const project = this.data.projects.find(p => p.tasks.some(t => t.id === task.id));
        key = project?.id || 'inbox';
        label = project?.name || 'Inbox';
        color = project?.color || '#6366f1';
        break;

      case 'priority':
        key = task.priority || 'none';
        label = key.charAt(0).toUpperCase() + key.slice(1);
        const priorityColors = { urgent: '#dc2626', high: '#f97316', medium: '#eab308', low: '#22c55e', none: '#9ca3af' };
        color = priorityColors[key];
        break;

      case 'status':
        key = task.status || 'todo';
        label = this.formatStatus(key);
        const statusColors = { todo: '#6b7280', ready: '#0284c7', 'in-progress': '#d97706', waiting: '#dc2626', done: '#059669' };
        color = statusColors[key];
        break;

      case 'dueDate':
        const dueDate = task.dueDate;
        const today = this.getLocalDateString();
        if (!dueDate) {
          key = 'no-date';
          label = 'No Due Date';
        } else if (dueDate < today) {
          key = 'overdue';
          label = 'Overdue';
        } else if (dueDate === today) {
          key = 'today';
          label = 'Today';
        } else {
          key = dueDate;
          label = this.formatDate(dueDate);
        }
        color = '#6366f1';
        break;

      default:
        key = 'all';
        label = 'All Tasks';
        color = '#6366f1';
    }

    if (!groups[key]) {
      groups[key] = { label, color, tasks: [] };
    }
    groups[key].tasks.push(task);
  });

  return groups;
}
