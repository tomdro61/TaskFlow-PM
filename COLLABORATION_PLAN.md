# TaskFlow PM - Collaboration & Cloud Sync Plan

**Created:** February 4, 2026
**Status:** Future Implementation
**Priority:** When ready to scale beyond personal use

---

## Overview

Transform TaskFlow PM from a local Electron app to a cloud-synced, collaborative task management system while maintaining the MCP integration and local-first philosophy.

---

## Phase 1: Supabase Backend Setup

**Effort:** 1-2 days
**Cost:** Free tier (500MB database, 1GB file storage)

### 1.1 Create Supabase Project
- Sign up at supabase.com
- Create new project "taskflow-pm"
- Get API keys (anon key, service role key)

### 1.2 Database Schema

```sql
-- Users (handled by Supabase Auth)

-- Projects table
create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  color text default '#6366f1',
  owner_id uuid references auth.users(id),
  is_shared boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  description text,
  context text,  -- brain dump content
  status text default 'todo',
  priority text default 'none',
  due_date date,
  scheduled_date date,
  scheduled_time time,
  estimated_minutes integer,
  assigned_to text,  -- 'claude', 'vin', or user_id
  execution_type text default 'manual',
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id),
  sort_order integer default 0
);

-- Subtasks table
create table subtasks (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade,
  name text not null,
  status text default 'todo',
  assigned_to text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  sort_order integer default 0
);

-- Project members (for sharing)
create table project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id),
  role text default 'member',  -- 'owner', 'admin', 'member', 'viewer'
  invited_at timestamptz default now(),
  accepted_at timestamptz
);

-- Daily notes
create table daily_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  date date not null,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Recap entries
create table recap_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  type text not null,  -- 'accomplishment', 'decision', 'note'
  content text not null,
  date date not null,
  related_task_id uuid references tasks(id),
  tags text[],
  created_at timestamptz default now()
);
```

### 1.3 Row Level Security (RLS)

```sql
-- Enable RLS
alter table projects enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;

-- Projects: owner or member can access
create policy "Users can view own and shared projects"
  on projects for select
  using (
    owner_id = auth.uid() or
    id in (select project_id from project_members where user_id = auth.uid())
  );

-- Tasks: project access determines task access
create policy "Users can view tasks in accessible projects"
  on tasks for select
  using (
    project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid()
    )
  );
```

---

## Phase 2: Electron App Integration

**Effort:** 2-3 days

### 2.1 Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2.2 Create Supabase Client

```javascript
// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://your-project.supabase.co'
const supabaseAnonKey = 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 2.3 Sync Strategy: Local-First with Cloud Backup

```javascript
// Hybrid approach:
// 1. Always read/write to local JSON first (fast, offline-capable)
// 2. Sync to Supabase in background
// 3. Pull changes from Supabase on app start

class SyncManager {
  constructor() {
    this.pendingChanges = []
    this.lastSyncTime = null
  }

  async syncToCloud(data) {
    // Debounced sync to Supabase
  }

  async pullFromCloud() {
    // Fetch changes since lastSyncTime
  }

  async resolveConflicts(local, remote) {
    // Last-write-wins or merge strategy
  }
}
```

### 2.4 Authentication Flow

```javascript
// Add to renderer.js or new auth.js

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data.user
}

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })
  if (error) throw error
  return data.user
}

// Magic link option (no password)
async function signInWithMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw error
}
```

---

## Phase 3: Real-time Collaboration

**Effort:** 2-3 days

### 3.1 Supabase Real-time Subscriptions

```javascript
// Subscribe to task changes in a project
const subscription = supabase
  .channel('project-tasks')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `project_id=eq.${projectId}`
    },
    (payload) => {
      // Update local state
      handleTaskChange(payload)
    }
  )
  .subscribe()
```

### 3.2 Presence (Who's Online)

```javascript
// Show who's viewing the same project
const presenceChannel = supabase.channel('project-presence')

presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState()
    updateOnlineUsers(state)
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        user_id: currentUser.id,
        user_name: currentUser.name,
        online_at: new Date().toISOString()
      })
    }
  })
```

---

## Phase 4: Sharing & Permissions

**Effort:** 1-2 days

### 4.1 Share Project Modal

```html
<!-- Add to index.html -->
<div class="modal" id="share-project-modal">
  <div class="modal-content">
    <h3>Share Project</h3>
    <input type="email" placeholder="Enter email address">
    <select>
      <option value="viewer">Can View</option>
      <option value="member">Can Edit</option>
      <option value="admin">Admin</option>
    </select>
    <button>Send Invite</button>

    <h4>Current Members</h4>
    <div id="project-members-list"></div>
  </div>
