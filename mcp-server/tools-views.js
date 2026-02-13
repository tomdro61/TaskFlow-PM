import { getAllTasks, findTask, formatTaskForDisplay } from "./data.js";

export function getToolDefinitions() {
  return [
    {
      name: "get_today_tasks",
      description: "Get tasks due today. Perfect for daily planning.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_overdue_tasks",
      description: "Get overdue tasks that need attention.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_upcoming_tasks",
      description: "Get tasks due in the next 7 days.",
      inputSchema: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Number of days to look ahead. Default: 7",
          },
        },
      },
    },
    {
      name: "get_projects",
      description: "Get all projects with task counts.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_inbox_tasks",
      description: "Get all unorganized tasks from the Inbox. These are brain dumps that need processing.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_ready_tasks",
      description: "Get tasks that are ready to work on. Can filter by status 'ready' or get top prioritized tasks (replaces get_focus_queue).",
      inputSchema: {
        type: "object",
        properties: {
          projectName: {
            type: "string",
            description: "Optional: Filter by project name",
          },
          highPriorityOnly: {
            type: "boolean",
            description: "If true, returns top 5 prioritized tasks based on urgency, priority, schedule (focus queue mode)",
          },
          limit: {
            type: "number",
            description: "Maximum number of tasks to return. Default: all for ready tasks, 5 for focus queue",
          },
        },
      },
    },
    {
      name: "get_scheduled_tasks",
      description: "Get all tasks scheduled for a specific date, ordered by scheduled time.",
      inputSchema: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format. Defaults to today.",
          },
        },
      },
    },
    {
      name: "get_calendar_view",
      description: "Get a calendar view of tasks and accomplishments for a date range.",
      inputSchema: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          endDate: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
        },
      },
    },
  ];
}

