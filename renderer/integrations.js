// renderer/integrations.js — Command palette, Notion sync

export function openCommandPalette() {
  const overlay = document.getElementById('command-palette');
  if (!overlay) return;
  overlay.style.display = 'flex';
  this._paletteIndex = 0;
  this._paletteResults = [];

  const input = document.getElementById('command-palette-input');
  input.value = '';
  input.focus();

  // Build search index
  this._paletteAllTasks = [];
  const tagLookup = {};
  (this.data.tags || []).forEach(t => { tagLookup[t.id] = t.name; });

  for (const project of (this.data.projects || [])) {
    for (const task of (project.tasks || [])) {
      const tags = (task.tags || []).map(id => tagLookup[id]).filter(Boolean);
      this._paletteAllTasks.push({
        task,
        projectName: project.isInbox ? '' : project.name,
        tagNames: tags,
        searchText: [
          task.name,
          project.name,
          ...tags,
          task.description || '',
          task.assignedTo || '',
        ].join(' ').toLowerCase(),
      });
    }
  }

  this.updateCommandPaletteResults('');

  // Event handlers
  input.oninput = () => {
    this._paletteIndex = 0;
    this.updateCommandPaletteResults(input.value);
  };

  input.onkeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeCommandPalette();
    } else if (e.key === 'ArrowDown' || (e.key === 'j' && e.ctrlKey)) {
      e.preventDefault();
      this._paletteIndex = Math.min(this._paletteIndex + 1, this._paletteResults.length - 1);
      this.highlightPaletteItem();
    } else if (e.key === 'ArrowUp' || (e.key === 'k' && e.ctrlKey)) {
      e.preventDefault();
      this._paletteIndex = Math.max(this._paletteIndex - 1, 0);
      this.highlightPaletteItem();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.paletteAction('open');
    } else if (e.key === 'a' && e.altKey) {
      e.preventDefault();
      this.paletteAction('active');
    } else if (e.key === 'q' && e.altKey) {
      e.preventDefault();
      this.paletteAction('claude');
    } else if (e.key === 's' && e.altKey) {
      e.preventDefault();
      this.paletteAction('today');
    }
  };

  // Click outside to close
  overlay.onclick = (e) => {
    if (e.target === overlay) this.closeCommandPalette();
  };
}

export function closeCommandPalette() {
  const overlay = document.getElementById('command-palette');
  if (overlay) overlay.style.display = 'none';
  this._paletteAllTasks = null;
}

