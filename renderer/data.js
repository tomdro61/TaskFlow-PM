// renderer/data.js — Data management, CRUD, projects, categories, tags, dependencies

// ──────────────────────────────────────────────
// Data Persistence
// ──────────────────────────────────────────────

export async function saveData() {
  try {
    await window.api.saveData(this.data);
    this.rebuildTaskIndex();
  } catch (err) {
    console.error('Failed to save data:', err);
    this.showToast('Failed to save data', 3000);
  }
}

export async function refreshData() {
  try {
    this.data = await window.api.loadData();
    this.rebuildTaskIndex();
    this.render();
    this.showToast('Data refreshed');
  } catch (err) {
    console.error('Failed to refresh data:', err);
    this.showToast('Failed to refresh data', 3000);
  }
}

export async function exportData() {
  await window.api.exportData(this.data);
  this.closeModal('settings-modal');
}

export async function importData() {
  const data = await window.api.importData();
  if (data) {
    this.data = data;
    await this.saveData();
    this.applyFontScale();
    this.render();
  }
  this.closeModal('settings-modal');
}

// ──────────────────────────────────────────────
// Task CRUD
// ──────────────────────────────────────────────

export function createTask(taskData) {
  const task = {
    id: this.generateId(),
    name: taskData.name,
    description: taskData.description || '',
    context: taskData.context || '',  // Brain dump context for AI
    filePaths: taskData.filePaths || [],  // Attached file/folder paths
    projectId: taskData.projectId || null,
    status: taskData.status || 'todo',
    priority: taskData.priority || 'none',
    dueDate: taskData.dueDate || null,
    // Time blocking fields
    scheduledTime: taskData.scheduledTime || null,  // HH:MM format
    scheduledDate: taskData.scheduledDate || null,  // YYYY-MM-DD format
    estimatedMinutes: taskData.estimatedMinutes || null,  // Duration preset
    waitingReason: taskData.waitingReason || null,  // Why task is blocked
    blockedBy: taskData.blockedBy || null,  // Who/what is blocking
    complexity: taskData.complexity || null,  // 1-5 complexity score
    // Parallel execution field
    executionType: taskData.executionType || 'manual',  // 'ai' | 'manual' | 'hybrid'
    tags: taskData.tags || [],
    subtasks: [],
    parentId: taskData.parentId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };

  if (task.parentId) {
    const parentTask = this.findTask(task.parentId);
    if (parentTask) {
      parentTask.subtasks.push(task);
    }
  } else {
    const project = this.data.projects.find(p => p.id === task.projectId);
    if (project) {
      project.tasks.push(task);
    } else {
      // Create inbox project if needed
      let inbox = this.data.projects.find(p => p.id === 'inbox');
      if (!inbox) {
        inbox = { id: 'inbox', name: 'Inbox', color: '#6366f1', tasks: [], isInbox: true };
        this.data.projects.unshift(inbox);
      }
      inbox.tasks.push(task);
    }
  }

  this.saveData();
  return task;
}

export function updateTask(taskId, updates) {
  const task = this.findTask(taskId);
  if (task) {
    Object.assign(task, updates);
    task.updatedAt = new Date().toISOString();
    if (updates.status === 'done' && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    } else if (updates.status !== 'done') {
      task.completedAt = null;
    }
    this.saveData();
  }
  return task;
}

export function updateSubtask(parentTaskId, subtaskId, updates) {
  const parentTask = this.findTask(parentTaskId);
  if (parentTask && parentTask.subtasks) {
    const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      Object.assign(subtask, updates);
      this.saveData();
      return subtask;
    }
  }
  return null;
}

export function deleteTask(taskId) {
  for (const project of this.data.projects) {
    const index = project.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      project.tasks.splice(index, 1);
      this.saveData();
      return true;
    }
    // Check subtasks
    for (const task of project.tasks) {
      const subIndex = task.subtasks.findIndex(st => st.id === taskId);
      if (subIndex !== -1) {
        task.subtasks.splice(subIndex, 1);
        this.saveData();
        return true;
      }
    }
  }
  return false;
}

export function duplicateTask(task) {
  const newTask = {
    name: task.name + ' (copy)',
    description: task.description || '',
    context: task.context || '',
    priority: task.priority,
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
    tags: [...(task.tags || [])],
    status: 'todo'
  };

  // Find project
  for (const project of this.data.projects) {
    if (project.tasks.some(t => t.id === task.id)) {
      newTask.projectId = project.id;
      break;
    }
  }

  this.createTask(newTask);
  this.render();
}

export function moveTaskToProject(taskId, targetProjectId) {
  let task = null;
  let sourceProject = null;
  for (const project of this.data.projects) {
    const idx = project.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      task = project.tasks.splice(idx, 1)[0];
      sourceProject = project;
      break;
    }
  }
  if (!task) return false;
  const target = this.data.projects.find(p => p.id === targetProjectId);
  if (!target) {
    // Put it back if target not found
    sourceProject.tasks.push(task);
    return false;
  }
  target.tasks.push(task);
  this.saveData();
  return true;
}

