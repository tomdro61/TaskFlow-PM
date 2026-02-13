// renderer/modals.js — Modal management, toasts, dialogs, context menus, snooze

export function openModal(modalId) {
  document.getElementById(modalId).classList.add('open');
}

export function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

export function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

export function showToast(message, duration = 2000) {
  // Remove existing toast if any
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showErrorBanner(message) {
  const existing = document.querySelector('.error-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.innerHTML = `
    <span>${this.escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:18px;">&times;</button>
  `;
  banner.style.cssText = 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;font-size:14px;';
  document.body.prepend(banner);
}

export function showConfirmDialog(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;

  const okBtn = document.getElementById('confirm-ok');
  const cancelBtn = document.getElementById('confirm-cancel');

  const handleOk = () => {
    onConfirm();
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

export function showContextMenu(e, task) {
  e.preventDefault();
  this.hideContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.id = 'context-menu';
  menu.innerHTML = `
    <div class="context-menu-item" data-action="edit">
      <span class="context-menu-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </span>
      <span class="context-menu-label">Edit Task</span>
      <span class="context-menu-shortcut">E</span>
    </div>
    <div class="context-menu-item" data-action="schedule">
      <span class="context-menu-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </span>
      <span class="context-menu-label">Schedule...</span>
      <span class="context-menu-shortcut">S</span>
    </div>
    <div class="context-menu-item context-menu-has-submenu" data-action="priority">
      <span class="context-menu-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </span>
      <span class="context-menu-label">Set Priority</span>
      <span class="context-menu-arrow">&#9656;</span>
      <div class="context-submenu">
        <div class="context-submenu-item" data-priority="urgent">
          <span class="context-priority-dot urgent"></span>
          <span>Urgent</span>
        </div>
        <div class="context-submenu-item" data-priority="high">
          <span class="context-priority-dot high"></span>
          <span>High</span>
        </div>
        <div class="context-submenu-item" data-priority="medium">
          <span class="context-priority-dot medium"></span>
          <span>Medium</span>
        </div>
        <div class="context-submenu-item" data-priority="low">
          <span class="context-priority-dot low"></span>
          <span>Low</span>
        </div>
        <div class="context-submenu-item" data-priority="none">
          <span class="context-priority-dot none"></span>
          <span>None</span>
        </div>
      </div>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="complete">
      <span class="context-menu-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </span>
      <span class="context-menu-label">${task.status === 'done' ? 'Mark Incomplete' : 'Mark Complete'}</span>
      <span class="context-menu-shortcut">Space</span>
    </div>
    <div class="context-menu-item" data-action="duplicate">
      <span class="context-menu-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </span>
      <span class="context-menu-label">Duplicate</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item context-menu-danger" data-action="delete">
      <span class="context-menu-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </span>
      <span class="context-menu-label">Delete</span>
      <span class="context-menu-shortcut">Del</span>
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

  // Store current task for actions
  this.contextMenuTask = task;

  // Bind actions
  menu.querySelectorAll('.context-menu-item[data-action]').forEach(item => {
    item.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const action = item.dataset.action;
      if (action !== 'priority') {
        this.handleContextAction(action, task);
        this.hideContextMenu();
      }
    });
  });

  // Bind priority submenu
  menu.querySelectorAll('.context-submenu-item[data-priority]').forEach(item => {
    item.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const priority = item.dataset.priority;
      this.updateTask(task.id, { priority });
      this.hideContextMenu();
      this.render();
    });
  });

  // Close on click outside
  setTimeout(() => {
    const closeHandler = (ev) => {
      if (!menu.contains(ev.target)) {
        this.hideContextMenu();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 0);

  // Close on Escape
  const escHandler = (ev) => {
    if (ev.key === 'Escape') {
      this.hideContextMenu();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  if (menu) {
    menu.remove();
  }
  this.contextMenuTask = null;
}

export function handleContextAction(action, task) {
  switch (action) {
    case 'edit':
      this.openTaskModal(task.id);
      break;
    case 'schedule':
      this.openTaskModal(task.id);
      // Could implement a dedicated schedule modal in future
      break;
    case 'complete':
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      this.updateTask(task.id, { status: newStatus });
      this.render();
      break;
    case 'duplicate':
      this.duplicateTask(task);
      break;
    case 'delete':
      if (confirm(`Delete "${task.name}"?`)) {
        this.deleteTask(task.id);
        this.render();
      }
      break;
  }
}

export function openSnoozePopup(taskId) {
  const task = this.findTask(taskId);
  if (!task) return;

  this._snoozeTaskId = taskId;

  const overlay = document.getElementById('snooze-popup');
  const datePicker = document.getElementById('snooze-date-picker');
  if (!overlay) return;

  // Reset date picker
  datePicker.style.display = 'none';
  datePicker.value = '';

  // Show popup with animation
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('visible'));

  // Bind events once
  if (!this._snoozePopupBound) {
    this._snoozePopupBound = true;

    // Click on option buttons
    overlay.querySelectorAll('.snooze-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleSnoozeAction(btn.dataset.action);
      });
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeSnoozePopup();
    });

    // Date picker change
    datePicker.addEventListener('change', () => {
      if (datePicker.value) {
        this.rescheduleTask(this._snoozeTaskId, datePicker.value);
        this.closeSnoozePopup();
      }
    });

    // Keyboard handler
    document.addEventListener('keydown', (e) => {
      if (!this._snoozeTaskId) return;
      const popup = document.getElementById('snooze-popup');
      if (!popup || popup.style.display === 'none') return;

      switch (e.key.toLowerCase()) {
        case 'escape':
          e.preventDefault();
          e.stopPropagation();
          this.closeSnoozePopup();
          break;
        case 't':
          e.preventDefault();
          e.stopPropagation();
          this.handleSnoozeAction('tomorrow');
          break;
        case 'n':
          e.preventDefault();
          e.stopPropagation();
          this.handleSnoozeAction('next-week');
          break;
        case 'd':
          e.preventDefault();
          e.stopPropagation();
          this.handleSnoozeAction('pick-date');
          break;
        case 'r':
          e.preventDefault();
          e.stopPropagation();
          this.handleSnoozeAction('remove');
          break;
        case 's':
          e.preventDefault();
          e.stopPropagation();
          this.handleSnoozeAction('today');
          break;
      }
    }, true); // capture phase so it fires before other handlers
  }
}

