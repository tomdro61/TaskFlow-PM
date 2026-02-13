// renderer/analytics.js — Dashboard, analytics, bulk selection

export function renderDashboard() {
  const container = document.getElementById('tasks-container');
  if (!container) return;

  const projects = this.data.projects.filter(p => !p.isInbox);
  const inbox = this.data.projects.find(p => p.isInbox);
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const todayStr = this.getLocalDateString();

  // Calculate stats for each project
  const projectStats = projects.map(p => {
    const tasks = p.tasks || [];
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const active = total - done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    // Velocity: completions this week vs last week
    const thisWeek = tasks.filter(t => t.completedAt && new Date(t.completedAt) >= weekAgo).length;
    const lastWeek = tasks.filter(t => {
      if (!t.completedAt) return false;
      const d = new Date(t.completedAt);
      return d >= twoWeeksAgo && d < weekAgo;
    }).length;

    let velocityTrend = 'flat';
    if (thisWeek > lastWeek) velocityTrend = 'up';
    else if (thisWeek < lastWeek) velocityTrend = 'down';

    // Red flags
    const flags = [];
    const heavilySnoozed = tasks.filter(t => t.status !== 'done' && (t.snoozeCount || 0) >= 3);
    if (heavilySnoozed.length > 0) flags.push({ type: 'snoozed', count: heavilySnoozed.length, label: `${heavilySnoozed.length} snoozed 3+ times` });

    const stale = tasks.filter(t => {
      if (t.status === 'done') return false;
      const age = (today - new Date(t.createdAt)) / (24 * 60 * 60 * 1000);
      return age > 14 && !t.completedAt;
    });
    if (stale.length > 0) flags.push({ type: 'stale', count: stale.length, label: `${stale.length} older than 2 weeks` });

    const blocked = tasks.filter(t => t.status === 'waiting');
    if (blocked.length > 0) flags.push({ type: 'blocked', count: blocked.length, label: `${blocked.length} blocked` });

    const overdue = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < todayStr);
    if (overdue.length > 0) flags.push({ type: 'overdue', count: overdue.length, label: `${overdue.length} overdue` });

    // Most recent completion
    const lastCompletion = tasks
      .filter(t => t.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
    const daysSinceCompletion = lastCompletion
      ? Math.floor((today - new Date(lastCompletion.completedAt)) / (24 * 60 * 60 * 1000))
      : null;

    if (daysSinceCompletion !== null && daysSinceCompletion > 7 && active > 0) {
      flags.push({ type: 'inactive', count: daysSinceCompletion, label: `No completions in ${daysSinceCompletion}d` });
    }

    // Next action: highest priority active task
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
    const nextAction = tasks
      .filter(t => t.status !== 'done' && t.status !== 'waiting')
      .sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4))[0];

    // Energy data
    const withEnergy = tasks.filter(t => t.energyRating && t.status === 'done');
    const avgEnergy = withEnergy.length > 0
      ? (withEnergy.reduce((s, t) => s + t.energyRating, 0) / withEnergy.length).toFixed(1)
      : null;

    return {
      project: p,
      total, done, active, pct,
      thisWeek, lastWeek, velocityTrend,
      flags, nextAction, daysSinceCompletion, avgEnergy
    };
  });

  // Sort: projects with flags first, then by active tasks count
  projectStats.sort((a, b) => {
    if (a.flags.length !== b.flags.length) return b.flags.length - a.flags.length;
    return b.active - a.active;
  });

  // Overall stats
  const totalActive = projectStats.reduce((s, p) => s + p.active, 0);
  const totalDone = projectStats.reduce((s, p) => s + p.done, 0);
  const totalFlags = projectStats.reduce((s, p) => s + p.flags.length, 0);
  const inboxCount = inbox ? inbox.tasks.filter(t => t.status !== 'done').length : 0;

  const velocityArrow = (trend) => {
    if (trend === 'up') return '<span class="dash-trend dash-trend-up" title="Trending up">&#9650;</span>';
    if (trend === 'down') return '<span class="dash-trend dash-trend-down" title="Trending down">&#9660;</span>';
    return '<span class="dash-trend dash-trend-flat" title="Flat">&#9644;</span>';
  };

  container.innerHTML = `
    <div class="dashboard-view">
      <div class="dash-summary">
        <div class="dash-stat">
          <span class="dash-stat-value">${projects.length}</span>
          <span class="dash-stat-label">Projects</span>
        </div>
        <div class="dash-stat">
          <span class="dash-stat-value">${totalActive}</span>
          <span class="dash-stat-label">Active Tasks</span>
        </div>
        <div class="dash-stat">
          <span class="dash-stat-value">${totalDone}</span>
          <span class="dash-stat-label">Completed</span>
        </div>
        <div class="dash-stat ${totalFlags > 0 ? 'dash-stat-warn' : ''}">
          <span class="dash-stat-value">${totalFlags}</span>
          <span class="dash-stat-label">Flags</span>
        </div>
        <div class="dash-stat ${inboxCount > 5 ? 'dash-stat-warn' : ''}">
          <span class="dash-stat-value">${inboxCount}</span>
          <span class="dash-stat-label">Inbox</span>
        </div>
      </div>

      <div class="dash-projects">
        ${projectStats.map(s => `
          <div class="dash-card" data-project-id="${s.project.id}" style="--project-color: ${s.project.color}">
            <div class="dash-card-header">
              <div class="dash-card-title-row">
                <span class="dash-card-dot" style="background: ${s.project.color}"></span>
                <span class="dash-card-name">${this.escapeHtml(s.project.name)}</span>
                ${velocityArrow(s.velocityTrend)}
              </div>
              <span class="dash-card-counts">${s.active} active · ${s.done} done</span>
            </div>

            <div class="dash-progress-row">
              <div class="dash-progress-bar">
                <div class="dash-progress-fill" style="width: ${s.pct}%; background: ${s.project.color}"></div>
              </div>
              <span class="dash-progress-pct">${s.pct}%</span>
            </div>

            <div class="dash-card-meta">
              <span class="dash-velocity">This week: ${s.thisWeek} ${s.lastWeek > 0 ? `(prev: ${s.lastWeek})` : ''}</span>
              ${s.avgEnergy ? `<span class="dash-energy">Energy: ${s.avgEnergy}/3</span>` : ''}
            </div>

            ${s.flags.length > 0 ? `
              <div class="dash-flags">
                ${s.flags.map(f => `<span class="dash-flag dash-flag-${f.type}">${f.label}</span>`).join('')}
              </div>
            ` : ''}

            ${s.nextAction ? `
              <div class="dash-next-action">
                <span class="dash-next-label">Next:</span>
                <span class="dash-next-task">${this.escapeHtml(s.nextAction.name)}</span>
                <span class="dash-next-priority priority-${s.nextAction.priority || 'none'}">${s.nextAction.priority || ''}</span>
              </div>
            ` : '<div class="dash-next-action"><span class="dash-next-label">No active tasks</span></div>'}
          </div>
        `).join('')}

        ${projectStats.length === 0 ? `
          <div class="dash-empty">
            <p>No projects yet. Create a project to see it here.</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Click card to navigate to project
  container.querySelectorAll('.dash-card').forEach(card => {
    card.addEventListener('click', () => {
      this.setView('project-' + card.dataset.projectId);
    });
  });
}