// ──────────────────────────────────────────────
// Task Index & Queries
// ──────────────────────────────────────────────

export function rebuildTaskIndex() {
  this._taskIndex.clear();
  if (!this.data?.projects) return;
  for (const project of this.data.projects) {
    for (const task of project.tasks) {
      this._taskIndex.set(task.id, task);
      if (task.subtasks) {
        for (const subtask of task.subtasks) {
          this._taskIndex.set(subtask.id, subtask);
        }
      }
    }
  }
}

export function findTask(taskId) {
  return this._taskIndex.get(taskId) || null;
}

export function getAllTasks(includeSubtasks = false) {
  let tasks = [];
  for (const project of this.data.projects) {
    tasks = tasks.concat(project.tasks);
    if (includeSubtasks) {
      for (const task of project.tasks) {
        tasks = tasks.concat(task.subtasks);
      }
    }
  }
  return tasks;
}

export function getFilteredTasks() {
  let tasks = [];

  switch (this.currentView) {
    case 'inbox':
      const inbox = this.data.projects.find(p => p.id === 'inbox' || p.isInbox);
      if (inbox) tasks = inbox.tasks.filter(t => t.status !== 'done');
      break;
    case 'today':
      const today = this.getLocalDateString();
      tasks = this.getAllTasks().filter(t => t.dueDate === today && t.status !== 'done');
      break;
    case 'upcoming':
      const now = this.getLocalDateString();
      tasks = this.getAllTasks()
        .filter(t => {
          if (t.status === 'done') return false;
          // Include tasks with scheduledDate or dueDate in the future
          const schedDate = t.scheduledDate;
          const dueDate = t.dueDate;
          return (schedDate && schedDate >= now) || (dueDate && dueDate >= now);
        })
        .sort((a, b) => {
          // Sort by scheduledDate first, then dueDate
          const aDate = a.scheduledDate || a.dueDate || '9999-12-31';
          const bDate = b.scheduledDate || b.dueDate || '9999-12-31';
          return aDate.localeCompare(bDate);
        });
      break;
    case 'completed':
      tasks = this.getAllTasks().filter(t => t.status === 'done');
      break;
    case 'waiting':
      tasks = this.getAllTasks().filter(t => t.status === 'waiting');
      break;
    case 'master-list':
      tasks = this.getAllTasks();
      break;
    default:
      if (this.currentView.startsWith('project-')) {
        const projectId = this.currentView.replace('project-', '');
        const project = this.data.projects.find(p => p.id === projectId);
        if (project) tasks = project.tasks;
      } else if (this.currentView.startsWith('tag-')) {
        const tagId = this.currentView.replace('tag-', '');
        tasks = this.getAllTasks().filter(t => t.tags.includes(tagId));
      }
  }

  // Apply search filter
  if (this.searchQuery) {
    const query = this.searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }

  // Apply status filter
  if (this.filterStatus !== 'all') {
    tasks = tasks.filter(t => t.status === this.filterStatus);
  }

  // Apply sort
  tasks.sort((a, b) => {
    switch (this.sortBy) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      case 'priority':
        const priorities = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
        return priorities[a.priority] - priorities[b.priority];
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return tasks;
}

// ──────────────────────────────────────────────
// Project CRUD
// ──────────────────────────────────────────────

export function createProject(projectData) {
  const project = {
    id: this.generateId(),
    name: projectData.name,
    description: projectData.description || '',
    goal: projectData.goal || '',
    color: projectData.color || '#6366f1',
    categoryId: projectData.categoryId || null,
    status: projectData.status || 'active',
    tasks: [],
    createdAt: new Date().toISOString()
  };
  this.data.projects.push(project);
  this.saveData();
  return project;
}

export function updateProject(projectId, updates) {
  const project = this.data.projects.find(p => p.id === projectId);
  if (project) {
    Object.assign(project, updates);
    this.saveData();
  }
  return project;
}

export function deleteProject(projectId) {
  const index = this.data.projects.findIndex(p => p.id === projectId);
  if (index !== -1 && !this.data.projects[index].isInbox) {
    this.data.projects.splice(index, 1);
    this.saveData();
    if (this.currentView === `project-${projectId}`) {
      this.currentView = 'inbox';
    }
    return true;
  }
  return false;
}

// ──────────────────────────────────────────────
// Category CRUD
// ──────────────────────────────────────────────

export function createCategory(categoryData) {
  const maxOrder = Math.max(0, ...this.data.categories.map(c => c.order || 0));
  const category = {
    id: this.generateId(),
    name: categoryData.name,
    color: categoryData.color || '#6366f1',
    order: maxOrder + 1,
    collapsed: false
  };
  this.data.categories.push(category);
  this.saveData();
  return category;
}

export function updateCategory(categoryId, updates) {
  const category = this.data.categories.find(c => c.id === categoryId);
  if (category) {
    Object.assign(category, updates);
    this.saveData();
  }
  return category;
}

export function deleteCategory(categoryId) {
  const index = this.data.categories.findIndex(c => c.id === categoryId);
  if (index !== -1) {
    // Move projects in this category to uncategorized
    for (const project of this.data.projects) {
      if (project.categoryId === categoryId) {
        project.categoryId = null;
      }
    }
    this.data.categories.splice(index, 1);
    this.saveData();
    return true;
  }
  return false;
}

export function toggleCategoryCollapsed(categoryId) {
  const category = this.data.categories.find(c => c.id === categoryId);
  if (category) {
    category.collapsed = !category.collapsed;
    this.saveData();
    this.renderSidebar();
  }
}

// ──────────────────────────────────────────────
// Favorites
// ──────────────────────────────────────────────

export function toggleFavorite(projectId) {
  if (!this.data.favorites) {
    this.data.favorites = [];
  }
  const index = this.data.favorites.indexOf(projectId);
  if (index === -1) {
    this.data.favorites.push(projectId);
  } else {
    this.data.favorites.splice(index, 1);
  }
  this.saveData();
  this.renderSidebar();
}

export function isFavorite(projectId) {
  return this.data.favorites && this.data.favorites.includes(projectId);
}

// ──────────────────────────────────────────────
// Tag CRUD
// ──────────────────────────────────────────────

export function createTag(tagData) {
  const tag = {
    id: this.generateId(),
    name: tagData.name,
    color: tagData.color || '#6366f1'
  };
  this.data.tags.push(tag);
  this.saveData();
  return tag;
}

export function updateTag(tagId, updates) {
  const tag = this.data.tags.find(t => t.id === tagId);
  if (tag) {
    Object.assign(tag, updates);
    this.saveData();
  }
  return tag;
}

export function deleteTag(tagId) {
  const index = this.data.tags.findIndex(t => t.id === tagId);
  if (index !== -1) {
    this.data.tags.splice(index, 1);
    // Remove tag from all tasks
    for (const project of this.data.projects) {
      for (const task of project.tasks) {
        task.tags = task.tags.filter(t => t !== tagId);
      }
    }
    this.saveData();
    return true;
  }
  return false;
}

// ──────────────────────────────────────────────
// Task Dependencies
// ──────────────────────────────────────────────

export function addDependency(taskId, blockerTaskId) {
  const task = this.findTask(taskId);
  const blocker = this.findTask(blockerTaskId);

  if (!task || !blocker || taskId === blockerTaskId) {
    return false;
  }

  // Check for circular dependency
  if (this.wouldCreateCircularDependency(taskId, blockerTaskId)) {
    return false;
  }

  // Initialize arrays if needed
  if (!Array.isArray(task.blockedBy)) task.blockedBy = [];
  if (!Array.isArray(blocker.blocks)) blocker.blocks = [];

  // Add dependency if not already present
  if (!task.blockedBy.includes(blockerTaskId)) {
    task.blockedBy.push(blockerTaskId);
  }
  if (!blocker.blocks.includes(taskId)) {
    blocker.blocks.push(taskId);
  }

  this.saveData();
  return true;
}

export function removeDependency(taskId, blockerTaskId) {
  const task = this.findTask(taskId);
  const blocker = this.findTask(blockerTaskId);

  if (task && Array.isArray(task.blockedBy)) {
    task.blockedBy = task.blockedBy.filter(id => id !== blockerTaskId);
  }
  if (blocker && Array.isArray(blocker.blocks)) {
    blocker.blocks = blocker.blocks.filter(id => id !== taskId);
  }

  this.saveData();
  return true;
}

export function wouldCreateCircularDependency(taskId, newBlockerId) {
  // Check if adding newBlockerId as a blocker of taskId would create a cycle
  const visited = new Set();
  const stack = [newBlockerId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (currentId === taskId) {
      return true; // Cycle detected
    }
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const currentTask = this.findTask(currentId);
    if (currentTask && Array.isArray(currentTask.blockedBy)) {
      for (const blockerId of currentTask.blockedBy) {
        stack.push(blockerId);
      }
    }
  }
  return false;
}

export function isTaskBlocked(task) {
  if (!task || !Array.isArray(task.blockedBy) || task.blockedBy.length === 0) {
    return false;
  }
  // Check if any blocker is not done
  for (const blockerId of task.blockedBy) {
    const blocker = this.findTask(blockerId);
    if (blocker && blocker.status !== 'done') {
      return true;
    }
  }
  return false;
}

export function getBlockingTasks(task) {
  if (!task || !Array.isArray(task.blockedBy)) return [];
  return task.blockedBy
    .map(id => this.findTask(id))
    .filter(t => t && t.status !== 'done');
}

export function getBlockedTasks(task) {
  if (!task || !Array.isArray(task.blocks)) return [];
  return task.blocks
    .map(id => this.findTask(id))
    .filter(Boolean);
}