export function closeSnoozePopup() {
  const overlay = document.getElementById('snooze-popup');
  if (!overlay) return;

  overlay.classList.remove('visible');
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 200);

  this._snoozeTaskId = null;
}

export function handleSnoozeAction(action) {
  const taskId = this._snoozeTaskId;
  if (!taskId) return;

  if (action === 'pick-date') {
    const datePicker = document.getElementById('snooze-date-picker');
    datePicker.style.display = 'block';
    datePicker.focus();
    datePicker.showPicker?.();
    return;
  }

  let targetDate = null;

  if (action === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    targetDate = this.getLocalDateString(d);
  } else if (action === 'next-week') {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    targetDate = this.getLocalDateString(d);
  } else if (action === 'today') {
    targetDate = this.getLocalDateString();
  } else if (action === 'remove') {
    targetDate = null;
  }

  this.rescheduleTask(taskId, targetDate);
  this.closeSnoozePopup();
}

export function rescheduleTask(taskId, newDate) {
  const task = this.findTask(taskId);
  const updates = { scheduledDate: newDate, scheduledTime: null };

  // Track snooze count when rescheduling to a different date (not removing)
  if (newDate && task) {
    updates.snoozeCount = (task.snoozeCount || 0) + 1;
  }

  this.updateTask(taskId, updates);

  if (newDate) {
    const count = updates.snoozeCount || 0;
    const suffix = count > 1 ? ` (snoozed ${count}x)` : '';
    this.showToast(`Rescheduled to ${newDate}${suffix}`);
  } else {
    this.showToast('Schedule removed');
  }

  this.render();
}

export function showBlockerReasonPopup(taskId, onComplete) {
  const overlay = document.getElementById('blocker-popup');
  if (!overlay) return;

  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const close = () => {
    overlay.classList.remove('visible');
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
  };

  // One-time binding
  if (!this._blockerPopupBound) {
    this._blockerPopupBound = true;

    overlay.querySelectorAll('.blocker-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._blockerTaskId) return;
        const reason = btn.dataset.reason;
        this.updateTask(this._blockerTaskId, { status: 'waiting', waitingReason: reason });
        this.showToast(`Marked waiting \u2014 ${reason}`);
        close();
        if (this._blockerCallback) this._blockerCallback();
      });
    });

    document.getElementById('blocker-skip').addEventListener('click', () => {
      if (!this._blockerTaskId) return;
      this.updateTask(this._blockerTaskId, { status: 'waiting' });
      this.showToast('Marked waiting');
      close();
      if (this._blockerCallback) this._blockerCallback();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
        this._blockerTaskId = null;
      }
    });
  }

  this._blockerTaskId = taskId;
  this._blockerCallback = onComplete;
}