export function renderAnalyticsView() {
  const container = document.getElementById('analytics-container');
  if (!container) return;

  // Initialize analytics data if not present
  if (!this.data.analytics) {
    this.data.analytics = {
      dailyStats: {},
      streaks: { current: 0, longest: 0, lastActive: null }
    };
  }

  // Calculate stats for the selected period
  const now = new Date();
  const periodDays = this._analyticsPeriod === 'week' ? 7 :
                     this._analyticsPeriod === 'month' ? 30 : 90;

  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - periodDays);

  // Get completed tasks in period
  const allTasks = this.getAllTasks();
  const completedInPeriod = allTasks.filter(t => {
    if (t.status !== 'done' || !t.completedAt) return false;
    const completed = new Date(t.completedAt);
    return completed >= startDate && completed <= now;
  });

  // Calculate daily completions for chart
  const dailyCompletions = {};
  for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
    const dateStr = this.getLocalDateString(d);
    dailyCompletions[dateStr] = 0;
  }

  completedInPeriod.forEach(t => {
    const dateStr = this.isoToLocalDate(t.completedAt);
    if (dailyCompletions[dateStr] !== undefined) {
      dailyCompletions[dateStr]++;
    }
  });

  // Calculate total focus time
  let totalFocusMinutes = 0;
  completedInPeriod.forEach(t => {
    totalFocusMinutes += t.estimatedMinutes || 30;
  });

  // Calculate streak
  let currentStreak = 0;
  const today = this.getLocalDateString();
  let checkDate = new Date(now);
  while (true) {
    const dateStr = this.getLocalDateString(checkDate);
    if (dailyCompletions[dateStr] && dailyCompletions[dateStr] > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr === today) {
      // Today hasn't been completed yet, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
    if (currentStreak > periodDays) break;
  }

  // Completion rate
  const totalActive = allTasks.filter(t => t.status !== 'done').length;
  const completionRate = totalActive + completedInPeriod.length > 0
    ? Math.round((completedInPeriod.length / (totalActive + completedInPeriod.length)) * 100)
    : 0;

  // Project breakdown
  const projectStats = {};
  completedInPeriod.forEach(t => {
    const project = this.data.projects.find(p => p.tasks.some(pt => pt.id === t.id));
    const projectName = project?.name || 'Inbox';
    if (!projectStats[projectName]) {
      projectStats[projectName] = { count: 0, minutes: 0, color: project?.color || '#6366f1' };
    }
    projectStats[projectName].count++;
    projectStats[projectName].minutes += t.estimatedMinutes || 30;
  });

  // Build chart bars
  const dates = Object.keys(dailyCompletions).slice(-14); // Last 14 days for chart
  const maxCount = Math.max(...dates.map(d => dailyCompletions[d]), 1);

  const chartBars = dates.map(date => {
    const count = dailyCompletions[date];
    const height = (count / maxCount) * 100;
    const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    return `
      <div class="analytics-bar">
        <span class="analytics-bar-value">${count || ''}</span>
        <div class="analytics-bar-fill" style="height: ${height}%"></div>
        <span class="analytics-bar-label">${dayLabel}</span>
      </div>
    `;
  }).join('');

  // Build project cards
  const projectCards = Object.entries(projectStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([name, stats]) => `
      <div class="analytics-project-card">
        <div class="analytics-project-header">
          <span class="analytics-project-color" style="background: ${stats.color}"></span>
          <span class="analytics-project-name">${this.escapeHtml(name)}</span>
        </div>
        <div class="analytics-project-stats">
          <span>${stats.count} tasks</span>
          <span>${Math.round(stats.minutes / 60)}h ${stats.minutes % 60}m</span>
        </div>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="analytics-header">
      <h2>Productivity Analytics</h2>
      <div class="analytics-period-selector">
        <button class="analytics-period-btn ${this._analyticsPeriod === 'week' ? 'active' : ''}" data-period="week">Week</button>
        <button class="analytics-period-btn ${this._analyticsPeriod === 'month' ? 'active' : ''}" data-period="month">Month</button>
        <button class="analytics-period-btn ${this._analyticsPeriod === 'quarter' ? 'active' : ''}" data-period="quarter">Quarter</button>
      </div>
    </div>

    <div class="analytics-stats-row">
      <div class="analytics-stat-card">
        <div class="analytics-stat-value">${completedInPeriod.length}</div>
        <div class="analytics-stat-label">Tasks Completed</div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-stat-value">${Math.round(totalFocusMinutes / 60)}h</div>
        <div class="analytics-stat-label">Focus Time</div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-stat-value">${currentStreak}</div>
        <div class="analytics-stat-label">Day Streak</div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-stat-value">${completionRate}%</div>
        <div class="analytics-stat-label">Completion Rate</div>
      </div>
    </div>

    <div class="analytics-chart-section">
      <div class="analytics-chart-header">
        <h3>Daily Completions</h3>
      </div>
      <div class="analytics-bar-chart">
        ${chartBars}
      </div>
    </div>

    <div class="analytics-chart-section">
      <div class="analytics-chart-header">
        <h3>By Project</h3>
      </div>
      <div class="analytics-projects-section">
        ${projectCards || '<p class="analytics-empty">No project data for this period</p>'}
      </div>
    </div>
  `;

  // Bind period selector
  container.querySelectorAll('.analytics-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      this._analyticsPeriod = btn.dataset.period;
      this.renderAnalyticsView();
    });
  });
}

