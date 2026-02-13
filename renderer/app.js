// renderer/app.js — TaskFlow PM Application Entry Point
// ES Module that imports all feature modules and mixes them onto the class prototype.

import * as utils from './utils.js';
import * as data from './data.js';
import * as events from './events.js';
import * as todayView from './today-view.js';
import * as calendarView from './calendar-view.js';
import * as projectsView from './projects-view.js';
import * as tasks from './tasks.js';
import * as focusMode from './focus-mode.js';
import * as recaps from './recaps.js';
import * as inboxView from './inbox-view.js';
import * as modals from './modals.js';
import * as analytics from './analytics.js';
import * as integrations from './integrations.js';

class TaskFlowApp {
  constructor() {
    this.data = null;
    this.currentView = 'today';  // Default to Today view for focus
    this.currentViewMode = 'list';
    this.selectedTask = null;
    this.searchQuery = '';
    this.sortBy = 'created';
    this.filterStatus = 'all';

    // Calendar state
    this.calendar = {
      currentDate: new Date(),
      selectedDate: null,
      viewMode: 'month'  // month, week, day
    };

    // Today view state
    this.todayView = {
      showCompleted: false,
      workingOnTaskIds: [],
      notesExpanded: true,
      expandedUpNextIds: new Set()
    };

    // Undo stack (in-memory, max 30 actions)
    this.undoStack = [];

    // Floating bar state
    this.floatingBarVisible = false;

    // Focus Mode state
    this.focusMode = {
      active: false,
      minimized: false,
      currentIndex: 0,
      taskQueue: [],
      timerRunning: false,
      timerInterval: null,
      timerSeconds: 25 * 60,
      isBreak: false,
      workDuration: 25 * 60,
      breakDuration: 5 * 60,
      autoStart: true,
      soundEnabled: true,
      completedCount: 0,
      pomodoroCount: 0,
      streak: 0,
      settingsPanelOpen: false,
      aiMessages: []
    };

    // Timeline view mode: 'single' or 'dual'
    this.timelineMode = 'single';

    // Master list state
    this._selectedTasks = new Set();  // For bulk selection
    this._masterListGroupBy = 'none'; // none, project, priority, status

    // Analytics state
    this._analyticsPeriod = 'week';  // week, month, quarter

    // Project view state (per-project view preferences)
    this._projectViewState = {};
    this._projectTimelineState = {};

    // Task index for O(1) lookups (populated by rebuildTaskIndex)
    this._taskIndex = new Map();

    this.init();
  }

  async init() {
    try {
      this.data = await window.api.loadData();
    } catch (err) {
      console.error('Failed to load data:', err);
      this.data = { projects: [], tags: [], settings: {} };
      this.showErrorBanner('Failed to load data. Starting with empty state.');
    }

    this.rebuildTaskIndex();

    // Migrate old single workingOnTaskId to array
    if (this.data.workingOnTaskId && !this.data.workingOnTaskIds) {
      this.data.workingOnTaskIds = [this.data.workingOnTaskId];
      delete this.data.workingOnTaskId;
      this.saveData();
    }

    // Initialize project view preferences
    if (!this.data.projectViewPrefs) this.data.projectViewPrefs = {};

    // Restore active tasks from persisted data
    if (this.data.workingOnTaskIds && this.data.workingOnTaskIds.length > 0) {
      this.todayView.workingOnTaskIds = [...this.data.workingOnTaskIds];
    }

    // Apply saved font scale
    this.applyFontScale();

    this.bindEvents();
    this.render();

    // Listen for quick capture
    window.api.onTaskCaptured((task) => {
      this.handleTaskCaptured(task);
    });

    // Listen for floating bar task completion
    window.api.onFloatingBarComplete?.((taskId) => {
      this.handleFloatingBarComplete(taskId);
    });

    // Listen for floating bar subtask toggle
    window.api.onFloatingBarToggleSubtask?.((taskId, subtaskId) => {
      this.toggleTaskStatus(subtaskId);
      this.updateFloatingBar();
    });

    // Check Notion connection on startup and start auto-sync
    this.loadNotionConfig();
    this.startNotionAutoSync();
  }