</div>
```

### 4.2 Permission Levels

| Role | View | Edit | Delete | Invite | Settings |
|------|------|------|--------|--------|----------|
| Viewer | ✓ | - | - | - | - |
| Member | ✓ | ✓ | Own | - | - |
| Admin | ✓ | ✓ | ✓ | ✓ | - |
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Phase 5: MCP Server Updates

**Effort:** 1 day

### 5.1 Update MCP to Use Supabase

```javascript
// mcp-server/index.js updates

import { supabase } from './supabase.js'

// Replace file-based loadData/saveData with Supabase queries

async function loadData() {
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      tasks (
        *,
        subtasks (*)
      )
    `)

  return { projects }
}

async function saveTask(task) {
  const { data, error } = await supabase
    .from('tasks')
    .upsert(task)
    .select()

  return data
}
```

### 5.2 New MCP Tools for Collaboration

```javascript
// New tools to add:
{
  name: "share_project",
  description: "Share a project with another user by email"
},
{
  name: "get_shared_projects",
  description: "Get projects shared with me"
},
{
  name: "get_project_members",
  description: "Get members of a project"
},
{
  name: "assign_task_to_user",
  description: "Assign a task to a specific user"
}
```

---

## Phase 6: Offline Support

**Effort:** 1-2 days

### 6.1 Service Worker for Offline

```javascript
// Keep local JSON as source of truth
// Queue changes when offline
// Sync when back online

class OfflineQueue {
  constructor() {
    this.queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
  }

  add(operation) {
    this.queue.push({
      ...operation,
      timestamp: Date.now()
    })
    this.persist()
  }

  async flush() {
    while (this.queue.length > 0) {
      const op = this.queue[0]
      try {
        await this.execute(op)
        this.queue.shift()
        this.persist()
      } catch (e) {
        break // Stop on first error
      }
    }
  }
}
```

---

## UI Changes Required

### New UI Elements

1. **Auth screens** - Login, signup, forgot password
2. **User menu** - Profile, logout, sync status
3. **Share button** - On project headers
4. **Member avatars** - Show who's in a shared project
5. **Online indicator** - Who's currently viewing
6. **Sync status** - Icon showing sync state (synced, syncing, offline)
7. **Conflict resolution modal** - When same task edited by multiple users

### Settings Additions

```
Account
├── Email
├── Change Password
├── Delete Account
└── Export All Data

Sync
├── Auto-sync (on/off)
├── Sync frequency
├── Offline mode
└── Clear local cache

Sharing Defaults
├── Default permission for new shares
└── Allow members to invite others
```

---

## Migration Path

### For Existing Users

1. **First launch after update:**
   - Prompt: "Sign in to enable sync" or "Continue offline"
   - If sign in: upload local data to Supabase
   - Keep local JSON as backup

2. **Data migration script:**
   ```javascript
   async function migrateLocalToCloud(localData, userId) {
     // Create projects
     for (const project of localData.projects) {
       const { data: newProject } = await supabase
         .from('projects')
         .insert({ ...project, owner_id: userId })
         .select()

       // Create tasks
       for (const task of project.tasks) {
         await supabase
           .from('tasks')
           .insert({ ...task, project_id: newProject.id })
       }
     }
   }
   ```

---

## Cost Estimate (Supabase)

| Tier | Price | Limits |
|------|-------|--------|
| Free | $0/mo | 500MB DB, 1GB storage, 2GB bandwidth |
| Pro | $25/mo | 8GB DB, 100GB storage, 50GB bandwidth |
| Team | $599/mo | Unlimited + SOC2, SSO |

**For personal/small team use: Free tier is plenty**

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Supabase Setup | 1-2 days | None |
| Phase 2: Electron Integration | 2-3 days | Phase 1 |
| Phase 3: Real-time | 2-3 days | Phase 2 |
| Phase 4: Sharing UI | 1-2 days | Phase 2 |
| Phase 5: MCP Updates | 1 day | Phase 2 |
| Phase 6: Offline | 1-2 days | Phase 2 |

**Total: ~10-14 days of development**

---

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Firebase** | Google ecosystem, generous free tier | Vendor lock-in, complex pricing |
| **Appwrite** | Open source, self-hostable | Smaller community |
| **PocketBase** | Single binary, SQLite | Less scalable |
| **Custom Backend** | Full control | More work to build |

**Winner: Supabase** - Best balance of features, free tier, and developer experience.

---

## Questions to Answer Before Starting

1. Do you want user accounts or just device-based sync?
2. Should shared projects have comments/chat?
3. Do you need audit logs (who changed what)?
4. Should Claude assignments sync across users?
5. Mobile app planned? (Supabase works great with React Native)

---

*This plan can be revisited and adjusted as needs evolve.*