export function updateCommandPaletteResults(query) {
  const container = document.getElementById('command-palette-results');
  if (!container) return;

  const q = query.toLowerCase().trim();
  let results;

  if (!q) {
    // Show recent / today's tasks when empty
    const today = this.getLocalDateString();
    results = this._paletteAllTasks
      .filter(r => r.task.status !== 'done')
      .sort((a, b) => {
        // Today's tasks first, then by updatedAt
        const aToday = (a.task.dueDate === today || a.task.scheduledDate === today) ? 0 : 1;
        const bToday = (b.task.dueDate === today || b.task.scheduledDate === today) ? 0 : 1;
        if (aToday !== bToday) return aToday - bToday;
        return new Date(b.task.updatedAt || b.task.createdAt) - new Date(a.task.updatedAt || a.task.createdAt);
      })
      .slice(0, 15);
  } else {
    // Fuzzy search: split query into words, all must match
    const words = q.split(/\s+/);
    results = this._paletteAllTasks
      .filter(r => words.every(w => r.searchText.includes(w)))
      .sort((a, b) => {
        // Exact name match first
        const aExact = a.task.name.toLowerCase().includes(q) ? 0 : 1;
        const bExact = b.task.name.toLowerCase().includes(q) ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        // Then non-done first
        const aDone = a.task.status === 'done' ? 1 : 0;
        const bDone = b.task.status === 'done' ? 1 : 0;
        return aDone - bDone;
      })
      .slice(0, 20);
  }

  this._paletteResults = results;
  this._paletteIndex = Math.min(this._paletteIndex, results.length - 1);
  if (this._paletteIndex < 0) this._paletteIndex = 0;

  if (results.length === 0) {
    container.innerHTML = `<div class="command-palette-empty">No tasks found</div>`;
    return;
  }

  container.innerHTML = results.map((r, i) => {
    const t = r.task;
    let name = this.escapeHtml(t.name);

    // Highlight matching text
    if (q) {
      const words = q.split(/\s+/);
      for (const w of words) {
        const regex = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        name = name.replace(regex, '<mark>$1</mark>');
      }
    }

    const meta = [
      r.projectName,
      ...r.tagNames.map(t => `#${t}`),
      t.estimatedMinutes ? `${t.estimatedMinutes}m` : '',
      t.assignedTo ? `@${t.assignedTo}` : '',
    ].filter(Boolean).join(' · ');

    const palExecType = t.executionType || 'manual';
    const palExecBadge = palExecType !== 'manual' ? `<span class="exec-badge exec-badge-${palExecType}" style="margin-left:6px;">${palExecType === 'ai' ? 'Claude' : 'Hybrid'}</span>` : '';

    return `
      <div class="command-palette-item ${i === this._paletteIndex ? 'selected' : ''}"
           data-index="${i}" data-task-id="${t.id}">
        <span class="command-palette-item-priority ${t.priority || 'none'}"></span>
        <div class="command-palette-item-content">
          <div class="command-palette-item-name">${name}${palExecBadge}</div>
          ${meta ? `<div class="command-palette-item-meta">${this.escapeHtml(meta)}</div>` : ''}
        </div>
        <span class="command-palette-item-status ${t.status}">${t.status}</span>
      </div>
    `;
  }).join('');

  // Click to open
  container.querySelectorAll('.command-palette-item').forEach(el => {
    el.addEventListener('click', () => {
      this._paletteIndex = parseInt(el.dataset.index);
      this.paletteAction('open');
    });
    el.addEventListener('mouseenter', () => {
      this._paletteIndex = parseInt(el.dataset.index);
      this.highlightPaletteItem();
    });
  });
}

export function highlightPaletteItem() {
  const container = document.getElementById('command-palette-results');
  if (!container) return;
  container.querySelectorAll('.command-palette-item').forEach((el, i) => {
    el.classList.toggle('selected', i === this._paletteIndex);
    if (i === this._paletteIndex) {
      el.scrollIntoView({ block: 'nearest' });
    }
  });
}

export function paletteAction(action) {
  if (!this._paletteResults || this._paletteResults.length === 0) return;
  const result = this._paletteResults[this._paletteIndex];
  if (!result) return;
  const task = result.task;
  const today = this.getLocalDateString();

  switch (action) {
    case 'open':
      this.closeCommandPalette();
      this.openDetailPanel(task.id);
      break;
    case 'active':
      if (this.todayView.workingOnTaskIds.includes(task.id)) {
        this.removeActiveTask(task.id);
        this.showToast(`Removed "${task.name}" from active`);
      } else {
        this.addActiveTask(task.id);
        this.showToast(`Added "${task.name}" to active`);
      }
      this.closeCommandPalette();
      this.render();
      break;
    case 'claude':
      const newAssignment = task.assignedTo === 'claude' ? null : 'claude';
      this.updateTask(task.id, { assignedTo: newAssignment });
      this.showToast(newAssignment ? `Assigned "${task.name}" to Claude` : `Unassigned "${task.name}"`);
      this.closeCommandPalette();
      this.render();
      break;
    case 'today':
      if (task.scheduledDate === today) {
        this.updateTask(task.id, { scheduledDate: null });
        this.showToast(`Removed "${task.name}" from today`);
      } else {
        this.updateTask(task.id, { scheduledDate: today });
        this.showToast(`Added "${task.name}" to today`);
      }
      this.closeCommandPalette();
      this.render();
      break;
  }
}

// --- Notion Sync Methods ---

