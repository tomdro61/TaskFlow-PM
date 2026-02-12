/**
 * NotionSync — Bidirectional sync between TaskFlow PM and Notion
 *
 * Handles: API communication, field mapping, conflict resolution (latest modified wins),
 * database creation, and full sync algorithm.
 */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const RATE_LIMIT_MS = 250; // Minimum delay between API calls

class NotionSync {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.databaseId = config.databaseId;
    this.idMap = config.idMap || {};
    this._lastRequestTime = 0;
  }

  // --- Core API wrapper ---

  async notionFetch(method, path, body = null) {
    // Rate limiting
    const now = Date.now();
    const elapsed = now - this._lastRequestTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
    }
    this._lastRequestTime = Date.now();

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${NOTION_API}${path}`, options);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const err = new Error(errorBody.message || `Notion API error ${response.status}`);
      err.status = response.status;
      err.code = errorBody.code;
      throw err;
    }

    return response.json();
  }

  // --- Setup functions ---

  async testConnection() {
    try {
      const user = await this.notionFetch('GET', '/users/me');
      return { success: true, name: user.name || user.bot?.owner?.user?.name || 'Connected' };
    } catch (err) {
      if (err.status === 401) {
        return { success: false, error: 'Invalid API key. Check your integration token.' };
      }
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  async createDatabase(parentPageId) {
    const schema = {
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'TaskFlow Tasks' } }],
      properties: {
        'Name': { title: {} },
        'Description': { rich_text: {} },
        'Status': {
          select: {
            options: [
              { name: 'Todo', color: 'gray' },
              { name: 'Ready', color: 'blue' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Waiting', color: 'orange' },
              { name: 'Done', color: 'green' },
            ]
          }
        },
        'Priority': {
          select: {
            options: [
              { name: 'None', color: 'default' },
              { name: 'Low', color: 'blue' },
              { name: 'Medium', color: 'yellow' },
              { name: 'High', color: 'orange' },
              { name: 'Urgent', color: 'red' },
            ]
          }
        },
        'Due Date': { date: {} },
        'Scheduled Date': { date: {} },
        'Scheduled Time': { rich_text: {} },
        'Estimate (min)': { number: {} },
        'Execution Type': {
          select: {
            options: [
              { name: 'AI', color: 'purple' },
              { name: 'Manual', color: 'green' },
              { name: 'Hybrid', color: 'blue' },
            ]
          }
        },
        'Assigned To': {
          select: {
            options: [
              { name: 'Claude', color: 'purple' },
              { name: 'Vin', color: 'green' },
            ]
          }
        },
        'Waiting Reason': { rich_text: {} },
        'Context': { rich_text: {} },
        'Complexity': { number: {} },
        'Work Notes': { rich_text: {} },
        'Completed At': { date: {} },
        'Project': { select: { options: [] } },
        'Tags': { multi_select: { options: [] } },
        'TaskFlow ID': { rich_text: {} },
      }
    };

    const db = await this.notionFetch('POST', '/databases', schema);
    this.databaseId = db.id;
    return db.id;
  }

  // --- Field mapping ---

  static STATUS_TO_NOTION = {
    'todo': 'Todo',
    'ready': 'Ready',
    'in-progress': 'In Progress',
    'waiting': 'Waiting',
    'done': 'Done',
  };

  static STATUS_FROM_NOTION = {
    'Todo': 'todo',
    'Ready': 'ready',
    'In Progress': 'in-progress',
    'Waiting': 'waiting',
    'Done': 'done',
  };

  static PRIORITY_TO_NOTION = {
    'none': 'None',
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'urgent': 'Urgent',
  };

  static PRIORITY_FROM_NOTION = {
    'None': 'none',
    'Low': 'low',
    'Medium': 'medium',
    'High': 'high',
    'Urgent': 'urgent',
  };

  static EXECUTION_TO_NOTION = {
    'ai': 'AI',
    'manual': 'Manual',
    'hybrid': 'Hybrid',
  };

  static EXECUTION_FROM_NOTION = {
    'AI': 'ai',
    'Manual': 'manual',
    'Hybrid': 'hybrid',
  };

  static ASSIGNED_TO_NOTION = {
    'claude': 'Claude',
    'vin': 'Vin',
  };

  static ASSIGNED_FROM_NOTION = {
    'Claude': 'claude',
    'Vin': 'vin',
  };

  _richText(str) {
    if (!str) return [];
    // Notion rich_text max 2000 chars per block
    const chunks = [];
    for (let i = 0; i < str.length; i += 2000) {
      chunks.push({ type: 'text', text: { content: str.slice(i, i + 2000) } });
    }
    return chunks;
  }

  _readRichText(richTextArray) {
    if (!richTextArray || !richTextArray.length) return '';
    return richTextArray.map(rt => rt.plain_text || '').join('');
  }

  taskToNotionProperties(task, projectName, tagNames) {
    const props = {
      'Name': { title: this._richText(task.name || 'Untitled') },
      'Description': { rich_text: this._richText(task.description || '') },
      'Status': { select: { name: NotionSync.STATUS_TO_NOTION[task.status] || 'Todo' } },
      'Priority': { select: { name: NotionSync.PRIORITY_TO_NOTION[task.priority] || 'None' } },
      'Execution Type': { select: { name: NotionSync.EXECUTION_TO_NOTION[task.executionType] || 'Manual' } },
      'TaskFlow ID': { rich_text: this._richText(task.id) },
    };

    if (task.dueDate) {
      props['Due Date'] = { date: { start: task.dueDate } };
    } else {
      props['Due Date'] = { date: null };
    }

    if (task.scheduledDate) {
      props['Scheduled Date'] = { date: { start: task.scheduledDate } };
    } else {
      props['Scheduled Date'] = { date: null };
    }

    props['Scheduled Time'] = { rich_text: this._richText(task.scheduledTime || '') };
    props['Estimate (min)'] = { number: task.estimatedMinutes || null };
    props['Complexity'] = { number: task.complexity || null };
    props['Waiting Reason'] = { rich_text: this._richText(task.waitingReason || '') };
    props['Context'] = { rich_text: this._richText(task.context || '') };
    props['Work Notes'] = { rich_text: this._richText(task.workNotes || '') };

    if (task.completedAt) {
      props['Completed At'] = { date: { start: task.completedAt.split('T')[0] } };
    } else {
      props['Completed At'] = { date: null };
    }

    if (projectName) {
      props['Project'] = { select: { name: projectName } };
    }

    if (tagNames && tagNames.length > 0) {
      props['Tags'] = { multi_select: tagNames.map(n => ({ name: n })) };
    } else {
      props['Tags'] = { multi_select: [] };
    }

    if (task.assignedTo) {
      props['Assigned To'] = { select: { name: NotionSync.ASSIGNED_TO_NOTION[task.assignedTo] || task.assignedTo } };
    } else {
      props['Assigned To'] = { select: null };
    }

    return props;
  }

  notionToTaskFields(properties) {
    const fields = {};

    const name = properties['Name']?.title;
    if (name) fields.name = this._readRichText(name);

    fields.description = this._readRichText(properties['Description']?.rich_text);

    const status = properties['Status']?.select?.name;
    if (status) fields.status = NotionSync.STATUS_FROM_NOTION[status] || 'todo';

    const priority = properties['Priority']?.select?.name;
    if (priority) fields.priority = NotionSync.PRIORITY_FROM_NOTION[priority] || 'none';

    const dueDate = properties['Due Date']?.date?.start;
    fields.dueDate = dueDate || null;

    const scheduledDate = properties['Scheduled Date']?.date?.start;
    fields.scheduledDate = scheduledDate || null;

    fields.scheduledTime = this._readRichText(properties['Scheduled Time']?.rich_text) || null;

    fields.estimatedMinutes = properties['Estimate (min)']?.number || null;

    const execType = properties['Execution Type']?.select?.name;
    if (execType) fields.executionType = NotionSync.EXECUTION_FROM_NOTION[execType] || 'manual';

    const assignedTo = properties['Assigned To']?.select?.name;
    fields.assignedTo = assignedTo ? (NotionSync.ASSIGNED_FROM_NOTION[assignedTo] || null) : null;

    fields.waitingReason = this._readRichText(properties['Waiting Reason']?.rich_text) || null;
    fields.context = this._readRichText(properties['Context']?.rich_text) || '';
    fields.complexity = properties['Complexity']?.number || null;
    fields.workNotes = this._readRichText(properties['Work Notes']?.rich_text) || '';

    const completedAt = properties['Completed At']?.date?.start;
    if (completedAt) {
      fields.completedAt = completedAt + 'T00:00:00.000Z';
    }

    // These are read for reference but not directly stored on task — resolved by caller
    fields._projectName = properties['Project']?.select?.name || null;
    fields._tagNames = (properties['Tags']?.multi_select || []).map(t => t.name);
    fields._taskflowId = this._readRichText(properties['TaskFlow ID']?.rich_text) || null;

    return fields;
  }

  // --- Subtask sync (to_do blocks in page body) ---

  async pushSubtasks(pageId, subtasks) {
    if (!subtasks || subtasks.length === 0) return;

    // First, delete existing to_do blocks
    const blocks = await this.notionFetch('GET', `/blocks/${pageId}/children?page_size=100`);
    for (const block of (blocks.results || [])) {
      if (block.type === 'to_do') {
        await this.notionFetch('DELETE', `/blocks/${block.id}`);
      }
    }

    // Then create new to_do blocks
    const children = subtasks.map(st => ({
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: [{ type: 'text', text: { content: st.name || 'Subtask' } }],
        checked: st.status === 'done',
      }
    }));

    // Notion allows max 100 blocks per append
    for (let i = 0; i < children.length; i += 100) {
      await this.notionFetch('PATCH', `/blocks/${pageId}/children`, {
        children: children.slice(i, i + 100),
      });
    }
  }

  async pullSubtasks(pageId) {
    const blocks = await this.notionFetch('GET', `/blocks/${pageId}/children?page_size=100`);
    const subtasks = [];
    for (const block of (blocks.results || [])) {
      if (block.type === 'to_do') {
        subtasks.push({
          name: block.to_do.rich_text.map(rt => rt.plain_text).join('') || 'Subtask',
          checked: block.to_do.checked || false,
        });
      }
    }
    return subtasks;
  }

  // --- Full sync algorithm ---

  async fetchAllNotionPages() {
    const pages = [];
    let cursor = undefined;

    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const result = await this.notionFetch('POST', `/databases/${this.databaseId}/query`, body);
      pages.push(...result.results);
      cursor = result.has_more ? result.next_cursor : undefined;
    } while (cursor);

    return pages;
  }

  async syncAll(data) {
    const summary = { created: 0, updated: 0, deleted: 0, errors: [], pulled: 0 };

    // 1. Fetch all Notion pages
    let notionPages;
    try {
      notionPages = await this.fetchAllNotionPages();
    } catch (err) {
      throw new Error(`Failed to fetch Notion database: ${err.message}`);
    }

    // 2. Build lookup tables
    const allLocalTasks = [];
    const projectMap = {}; // taskId -> projectName
    const taskProjectIdMap = {}; // taskId -> projectId
    for (const project of (data.projects || [])) {
      for (const task of (project.tasks || [])) {
        allLocalTasks.push(task);
        projectMap[task.id] = project.name;
        taskProjectIdMap[task.id] = project.id;
      }
    }

    const tagLookup = {}; // tagId -> tagName
    for (const tag of (data.tags || [])) {
      tagLookup[tag.id] = tag.name;
    }

    const localById = {};
    for (const task of allLocalTasks) {
      localById[task.id] = task;
    }

    // Notion pages indexed by their Notion page ID
    const notionById = {};
    // Notion pages indexed by their TaskFlow ID property (safety net)
    const notionByTaskflowId = {};
    for (const page of notionPages) {
      notionById[page.id] = page;
      const tfId = this._readRichText(page.properties?.['TaskFlow ID']?.rich_text);
      if (tfId) {
        notionByTaskflowId[tfId] = page;
      }
    }

    // Build reverse map: notionPageId -> localTaskId
    const reverseMap = {};
    for (const [localId, notionId] of Object.entries(this.idMap)) {
      reverseMap[notionId] = localId;
    }

    // Track which Notion pages we've processed
    const processedNotionIds = new Set();

    // 3. Categorize and process

    // --- Process local tasks ---
    for (const task of allLocalTasks) {
      const notionPageId = this.idMap[task.id];

      if (notionPageId && notionById[notionPageId]) {
        // BOTH SIDES: mapped and exists in Notion
        processedNotionIds.add(notionPageId);
        const page = notionById[notionPageId];

        try {
          const localTime = new Date(task.updatedAt || task.createdAt).getTime();
          const notionTime = new Date(page.last_edited_time).getTime();

          if (localTime > notionTime) {
            // Local is newer → push to Notion
            const tagNames = (task.tags || []).map(id => tagLookup[id]).filter(Boolean);
            const props = this.taskToNotionProperties(task, projectMap[task.id], tagNames);
            await this.notionFetch('PATCH', `/pages/${notionPageId}`, { properties: props });
            await this.pushSubtasks(notionPageId, task.subtasks);
            summary.updated++;
          } else if (notionTime > localTime) {
            // Notion is newer → pull to local
            const fields = this.notionToTaskFields(page.properties);
            this._applyFieldsToTask(task, fields, data);
            // Pull subtasks
            const notionSubtasks = await this.pullSubtasks(notionPageId);
            this._mergeSubtasks(task, notionSubtasks);
            // Handle project change
            this._handleProjectChange(task, fields._projectName, data, taskProjectIdMap[task.id]);
            summary.pulled++;
          }
          // If equal timestamps, skip (no change)
        } catch (err) {
          summary.errors.push(`Update "${task.name}": ${err.message}`);
        }

      } else if (notionPageId && !notionById[notionPageId]) {
        // MAPPED but missing from Notion → deleted in Notion → delete locally
        processedNotionIds.add(notionPageId);
        try {
          this._deleteLocalTask(task.id, data);
          delete this.idMap[task.id];
          summary.deleted++;
        } catch (err) {
          summary.errors.push(`Delete local "${task.name}": ${err.message}`);
        }

      } else {
        // LOCAL ONLY (unmapped) → check if it exists via TaskFlow ID property
        const existingPage = notionByTaskflowId[task.id];
        if (existingPage) {
          // Rebuild mapping
          this.idMap[task.id] = existingPage.id;
          processedNotionIds.add(existingPage.id);
          // Push local version (since mapping was lost, local is authoritative)
          try {
            const tagNames = (task.tags || []).map(id => tagLookup[id]).filter(Boolean);
            const props = this.taskToNotionProperties(task, projectMap[task.id], tagNames);
            await this.notionFetch('PATCH', `/pages/${existingPage.id}`, { properties: props });
            summary.updated++;
          } catch (err) {
            summary.errors.push(`Remap "${task.name}": ${err.message}`);
          }
        } else {
          // Truly new local task → create in Notion
          try {
            const tagNames = (task.tags || []).map(id => tagLookup[id]).filter(Boolean);
            const props = this.taskToNotionProperties(task, projectMap[task.id], tagNames);
            const newPage = await this.notionFetch('POST', '/pages', {
              parent: { database_id: this.databaseId },
              properties: props,
            });
            this.idMap[task.id] = newPage.id;
            // Push subtasks
            if (task.subtasks && task.subtasks.length > 0) {
              await this.pushSubtasks(newPage.id, task.subtasks);
            }
            summary.created++;
          } catch (err) {
            summary.errors.push(`Create Notion "${task.name}": ${err.message}`);
          }
        }
      }
    }

    // --- Process Notion-only pages (not yet processed) ---
    for (const page of notionPages) {
      if (processedNotionIds.has(page.id)) continue;
      if (page.archived) continue;

      const localId = reverseMap[page.id];
      if (localId && !localById[localId]) {
        // MAPPED but missing locally → deleted locally → trash in Notion
        try {
          await this.notionFetch('PATCH', `/pages/${page.id}`, { archived: true });
          delete this.idMap[localId];
          summary.deleted++;
        } catch (err) {
          summary.errors.push(`Trash Notion page: ${err.message}`);
        }
        continue;
      }

      // Truly new in Notion → create locally
      try {
        const fields = this.notionToTaskFields(page.properties);
        const taskflowId = fields._taskflowId;

        // If it has a TaskFlow ID that matches a deleted local task, trash it
        if (taskflowId && !localById[taskflowId]) {
          // Could be a previously deleted task — check if ID was ever in our map
          const wasDeleted = Object.values(this.idMap).includes(page.id) === false && taskflowId;
          // If the taskflowId looks like our format but isn't in local data, it was deleted
          if (wasDeleted && taskflowId.length > 8) {
            await this.notionFetch('PATCH', `/pages/${page.id}`, { archived: true });
            summary.deleted++;
            continue;
          }
        }

        const newTask = this._createLocalTask(fields, data);
        this.idMap[newTask.id] = page.id;

        // Pull subtasks
        const notionSubtasks = await this.pullSubtasks(page.id);
        this._mergeSubtasks(newTask, notionSubtasks);

        // Update the Notion page with the new TaskFlow ID
        await this.notionFetch('PATCH', `/pages/${page.id}`, {
          properties: { 'TaskFlow ID': { rich_text: this._richText(newTask.id) } }
        });

        summary.pulled++;
      } catch (err) {
        summary.errors.push(`Pull from Notion: ${err.message}`);
      }
    }

    return summary;
  }

  // --- Helper: Apply Notion fields to a local task ---

  _applyFieldsToTask(task, fields, data) {
    if (fields.name !== undefined) task.name = fields.name;
    if (fields.description !== undefined) task.description = fields.description;
    if (fields.status !== undefined) task.status = fields.status;
    if (fields.priority !== undefined) task.priority = fields.priority;
    if (fields.dueDate !== undefined) task.dueDate = fields.dueDate;
    if (fields.scheduledDate !== undefined) task.scheduledDate = fields.scheduledDate;
    if (fields.scheduledTime !== undefined) task.scheduledTime = fields.scheduledTime;
    if (fields.estimatedMinutes !== undefined) task.estimatedMinutes = fields.estimatedMinutes;
    if (fields.executionType !== undefined) task.executionType = fields.executionType;
    if (fields.assignedTo !== undefined) task.assignedTo = fields.assignedTo;
    if (fields.waitingReason !== undefined) task.waitingReason = fields.waitingReason;
    if (fields.context !== undefined) task.context = fields.context;
    if (fields.complexity !== undefined) task.complexity = fields.complexity;
    if (fields.workNotes !== undefined) task.workNotes = fields.workNotes;
    if (fields.completedAt !== undefined) task.completedAt = fields.completedAt;

    // Resolve tags
    if (fields._tagNames && fields._tagNames.length > 0) {
      task.tags = fields._tagNames.map(name => {
        let tag = (data.tags || []).find(t => t.name.toLowerCase() === name.toLowerCase());
        if (!tag) {
          tag = { id: this._generateId(), name, color: '#6366f1' };
          data.tags.push(tag);
        }
        return tag.id;
      });
    }

    task.updatedAt = new Date().toISOString();
  }

  // --- Helper: Create a new local task from Notion fields ---

  _createLocalTask(fields, data) {
    const task = {
      id: this._generateId(),
      name: fields.name || 'Untitled',
      description: fields.description || '',
      context: fields.context || '',
      filePaths: [],
      projectId: null,
      status: fields.status || 'todo',
      priority: fields.priority || 'none',
      dueDate: fields.dueDate || null,
      scheduledTime: fields.scheduledTime || null,
      scheduledDate: fields.scheduledDate || null,
      estimatedMinutes: fields.estimatedMinutes || null,
      waitingReason: fields.waitingReason || null,
      blockedBy: [],
      blocks: [],
      complexity: fields.complexity || null,
      executionType: fields.executionType || 'manual',
      assignedTo: fields.assignedTo || null,
      workNotes: fields.workNotes || '',
      tags: [],
      subtasks: [],
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: fields.completedAt || null,
    };

    // Resolve project
    let targetProject = null;
    if (fields._projectName) {
      targetProject = data.projects.find(p => p.name.toLowerCase() === fields._projectName.toLowerCase());
      if (!targetProject) {
        targetProject = {
          id: this._generateId(),
          name: fields._projectName,
          description: '',
          color: '#6366f1',
          tasks: [],
          categoryId: 'cat-personal',
          status: 'active',
          goal: '',
          createdAt: new Date().toISOString(),
        };
        data.projects.push(targetProject);
      }
    }
    if (!targetProject) {
      targetProject = data.projects.find(p => p.isInbox || p.id === 'inbox');
      if (!targetProject) {
        targetProject = { id: 'inbox', name: 'Inbox', color: '#6366f1', tasks: [], isInbox: true };
        data.projects.unshift(targetProject);
      }
    }

    task.projectId = targetProject.id;
    targetProject.tasks.push(task);

    // Resolve tags
    if (fields._tagNames && fields._tagNames.length > 0) {
      task.tags = fields._tagNames.map(name => {
        let tag = (data.tags || []).find(t => t.name.toLowerCase() === name.toLowerCase());
        if (!tag) {
          tag = { id: this._generateId(), name, color: '#6366f1' };
          data.tags.push(tag);
        }
        return tag.id;
      });
    }

    return task;
  }

  // --- Helper: Handle project change ---

  _handleProjectChange(task, newProjectName, data, currentProjectId) {
    if (!newProjectName) return;

    const currentProject = data.projects.find(p => p.id === currentProjectId);
    if (currentProject && currentProject.name.toLowerCase() === newProjectName.toLowerCase()) return;

    // Find or create target project
    let targetProject = data.projects.find(p => p.name.toLowerCase() === newProjectName.toLowerCase());
    if (!targetProject) {
      targetProject = {
        id: this._generateId(),
        name: newProjectName,
        description: '',
        color: '#6366f1',
        tasks: [],
        categoryId: 'cat-personal',
        status: 'active',
        goal: '',
        createdAt: new Date().toISOString(),
      };
      data.projects.push(targetProject);
    }

    // Move task
    if (currentProject) {
      const idx = currentProject.tasks.findIndex(t => t.id === task.id);
      if (idx !== -1) currentProject.tasks.splice(idx, 1);
    }
    task.projectId = targetProject.id;
    targetProject.tasks.push(task);
  }

  // --- Helper: Delete a local task ---

  _deleteLocalTask(taskId, data) {
    for (const project of (data.projects || [])) {
      const idx = (project.tasks || []).findIndex(t => t.id === taskId);
      if (idx !== -1) {
        project.tasks.splice(idx, 1);

        // Also remove from workingOnTaskIds
        if (data.workingOnTaskIds) {
          const wIdx = data.workingOnTaskIds.indexOf(taskId);
          if (wIdx !== -1) data.workingOnTaskIds.splice(wIdx, 1);
        }
        return;
      }
    }
  }

  // --- Helper: Merge subtasks from Notion to_do blocks ---

  _mergeSubtasks(task, notionSubtasks) {
    if (!notionSubtasks || notionSubtasks.length === 0) return;

    // Replace subtasks with Notion version
    task.subtasks = notionSubtasks.map((ns, i) => {
      // Try to match existing subtask by name
      const existing = (task.subtasks || []).find(s => s.name === ns.name);
      return {
        id: existing?.id || this._generateId(),
        name: ns.name,
        status: ns.checked ? 'done' : 'todo',
        assignedTo: existing?.assignedTo || null,
        completedAt: ns.checked ? (existing?.completedAt || new Date().toISOString()) : null,
      };
    });
  }

  // --- Utility ---

  _generateId() {
    return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = NotionSync;