// ================================================
// ENHANCED MASTER LIST - Bulk Selection & Grouping
// ================================================

export function toggleTaskSelection(taskId, extend = false) {
  if (extend) {
    // Shift+click: range select
    // For simplicity, just toggle for now
    if (this._selectedTasks.has(taskId)) {
      this._selectedTasks.delete(taskId);
    } else {
      this._selectedTasks.add(taskId);
    }
  } else {
    // Regular click: toggle single
    if (this._selectedTasks.has(taskId)) {
      this._selectedTasks.delete(taskId);
    } else {
      this._selectedTasks.add(taskId);
    }
  }
  this.updateBulkToolbar();
  this.updateTaskSelectionUI();
}

export function selectAllTasks() {
  const tasks = this.getFilteredTasks().filter(t => t.status !== 'done');
  tasks.forEach(t => this._selectedTasks.add(t.id));
  this.updateBulkToolbar();
  this.updateTaskSelectionUI();
}

// Clears the bulk selection Set (this._selectedTasks).
// Note: keyboard navigation selection is cleared by clearKeyboardSelection() in events.js.
export function clearTaskSelection() {
  this._selectedTasks.clear();
  this.updateBulkToolbar();
  this.updateTaskSelectionUI();
}

export function updateBulkToolbar() {
  const toolbar = document.querySelector('.master-list-bulk-toolbar');
  if (!toolbar) return;

  const count = this._selectedTasks.size;
  if (count > 0) {
    toolbar.classList.remove('hidden');
    toolbar.querySelector('.bulk-select-count').textContent = `${count} selected`;
  } else {
    toolbar.classList.add('hidden');
  }
}