export async function loadNotionConfig() {
  try {
    const config = await window.api.notionGetConfig();
    const syncBtn = document.getElementById('sidebar-notion-sync-btn');
    if (config.connected) {
      syncBtn.style.display = '';
      // Update settings modal if open
      const disconnected = document.getElementById('notion-disconnected');
      const connected = document.getElementById('notion-connected');
      if (disconnected) disconnected.style.display = 'none';
      if (connected) connected.style.display = '';
      const lastSync = document.getElementById('notion-last-sync');
      const sidebarLastSync = document.getElementById('sidebar-last-sync');
      if (config.lastSyncAt) {
        const d = new Date(config.lastSyncAt);
        const timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        if (lastSync) lastSync.textContent = `Last sync: ${d.toLocaleDateString()} ${timeStr}`;
        if (sidebarLastSync) sidebarLastSync.textContent = `Last: ${timeStr}`;
      } else {
        if (lastSync) lastSync.textContent = 'Never synced';
        if (sidebarLastSync) sidebarLastSync.textContent = '';
      }
    } else {
      syncBtn.style.display = 'none';
      const disconnected = document.getElementById('notion-disconnected');
      const connected = document.getElementById('notion-connected');
      if (disconnected) disconnected.style.display = '';
      if (connected) connected.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to load Notion config:', err);
  }
}

export function openNotionSetup() {
  this.closeModal('settings-modal');
  // Reset steps
  document.querySelectorAll('.notion-step').forEach(step => {
    step.classList.remove('active', 'complete');
  });
  const step1 = document.querySelector('.notion-step[data-step="1"]');
  if (step1) step1.classList.add('active');
  document.getElementById('notion-api-key').value = '';
  document.getElementById('notion-page-url').value = '';
  document.getElementById('notion-test-result').textContent = '';
  document.getElementById('notion-test-result').className = 'notion-test-result';
  document.getElementById('notion-setup-status').textContent = '';
  document.getElementById('notion-setup-status').className = 'notion-test-result';
  document.getElementById('notion-step2-next').disabled = true;
  this.openModal('notion-setup-modal');
}

export function notionSetupGoToStep(stepNum) {
  document.querySelectorAll('.notion-step').forEach(step => {
    const s = parseInt(step.dataset.step);
    if (s < stepNum) {
      step.classList.remove('active');
      step.classList.add('complete');
    } else if (s === stepNum) {
      step.classList.remove('complete');
      step.classList.add('active');
    } else {
      step.classList.remove('active', 'complete');
    }
  });
}

export function _extractNotionPageId(url) {
  // Notion URLs: https://www.notion.so/Page-Name-<32 hex chars>
  // or https://www.notion.so/<32 hex chars>
  // or just the raw ID with dashes
  const cleaned = url.trim().replace(/\?.*$/, '').replace(/#.*$/, '');
  // Try to extract 32 hex chars from the end
  const match = cleaned.match(/([a-f0-9]{32})\/?$/i) || cleaned.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/?$/i);
  if (match) {
    // Return as dashed UUID format
    const hex = match[1].replace(/-/g, '');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  return null;
}

export async function notionTestConnection() {
  const apiKey = document.getElementById('notion-api-key').value.trim();
  if (!apiKey) return;

  const resultEl = document.getElementById('notion-test-result');
  resultEl.textContent = 'Testing connection...';
  resultEl.className = 'notion-test-result loading';

  const result = await window.api.notionTestConnection(apiKey);
  if (result.success) {
    resultEl.textContent = `Connected as ${result.name}`;
    resultEl.className = 'notion-test-result success';
    document.getElementById('notion-step2-next').disabled = false;
  } else {
    resultEl.textContent = result.error;
    resultEl.className = 'notion-test-result error';
    document.getElementById('notion-step2-next').disabled = true;
  }
}

export async function notionCreateAndSync() {
  const apiKey = document.getElementById('notion-api-key').value.trim();
  const pageUrl = document.getElementById('notion-page-url').value.trim();
  const statusEl = document.getElementById('notion-setup-status');

  if (!apiKey || !pageUrl) {
    statusEl.textContent = 'Please fill in all fields.';
    statusEl.className = 'notion-test-result error';
    return;
  }

  const parentPageId = this._extractNotionPageId(pageUrl);
  if (!parentPageId) {
    statusEl.textContent = 'Could not extract page ID from URL. Copy the full Notion page URL.';
    statusEl.className = 'notion-test-result error';
    return;
  }

  statusEl.textContent = 'Creating database...';
  statusEl.className = 'notion-test-result loading';

  // 1. Create database
  const setupResult = await window.api.notionSetup({ apiKey, parentPageId });
  if (!setupResult.success) {
    statusEl.textContent = `Failed: ${setupResult.error}`;
    statusEl.className = 'notion-test-result error';
    return;
  }

  // 2. Save config
  await window.api.notionSaveConfig({
    apiKey,
    parentPageId,
    databaseId: setupResult.databaseId,
    idMap: {},
  });

  // 3. Run initial sync (push all local tasks)
  statusEl.textContent = 'Syncing tasks...';
  const syncResult = await window.api.notionSync();
  if (syncResult.success) {
    const s = syncResult.summary;
    statusEl.textContent = `Done! ${s.created} pushed, ${s.pulled || 0} pulled.`;
    statusEl.className = 'notion-test-result success';

    // Reload data in case new tasks were pulled
    this.data = await window.api.loadData();

    // Close modal after brief delay
    setTimeout(() => {
      this.closeModal('notion-setup-modal');
      this.loadNotionConfig();
      this.showToast('Notion connected and synced!');
      this.render();
    }, 1500);
  } else {
    statusEl.textContent = `Sync failed: ${syncResult.error}`;
    statusEl.className = 'notion-test-result error';
  }
}

export async function triggerNotionSync() {
  if (this._notionSyncing) return;
  this._notionSyncing = true;
  const syncBtn = document.getElementById('sidebar-notion-sync-btn');
  if (syncBtn) syncBtn.classList.add('syncing');

  // Also disable settings sync button
  const settingsSyncBtn = document.getElementById('notion-sync-btn');
  if (settingsSyncBtn) {
    settingsSyncBtn.disabled = true;
    settingsSyncBtn.textContent = 'Syncing...';
  }

  try {
    const result = await window.api.notionSync();
    if (result.success) {
      const s = result.summary;
      const parts = [];
      if (s.created) parts.push(`${s.created} pushed`);
      if (s.pulled) parts.push(`${s.pulled} pulled`);
      if (s.updated) parts.push(`${s.updated} updated`);
      if (s.deleted) parts.push(`${s.deleted} deleted`);
      const msg = parts.length > 0 ? `Synced: ${parts.join(', ')}` : 'Everything up to date';
      this.showToast(msg, 3000);

      if (s.errors && s.errors.length > 0) {
        console.warn('Sync errors:', s.errors);
      }

      // Reload data in case tasks were pulled from Notion
      this.data = await window.api.loadData();
      this.render();
    } else {
      this.showToast(`Sync failed: ${result.error}`, 4000);
    }
  } catch (err) {
    this.showToast(`Sync error: ${err.message}`, 4000);
  } finally {
    this._notionSyncing = false;
    if (syncBtn) syncBtn.classList.remove('syncing');
    if (settingsSyncBtn) {
      settingsSyncBtn.disabled = false;
      settingsSyncBtn.textContent = 'Sync Now';
    }
    this.loadNotionConfig();
  }
}

export function startNotionAutoSync() {
  // Auto-sync every 5 minutes if connected
  this._notionAutoSyncInterval = setInterval(async () => {
    const config = await window.api.notionGetConfig();
    if (!config.connected) return;
    if (this._notionSyncing) return; // Skip if already syncing

    this._notionSyncing = true;
    try {
      const result = await window.api.notionSync();
      if (result.success) {
        const s = result.summary;
        const hasChanges = s.created || s.pulled || s.updated || s.deleted;
        if (hasChanges) {
          const parts = [];
          if (s.created) parts.push(`${s.created} pushed`);
          if (s.pulled) parts.push(`${s.pulled} pulled`);
          if (s.updated) parts.push(`${s.updated} updated`);
          if (s.deleted) parts.push(`${s.deleted} deleted`);
          this.showToast(`Auto-synced: ${parts.join(', ')}`, 3000);
          this.data = await window.api.loadData();
          this.render();
        }
        this.loadNotionConfig();
      }
    } catch (err) {
      console.error('Auto-sync error:', err);
    } finally {
      this._notionSyncing = false;
    }
  }, 5 * 60 * 1000); // 5 minutes
}

export async function disconnectNotion() {
  await window.api.notionSaveConfig({
    apiKey: null,
    databaseId: null,
    parentPageId: null,
    lastSyncAt: null,
    idMap: null,
  });
  this.loadNotionConfig();
  this.showToast('Notion disconnected');
}