  handleFloatingBarComplete(taskId) {
    this.showCompletionSummaryModal(taskId, () => {
      if (this.todayView.workingOnTaskIds.includes(taskId)) {
        this.removeActiveTask(taskId);
      }
      this.updateFloatingBar();
      this.render();
    });
  }

  handleTaskCaptured(task) {
    window.api.loadData().then(data => {
      this.data = data;
      this.rebuildTaskIndex();
      this.render();
    });
  }

  updateFloatingBar() {
    if (!this.floatingBarVisible || !window.api.updateFloatingBar) return;

    let taskData = null;
    const firstActiveId = this.todayView.workingOnTaskIds[0];
    if (firstActiveId) {
      const task = this.getAllTasks().find(t => t.id === firstActiveId);
      if (task) {
        taskData = {
          id: task.id,
          name: task.name,
          description: task.description || '',
          context: task.context || '',
          workNotes: task.workNotes || '',
          subtasks: (task.subtasks || []).map(st => ({
            id: st.id,
            name: st.name,
            status: st.status
          }))
        };
      }
    }
    window.api.updateFloatingBar(taskData);
  }

  // ── Undo System ────────────────────────────────────────────────

  pushUndo(description, undoFn) {
    this.undoStack.push({ description, undoFn, timestamp: Date.now() });
    if (this.undoStack.length > 30) this.undoStack.shift();
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) {
      this.showToast('Nothing to undo');
      return;
    }
    action.undoFn();
    this.saveData();
    this.render();
    this.showToast(`Undid: ${action.description}`);
  }

  // ── Font Scale ─────────────────────────────────────────────────

  changeFontScale(delta) {
    const current = this.data.fontScale || 100;
    const next = Math.min(150, Math.max(70, current + delta));
    if (next === current) return;
    this.data.fontScale = next;
    this.applyFontScale();
    this.updateFontSizeDisplay();
    this.saveData();
  }

  resetFontScale() {
    this.data.fontScale = 100;
    this.applyFontScale();
    this.updateFontSizeDisplay();
    this.saveData();
  }

  applyFontScale() {
    const scale = this.data.fontScale || 100;
    document.documentElement.style.fontSize = (14 * scale / 100) + 'px';
  }

  updateFontSizeDisplay() {
    const el = document.getElementById('font-size-value');
    if (el) el.textContent = (this.data.fontScale || 100) + '%';
  }

  // ── View Management ────────────────────────────────────────────

  setView(view) {
    this.currentView = view;

    // Reset global filter when switching views to prevent stale filter state
    this.filterStatus = 'all';
    const filterSelect = document.getElementById('filter-status');
    if (filterSelect) filterSelect.value = 'all';

    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    document.querySelectorAll('.project-item, .tag-item').forEach(item => {
      item.classList.remove('active');
    });

    if (view.startsWith('project-')) {
      const projectItem = document.querySelector(`.project-item[data-id="${view.replace('project-', '')}"]`);
      if (projectItem) projectItem.classList.add('active');
    } else if (view.startsWith('tag-')) {
      const tagItem = document.querySelector(`.tag-item[data-id="${view.replace('tag-', '')}"]`);
      if (tagItem) tagItem.classList.add('active');
    }

    // Hide all views first
    document.getElementById('task-list-view').classList.remove('active');
    document.getElementById('task-board-view').classList.remove('active');
    document.getElementById('calendar-view').classList.remove('active');
    const commandCenterView = document.getElementById('command-center-view');
    if (commandCenterView) commandCenterView.classList.remove('active');

    // Handle special views
    if (view === 'command-center' || view === 'today') {
      if (commandCenterView) commandCenterView.classList.add('active');
      document.querySelector('.view-options').style.display = 'none';
      document.querySelector('.sort-select').style.display = 'none';
      document.querySelector('.filter-select').style.display = 'none';
      this.renderCommandCenter();
    } else if (view === 'calendar' || view === 'upcoming') {
      this.currentView = 'calendar';
      document.getElementById('calendar-view').classList.add('active');
      document.querySelector('.view-options').style.display = 'none';
      document.querySelector('.sort-select').style.display = 'none';
      document.querySelector('.filter-select').style.display = 'none';
      this.renderCalendar();
    } else if (view === 'recaps') {
      document.getElementById('task-list-view').classList.add('active');
      document.querySelector('.view-options').style.display = 'none';
      document.querySelector('.sort-select').style.display = 'none';
      document.querySelector('.filter-select').style.display = 'none';
      this.renderRecapsView();
    } else if (view === 'inbox') {
      document.getElementById('task-list-view').classList.add('active');
      document.querySelector('.view-options').style.display = 'none';
      document.querySelector('.sort-select').style.display = 'none';
      document.querySelector('.filter-select').style.display = 'none';
      this.renderInbox();
    } else if (view === 'master-list') {
      document.getElementById('task-list-view').classList.add('active');
      document.querySelector('.view-options').style.display = 'none';
      document.querySelector('.sort-select').style.display = 'none';
      document.querySelector('.filter-select').style.display = 'none';
      this.renderMasterList();
    } else if (view === 'dashboard') {
      document.getElementById('task-list-view').classList.add('active');
      document.querySelector('.view-options').style.display = 'none';
      document.querySelector('.sort-select').style.display = 'none';
      document.querySelector('.filter-select').style.display = 'none';
      this.renderDashboard();
    } else if (view.startsWith('project-')) {
      document.getElementById('task-list-view').classList.add('active');
      document.querySelector('.view-options').style.display = 'none';
      document.querySelector('.sort-select').style.display = 'none';
      document.querySelector('.filter-select').style.display = 'none';
      this.renderProjectView();
    } else {
      // Show list or board view based on current mode
      if (this.currentViewMode === 'list') {
        document.getElementById('task-list-view').classList.add('active');
      } else {
        document.getElementById('task-board-view').classList.add('active');
      }
      document.querySelector('.view-options').style.display = '';
      document.querySelector('.sort-select').style.display = '';
      document.querySelector('.filter-select').style.display = '';
      this.renderTasks();
    }

    this.updateViewTitle();
    this.closeDetailPanel();
  }

  setViewMode(mode) {
    this.currentViewMode = mode;
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viewMode === mode);
    });
    document.getElementById('task-list-view').classList.toggle('active', mode === 'list');
    document.getElementById('task-board-view').classList.toggle('active', mode === 'board');
    document.getElementById('calendar-view').classList.toggle('active', false);
    this.renderTasks();
  }

  updateViewTitle() {
    const titleEl = document.getElementById('view-title');
    const subtitleEl = document.getElementById('view-subtitle');

    const titles = {
      inbox: 'Inbox',
      today: 'Today',
      upcoming: 'Upcoming',
      completed: 'Completed',
      calendar: 'Calendar',
      waiting: 'Waiting',
      'command-center': 'Command Center',
      'master-list': 'Master List',
      'dashboard': 'Dashboard',
      'recaps': 'Daily Recaps'
    };

    const subtitles = {
      inbox: 'Process and organize your captures',
      calendar: 'View your accomplishments and upcoming work',
      waiting: 'Tasks blocked on someone or something',
      'command-center': 'Your AI-powered mission control',
      'master-list': 'All tasks in one compact view',
      'dashboard': 'Project health at a glance',
      'recaps': 'Track your progress and learnings'
    };

    if (titles[this.currentView]) {
      titleEl.textContent = titles[this.currentView];
      subtitleEl.textContent = subtitles[this.currentView] || '';
    } else if (this.currentView.startsWith('project-')) {
      const project = this.data.projects.find(p => p.id === this.currentView.replace('project-', ''));
      titleEl.textContent = project ? project.name : 'Project';
      subtitleEl.textContent = project ? project.description : '';
    } else if (this.currentView.startsWith('tag-')) {
      const tag = this.data.tags.find(t => t.id === this.currentView.replace('tag-', ''));
      titleEl.textContent = tag ? `#${tag.name}` : 'Tag';
      subtitleEl.textContent = '';
    }
  }

  render() {
    this.renderProjects();
    this.renderTags();
    this.updateCounts();

    // Highlight correct nav item
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === this.currentView);
    });

    // Hide all views first
    document.querySelectorAll('.task-view').forEach(v => v.classList.remove('active'));

    // Helper to hide header controls
    const hideHeaderControls = () => {
      document.querySelector('.view-options')?.style && (document.querySelector('.view-options').style.display = 'none');
      document.querySelector('.sort-select')?.style && (document.querySelector('.sort-select').style.display = 'none');
      document.querySelector('.filter-select')?.style && (document.querySelector('.filter-select').style.display = 'none');
    };
    const showHeaderControls = () => {
      document.querySelector('.view-options')?.style && (document.querySelector('.view-options').style.display = '');
      document.querySelector('.sort-select')?.style && (document.querySelector('.sort-select').style.display = '');
      document.querySelector('.filter-select')?.style && (document.querySelector('.filter-select').style.display = '');
    };

    // Render the appropriate view
    if (this.currentView === 'today' || this.currentView === 'command-center') {
      document.getElementById('command-center-view')?.classList.add('active');
      hideHeaderControls();
      this.renderCommandCenter();
    } else if (this.currentView === 'calendar' || this.currentView === 'upcoming') {
      document.getElementById('calendar-view')?.classList.add('active');
      hideHeaderControls();
      this.renderCalendar();
    } else if (this.currentView === 'recaps') {
      document.getElementById('task-list-view')?.classList.add('active');
      hideHeaderControls();
      this.renderRecapsView();
    } else if (this.currentView === 'master-list') {
      document.getElementById('task-list-view')?.classList.add('active');
      hideHeaderControls();
      this.renderMasterList();
    } else if (this.currentView === 'inbox') {
      document.getElementById('task-list-view')?.classList.add('active');
      hideHeaderControls();
      this.renderInbox();
    } else if (this.currentView === 'dashboard') {
      document.getElementById('task-list-view')?.classList.add('active');
      hideHeaderControls();
      this.renderDashboard();
    } else if (this.currentView.startsWith('project-')) {
      document.getElementById('task-list-view')?.classList.add('active');
      hideHeaderControls();
      this.renderProjectView();
    } else {
      showHeaderControls();
      this.renderTasks();
    }
  }

  updateCounts() {
    // Inbox count
    const inbox = this.data.projects.find(p => p.id === 'inbox' || p.isInbox);
    const inboxCount = inbox ? inbox.tasks.filter(t => t.status !== 'done').length : 0;
    document.getElementById('inbox-count').textContent = inboxCount;

    // Today count (due today OR scheduled today)
    const today = this.getLocalDateString();
    const allTasks = this.getAllTasks();
    const todayCount = allTasks.filter(t =>
      (t.dueDate === today || t.scheduledDate === today) && t.status !== 'done'
    ).length;
    document.getElementById('today-count').textContent = todayCount;

    // Waiting count
    const waitingCount = allTasks.filter(t => t.status === 'waiting').length;
    const waitingCountEl = document.getElementById('waiting-count');
    if (waitingCountEl) waitingCountEl.textContent = waitingCount;
  }

  // ── Tags ───────────────────────────────────────────────────────

  renderTags() {
    const container = document.getElementById('tags-list');
    container.innerHTML = '';

    for (const tag of this.data.tags) {
      const tagCount = this.getAllTasks().filter(t => t.tags.includes(tag.id) && t.status !== 'done').length;
      const el = document.createElement('button');
      el.className = 'tag-item';
      el.dataset.id = tag.id;
      el.innerHTML = `
        <span class="tag-color" style="background:${tag.color}"></span>
        <span class="tag-name">${this.escapeHtml(tag.name)}</span>
        <span class="tag-count">${tagCount}</span>
        <button class="tag-edit" title="Edit">&#9998;</button>
      `;

      el.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tag-edit')) {
          this.setView(`tag-${tag.id}`);
        }
      });

      el.querySelector('.tag-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openTagModal(tag.id);
      });

      container.appendChild(el);
    }

    // Update tag selector in task form
    this.renderTagsSelector();
  }

  renderTagsSelector() {
    const container = document.getElementById('tags-selector');
    container.innerHTML = '';

    for (const tag of this.data.tags) {
      const label = document.createElement('label');
      label.className = 'tag-checkbox';
      label.style.color = tag.color;
      label.innerHTML = `
        <input type="checkbox" value="${tag.id}">
        <span class="tag-color" style="background:${tag.color}"></span>
        <span>${this.escapeHtml(tag.name)}</span>
      `;

      label.querySelector('input').addEventListener('change', () => {
        label.classList.toggle('selected', label.querySelector('input').checked);
      });

      container.appendChild(label);
    }
  }

  // ── Project View State Helpers ─────────────────────────────────

  getProjectViewState(projectId) {
    if (!this._projectViewState[projectId]) {
      const persisted = this.data.projectViewPrefs[projectId] || {};
      this._projectViewState[projectId] = {
        viewMode: persisted.viewMode || 'list',
        filterStatus: persisted.filterStatus || 'active',
        filterPriority: persisted.filterPriority || 'all',
        filterExecType: persisted.filterExecType || 'all',
        sortBy: persisted.sortBy || 'priority',
        groupBy: persisted.groupBy || 'status',
        timelineRange: persisted.timelineRange || 'month'
      };
    }
    return this._projectViewState[projectId];
  }

  updateProjectViewPref(projectId, key, value) {
    const state = this.getProjectViewState(projectId);
    state[key] = value;
    if (!this.data.projectViewPrefs[projectId]) this.data.projectViewPrefs[projectId] = {};
    this.data.projectViewPrefs[projectId][key] = value;
    this.saveData();
    this.renderProjectView();
  }

  getProjectFilteredTasks(project, viewState) {
    let tasks = [...(project.tasks || [])];
    const priorities = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };

    // Status filter
    if (viewState.filterStatus === 'active') {
      tasks = tasks.filter(t => t.status !== 'done');
    } else if (viewState.filterStatus !== 'all') {
      tasks = tasks.filter(t => t.status === viewState.filterStatus);
    }

    // Priority filter
    if (viewState.filterPriority !== 'all') {
      tasks = tasks.filter(t => t.priority === viewState.filterPriority);
    }

    // Execution type filter
    if (viewState.filterExecType !== 'all') {
      tasks = tasks.filter(t => (t.executionType || 'manual') === viewState.filterExecType);
    }

    // Sort
    tasks.sort((a, b) => {
      switch (viewState.sortBy) {
        case 'priority':
          return (priorities[a.priority] || 4) - (priorities[b.priority] || 4);
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return tasks;
  }

  // ── Active Tasks ───────────────────────────────────────────────

  addActiveTask(taskId) {
    if (!taskId || this.todayView.workingOnTaskIds.includes(taskId)) return;
    this.todayView.workingOnTaskIds.push(taskId);
    this.data.workingOnTaskIds = [...this.todayView.workingOnTaskIds];
    this.saveData();
  }

  removeActiveTask(taskId) {
    this.todayView.workingOnTaskIds = this.todayView.workingOnTaskIds.filter(id => id !== taskId);
    this.data.workingOnTaskIds = [...this.todayView.workingOnTaskIds];
    this.saveData();
  }

  setWorkingOnTask(taskId) {
    if (taskId) {
      if (!this.todayView.workingOnTaskIds.includes(taskId)) {
        this.todayView.workingOnTaskIds.push(taskId);
      }
    } else {
      this.todayView.workingOnTaskIds = [];
    }
    this.data.workingOnTaskIds = [...this.todayView.workingOnTaskIds];
    this.saveData();
  }
}

// Mix all module functions onto the class prototype
Object.assign(TaskFlowApp.prototype,
  utils,
  data,
  events,
  modals,
  todayView,
  calendarView,
  projectsView,
  tasks,
  focusMode,
  recaps,
  inboxView,
  analytics,
  integrations
);

// Initialize drag and drop for board view
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.column-tasks').forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', () => {
      column.classList.remove('drag-over');
    });

    column.addEventListener('drop', (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      const newStatus = column.dataset.status;

      if (window.app) {
        window.app.updateTask(taskId, { status: newStatus });
        window.app.render();
      }
    });
  });
});

// Start the application
window.app = new TaskFlowApp();