export function updateTaskSelectionUI() {
  document.querySelectorAll('.master-list-item').forEach(item => {
    const taskId = item.dataset.id;
    const selectBox = item.querySelector('.master-list-select');
    const isSelected = this._selectedTasks.has(taskId);

    item.classList.toggle('selected', isSelected);
    if (selectBox) {
      selectBox.classList.toggle('selected', isSelected);
      selectBox.innerHTML = isSelected ? '✓' : '';
    }
  });
}

export function executeBulkAction(action) {
  const taskIds = Array.from(this._selectedTasks);
  if (taskIds.length === 0) return;

  switch (action) {
    case 'complete':
      taskIds.forEach(id => {
        const task = this.findTask(id);
        if (task) {
          task.status = 'done';
          task.completedAt = new Date().toISOString();
        }
      });
      this.showToast(`Completed ${taskIds.length} tasks`);
      break;

    case 'schedule-today':
      const today = this.getLocalDateString();
      taskIds.forEach(id => {
        const task = this.findTask(id);
        if (task) {
          task.dueDate = today;
          task.scheduledDate = today;
        }
      });
      this.showToast(`Scheduled ${taskIds.length} tasks for today`);
      break;

    case 'set-priority':
      const priority = prompt('Enter priority (urgent, high, medium, low, none):');
      if (['urgent', 'high', 'medium', 'low', 'none'].includes(priority)) {
        taskIds.forEach(id => {
          const task = this.findTask(id);
          if (task) task.priority = priority;
        });
        this.showToast(`Set priority to ${priority} for ${taskIds.length} tasks`);
      }
      break;

    case 'delete':
      if (confirm(`Delete ${taskIds.length} tasks? This cannot be undone.`)) {
        taskIds.forEach(id => this.deleteTask(id));
        this.showToast(`Deleted ${taskIds.length} tasks`);
      }
      break;

    case 'add-to-queue':
      taskIds.forEach(id => {
        if (!this.executeMode.queue.includes(id)) {
          this.executeMode.queue.push(id);
        }
      });
      this.showToast(`Added ${taskIds.length} tasks to execution queue`);
      break;
  }

  this.saveData();
  this._selectedTasks.clear();
  this.renderMasterList();
}
