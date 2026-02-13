import fs from "fs";
import path from "path";
import os from "os";

// Data file path - same location as Electron app
export const DATA_FILE = path.join(
  process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
  "taskflow-pm",
  "taskflow-data.json"
);

export function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
  return { projects: [], tags: [], settings: {} };
}

export function saveData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving data:", error);
    return false;
  }
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Async mutex to serialize data operations and prevent data loss from parallel tool calls
let _lockPromise = Promise.resolve();
export function withLock(fn) {
  const prev = _lockPromise;
  let resolve;
  _lockPromise = new Promise((r) => { resolve = r; });
  return prev.then(() => fn()).finally(resolve);
}

export function getAllTasks(data) {
  const tasks = [];
  for (const project of data.projects) {
    for (const task of project.tasks) {
      tasks.push({
        ...task,
        projectId: project.id,
        projectName: project.name,
      });
    }
  }
  return tasks;
}

export function findTask(data, taskId) {
  for (const project of data.projects) {
    const task = project.tasks.find((t) => t.id === taskId);
    if (task) return { task, project };
    for (const t of project.tasks) {
      const subtask = t.subtasks?.find((st) => st.id === taskId);
      if (subtask) return { task: subtask, parentTask: t, project };
    }
  }
  return null;
}

export function formatTaskForDisplay(task, project, tags) {
  const tagNames = task.tags
    ?.map((tagId) => {
      const tag = tags.find((t) => t.id === tagId);
      return tag ? `#${tag.name}` : null;
    })
    .filter(Boolean)
    .join(" ");

  let display = `- [${task.status === "done" ? "x" : " "}] ${task.name}`;
  if (task.priority && task.priority !== "none") display += ` !${task.priority}`;
  if (task.dueDate) display += ` (due: ${task.dueDate})`;
  if (tagNames) display += ` ${tagNames}`;
  if (project && !project.isInbox) display += ` [${project.name}]`;

  return display;
}