export function handleTool(name, args, { loadData, saveData }) {
  switch (name) {
    case "get_today_tasks": {
      const data = loadData();
      const today = new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data).filter(
        (t) => t.dueDate === today && t.status !== "done"
      );

      if (tasks.length === 0) {
        return {
          content: [{ type: "text", text: "No tasks due today! Consider working on high-priority items or upcoming tasks." }],
        };
      }

      let output = `## Tasks Due Today (${tasks.length})\n\n`;
      tasks.forEach((task) => {
        const project = data.projects.find((p) => p.id === task.projectId);
        output += formatTaskForDisplay(task, project, data.tags) + `\n  ID: ${task.id}\n`;
      });

      return { content: [{ type: "text", text: output }] };
    }

    case "get_overdue_tasks": {
      const data = loadData();
      const today = new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data).filter(
        (t) => t.dueDate && t.dueDate < today && t.status !== "done"
      );

      if (tasks.length === 0) {
        return { content: [{ type: "text", text: "No overdue tasks! You're on track." }] };
      }

      let output = `## Overdue Tasks (${tasks.length})\n\n`;
      tasks
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .forEach((task) => {
          const project = data.projects.find((p) => p.id === task.projectId);
          output += formatTaskForDisplay(task, project, data.tags) + `\n  ID: ${task.id}\n`;
        });

      return { content: [{ type: "text", text: output }] };
    }

    case "get_upcoming_tasks": {
      const data = loadData();
      const days = args?.days || 7;
      const today = new Date();
      const future = new Date(today);
      future.setDate(future.getDate() + days);

      const todayStr = today.toISOString().split("T")[0];
      const futureStr = future.toISOString().split("T")[0];

      const tasks = getAllTasks(data).filter(
        (t) => t.dueDate && t.dueDate >= todayStr && t.dueDate <= futureStr && t.status !== "done"
      );

      if (tasks.length === 0) {
        return { content: [{ type: "text", text: `No tasks due in the next ${days} days.` }] };
      }

      let output = `## Upcoming Tasks - Next ${days} Days (${tasks.length})\n\n`;
      tasks
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .forEach((task) => {
          const project = data.projects.find((p) => p.id === task.projectId);
          output += formatTaskForDisplay(task, project, data.tags) + `\n  ID: ${task.id}\n`;
        });

      return { content: [{ type: "text", text: output }] };
    }

    case "get_projects": {
      const data = loadData();
      const projects = data.projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color,
        totalTasks: p.tasks.length,
        activeTasks: p.tasks.filter((t) => t.status !== "done").length,
        isInbox: p.isInbox || false,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
      };
    }

    case "get_inbox_tasks": {
      const data = loadData();
      const inbox = data.projects.find(p => p.isInbox || p.id === "inbox");
      if (!inbox || inbox.tasks.length === 0) {
        return { content: [{ type: "text", text: "Inbox is empty! No unorganized tasks." }] };
      }

      const pendingTasks = inbox.tasks.filter(t => t.status !== "done");

      let output = `## Inbox (${pendingTasks.length} unorganized tasks)\n\n`;
      output += `These are brain dumps that may need processing:\n\n`;

      pendingTasks.forEach(t => {
        output += `### ${t.name}\n`;
        output += `ID: ${t.id}\n`;
        if (t.context) {
          output += `Context: ${t.context.substring(0, 200)}${t.context.length > 200 ? '...' : ''}\n`;
        }
        output += `Created: ${t.createdAt.split('T')[0]}\n\n`;
      });

      return { content: [{ type: "text", text: output }] };
    }

    case "get_ready_tasks": {
      const data = loadData();
      const today = new Date().toISOString().split("T")[0];

      // Focus queue mode - prioritized top tasks
      if (args?.highPriorityOnly) {
        let tasks = getAllTasks(data).filter(t => t.status !== "done");

        if (tasks.length === 0) {
          return { content: [{ type: "text", text: "No active tasks! Time to add some or take a break." }] };
        }

        // Score tasks for prioritization
        const scored = tasks.map(task => {
          let score = 0;

          // Scheduled for today with time = highest priority
          if (task.scheduledDate === today && task.scheduledTime) {
            score += 200;
            // Earlier scheduled times get higher priority
            const [h, m] = task.scheduledTime.split(":").map(Number);
            score += (24 * 60 - (h * 60 + m)) / 10;
          }

          // Overdue
          if (task.dueDate && task.dueDate < today) score += 100;

          // Due today (but not scheduled)
          if (task.dueDate === today && !task.scheduledTime) score += 50;

          // Priority
          if (task.priority === "urgent") score += 40;
          if (task.priority === "high") score += 30;
          if (task.status === "in-progress") score += 20;
          if (task.priority === "medium") score += 10;
          if (task.status === "ready") score += 5;

          return { task, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const limit = args.limit || 5;
        const topTasks = scored.slice(0, limit);

        let output = `## Focus Queue (Top ${limit})\n\n`;
        topTasks.forEach((item, index) => {
          const t = item.task;
          const project = data.projects.find(p => p.id === t.projectId);

          output += `### ${index + 1}. ${t.name}\n`;
          output += `ID: ${t.id}\n`;
          if (t.scheduledTime) output += `Scheduled: ${t.scheduledTime}`;
          if (t.estimatedMinutes) output += ` (${t.estimatedMinutes}m)`;
          if (t.scheduledTime) output += `\n`;
          if (t.priority !== "none") output += `Priority: ${t.priority}\n`;
          if (t.dueDate) output += `Due: ${t.dueDate}\n`;
          if (project && !project.isInbox) output += `Project: ${project.name}\n`;
          output += `\n`;
        });

        return { content: [{ type: "text", text: output }] };
      }

      // Standard mode - tasks with status 'ready'
      let tasks = getAllTasks(data).filter(t => t.status === "ready");

      if (args?.projectName) {
        tasks = tasks.filter(t => {
          const project = data.projects.find(p => p.tasks.some(pt => pt.id === t.id));
          return project?.name.toLowerCase().includes(args.projectName.toLowerCase());
        });
      }

      if (args?.limit) {
        tasks = tasks.slice(0, args.limit);
      }

      if (tasks.length === 0) {
        return { content: [{ type: "text", text: "No tasks with 'ready' status found." }] };
      }

      let output = `## Ready Tasks (${tasks.length})\n\n`;
      output += `These tasks are clarified and ready to work on:\n\n`;

      tasks.forEach(task => {
        const project = data.projects.find(p => p.tasks.some(t => t.id === task.id));
        output += `**${task.name}**\n`;
        output += `  ID: ${task.id}\n`;
        if (task.priority !== "none") output += `  Priority: ${task.priority}\n`;
        if (task.dueDate) output += `  Due: ${task.dueDate}\n`;
        if (project && !project.isInbox) output += `  Project: ${project.name}\n`;
        if (task.estimatedMinutes) output += `  Estimated: ${task.estimatedMinutes}m\n`;
        output += `\n`;
      });

      return { content: [{ type: "text", text: output }] };
    }

    case "get_scheduled_tasks": {
      const data = loadData();
      const targetDate = args?.date || new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data);

      const scheduledTasks = tasks
        .filter(t => t.scheduledDate === targetDate && t.scheduledTime && t.status !== "done")
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

      if (scheduledTasks.length === 0) {
        return { content: [{ type: "text", text: `No tasks scheduled for ${targetDate}` }] };
      }

      let output = `## Scheduled Tasks for ${targetDate}\n\n`;
      let totalMinutes = 0;

      scheduledTasks.forEach(task => {
        const project = data.projects.find(p => p.id === task.projectId);
        const duration = task.estimatedMinutes || 30;
        totalMinutes += duration;

        // Calculate end time
        const [hours, mins] = task.scheduledTime.split(":").map(Number);
        const endMins = hours * 60 + mins + duration;
        const endHour = Math.floor(endMins / 60) % 24;
        const endMin = endMins % 60;
        const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

        output += `**${task.scheduledTime} - ${endTime}** (${duration}m)\n`;
        output += `  ${task.name}`;
        if (task.priority !== "none") output += ` !${task.priority}`;
        if (project && !project.isInbox) output += ` [${project.name}]`;
        output += `\n  ID: ${task.id}\n\n`;
      });

      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      output += `---\n**Total scheduled:** ${scheduledTasks.length} tasks, ${hours}h ${mins}m\n`;

      return { content: [{ type: "text", text: output }] };
    }

    case "get_calendar_view": {
      const data = loadData();
      const today = new Date();
      const startDate = args?.startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      const endDate = args?.endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

      const tasks = getAllTasks(data);

      // Build day-by-day view
      const days = {};
      let currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split("T")[0];
        days[dateStr] = {
          completed: [],
          due: [],
          timeLogged: 0,
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Fill in data
      tasks.forEach((t) => {
        // Completed tasks
        if (t.completedAt) {
          const completed = t.completedAt.split("T")[0];
          if (days[completed]) {
            days[completed].completed.push(t.name);
          }
        }

        // Due tasks (not completed)
        if (t.dueDate && t.status !== "done" && days[t.dueDate]) {
          days[t.dueDate].due.push(t.name);
        }

        // Time logged
        if (t.timeLog) {
          t.timeLog.forEach((entry) => {
            const logDate = entry.loggedAt.split("T")[0];
            if (days[logDate]) {
              days[logDate].timeLogged += entry.minutes;
            }
          });
        }
      });

      let output = `## Calendar View: ${startDate} to ${endDate}\n\n`;

      Object.entries(days).forEach(([date, info]) => {
        const hasActivity = info.completed.length > 0 || info.due.length > 0 || info.timeLogged > 0;
        if (hasActivity) {
          const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
          output += `### ${date} (${dayName})\n`;

          if (info.completed.length > 0) {
            output += `✓ Completed: ${info.completed.join(", ")}\n`;
          }
          if (info.due.length > 0) {
            output += `📅 Due: ${info.due.join(", ")}\n`;
          }
          if (info.timeLogged > 0) {
            const h = Math.floor(info.timeLogged / 60);
            const m = info.timeLogged % 60;
            output += `⏱ Time: ${h}h ${m}m\n`;
          }
          output += `\n`;
        }
      });

      return { content: [{ type: "text", text: output }] };
    }

    default:
      return null;
  }
}
