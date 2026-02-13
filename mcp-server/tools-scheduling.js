import { getAllTasks, findTask } from "./data.js";

export function getToolDefinitions() {
  return [
    {
      name: "set_scheduled_time",
      description: "Schedule a task for a specific time slot. Sets when the task should be worked on.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to schedule",
          },
          scheduledTime: {
            type: "string",
            description: "Time in HH:MM format (24-hour), e.g., '09:00', '14:30'",
          },
          scheduledDate: {
            type: "string",
            description: "Date in YYYY-MM-DD format. Defaults to today if not provided.",
          },
          estimatedMinutes: {
            type: "number",
            description: "Estimated duration in minutes. Suggested values: 15, 30, 45, 60, 90, 120",
          },
        },
        required: ["taskId", "scheduledTime"],
      },
    },
    {
      name: "clear_scheduled_time",
      description: "Remove the scheduled time from a task.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to unschedule",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "bulk_schedule_today",
      description: "Schedule multiple tasks for today with time slots. Efficient batch scheduling.",
      inputSchema: {
        type: "object",
        properties: {
          schedule: {
            type: "array",
            items: {
              type: "object",
              properties: {
                taskId: { type: "string" },
                scheduledTime: { type: "string", description: "HH:MM format" },
                estimatedMinutes: { type: "number" },
              },
              required: ["taskId", "scheduledTime"],
            },
            description: "Array of tasks to schedule with their time slots",
          },
        },
        required: ["schedule"],
      },
    },
    {
      name: "set_waiting_reason",
      description: "Set or update the reason why a task is blocked/waiting.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task",
          },
          reason: {
            type: "string",
            description: "Reason why the task is waiting/blocked (e.g., 'Waiting for client feedback', 'Blocked by API issue')",
          },
          blockedBy: {
            type: "string",
            description: "Optional: Who/what is blocking this task",
          },
        },
        required: ["taskId", "reason"],
      },
    },
    {
      name: "get_planning_context",
      description: "Get comprehensive context for day planning: overdue tasks, unscheduled high-priority items, yesterday's incomplete tasks, and available time slots.",
      inputSchema: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to plan for in YYYY-MM-DD format. Defaults to today.",
          },
        },
      },
    },
    {
      name: "suggest_day_schedule",
      description: "Generate a time-blocked schedule for the day based on task priorities, durations, and available time.",
      inputSchema: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to schedule in YYYY-MM-DD format. Defaults to today.",
          },
          startHour: {
            type: "number",
            description: "Hour to start scheduling (0-23). Defaults to 9.",
          },
          endHour: {
            type: "number",
            description: "Hour to end scheduling (0-23). Defaults to 18.",
          },
          taskIds: {
            type: "array",
            items: { type: "string" },
            description: "Optional: Specific task IDs to schedule. If not provided, uses top priority tasks.",
          },
        },
      },
    },
  ];
}

export function handleTool(name, args, { loadData, saveData }) {
  switch (name) {
    case "set_scheduled_time": {
      const data = loadData();
      if (!args?.taskId || !args?.scheduledTime) {
        return { content: [{ type: "text", text: "Error: taskId and scheduledTime are required" }] };
      }

      // Validate time format
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(args.scheduledTime)) {
        return { content: [{ type: "text", text: "Error: scheduledTime must be in HH:MM format (e.g., '09:00', '14:30')" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      const today = new Date().toISOString().split("T")[0];

      task.scheduledTime = args.scheduledTime;
      task.scheduledDate = args.scheduledDate || today;
      if (args.estimatedMinutes) {
        task.estimatedMinutes = args.estimatedMinutes;
      }

      // If task doesn't have a due date, set it to the scheduled date
      if (!task.dueDate) {
        task.dueDate = task.scheduledDate;
      }

      saveData(data);

      let output = `Scheduled "${task.name}" for ${task.scheduledTime} on ${task.scheduledDate}`;
      if (task.estimatedMinutes) {
        output += ` (${task.estimatedMinutes} min estimated)`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "clear_scheduled_time": {
      const data = loadData();
      if (!args?.taskId) {
        return { content: [{ type: "text", text: "Error: taskId is required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      delete task.scheduledTime;
      delete task.scheduledDate;

      saveData(data);

      return { content: [{ type: "text", text: `Cleared scheduled time for "${task.name}"` }] };
    }

    case "bulk_schedule_today": {
      const data = loadData();
      if (!args?.schedule || !Array.isArray(args.schedule)) {
        return { content: [{ type: "text", text: "Error: schedule array is required" }] };
      }

      const today = new Date().toISOString().split("T")[0];
      const results = [];
      const errors = [];

      for (const item of args.schedule) {
        if (!item.taskId || !item.scheduledTime) {
          errors.push(`Invalid schedule item: missing taskId or scheduledTime`);
          continue;
        }

        const result = findTask(data, item.taskId);
        if (!result) {
          errors.push(`Task ${item.taskId} not found`);
          continue;
        }

        const { task } = result;
        task.scheduledTime = item.scheduledTime;
        task.scheduledDate = today;
        if (item.estimatedMinutes) {
          task.estimatedMinutes = item.estimatedMinutes;
        }
        if (!task.dueDate) {
          task.dueDate = today;
        }

        results.push(`${task.scheduledTime} - ${task.name}${item.estimatedMinutes ? ` (${item.estimatedMinutes}m)` : ''}`);
      }

      saveData(data);

      let output = `## Bulk Schedule Results for ${today}\n\n`;

      if (results.length > 0) {
        output += `### Scheduled (${results.length})\n`;
        results.forEach(r => output += `- ${r}\n`);
      }

      if (errors.length > 0) {
        output += `\n### Errors (${errors.length})\n`;
        errors.forEach(e => output += `- ${e}\n`);
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "set_waiting_reason": {
      const data = loadData();
      if (!args?.taskId || !args?.reason) {
        return { content: [{ type: "text", text: "Error: taskId and reason are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      task.waitingReason = args.reason;
      if (args.blockedBy) {
        task.blockedBy = args.blockedBy;
      }

      // Automatically set status to waiting if not already
      if (task.status !== "waiting") {
        task.status = "waiting";
      }

      saveData(data);

      let output = `Updated "${task.name}":\n`;
      output += `- Status: waiting\n`;
      output += `- Reason: ${args.reason}\n`;
      if (args.blockedBy) {
        output += `- Blocked by: ${args.blockedBy}\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "get_planning_context": {
      const data = loadData();
      const targetDate = args?.date || new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data);
      const yesterday = new Date(targetDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Overdue tasks
      const overdue = tasks.filter(t =>
        t.status !== "done" && t.dueDate && t.dueDate < targetDate
      ).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      // Unscheduled high-priority
      const unscheduledHighPriority = tasks.filter(t =>
        t.status !== "done" &&
        !t.scheduledTime &&
        (t.priority === "urgent" || t.priority === "high")
      );

      // Yesterday's incomplete (were scheduled but not done)
      const yesterdayIncomplete = tasks.filter(t =>
        t.status !== "done" &&
        t.scheduledDate === yesterdayStr
      );

      // Already scheduled for target date
      const alreadyScheduled = tasks.filter(t =>
        t.scheduledDate === targetDate && t.scheduledTime && t.status !== "done"
      ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

      // Calculate available time (9-18 = 9 hours = 540 min)
      let scheduledMinutes = alreadyScheduled.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
      const availableMinutes = 540 - scheduledMinutes;

      let output = `## Planning Context for ${targetDate}\n\n`;

      if (overdue.length > 0) {
        output += `### ⚠️ Overdue Tasks (${overdue.length})\n`;
        overdue.forEach(t => {
          output += `- **${t.name}** (due: ${t.dueDate}) [ID: ${t.id}]\n`;
        });
        output += `\n`;
      }

      if (yesterdayIncomplete.length > 0) {
        output += `### 📅 Incomplete from Yesterday (${yesterdayIncomplete.length})\n`;
        yesterdayIncomplete.forEach(t => {
          output += `- **${t.name}** [ID: ${t.id}]\n`;
        });
        output += `\n`;
      }

      if (unscheduledHighPriority.length > 0) {
        output += `### 🔥 High Priority - Unscheduled (${unscheduledHighPriority.length})\n`;
        unscheduledHighPriority.forEach(t => {
          output += `- **${t.name}** [${t.priority}] [ID: ${t.id}]\n`;
        });
        output += `\n`;
      }

      if (alreadyScheduled.length > 0) {
        output += `### ⏰ Already Scheduled (${alreadyScheduled.length})\n`;
        alreadyScheduled.forEach(t => {
          output += `- ${t.scheduledTime}: **${t.name}** (${t.estimatedMinutes || 30}m)\n`;
        });
        output += `\n`;
      }

      output += `### Time Budget\n`;
      output += `- Scheduled: ${Math.floor(scheduledMinutes / 60)}h ${scheduledMinutes % 60}m\n`;
      output += `- Available: ${Math.floor(availableMinutes / 60)}h ${availableMinutes % 60}m\n`;

      return { content: [{ type: "text", text: output }] };
    }

    case "suggest_day_schedule": {
      const data = loadData();
      const targetDate = args?.date || new Date().toISOString().split("T")[0];
      const startHour = args?.startHour ?? 9;
      const endHour = args?.endHour ?? 18;
      const tasks = getAllTasks(data);

      // Get tasks to schedule
      let toSchedule;
      if (args?.taskIds && args.taskIds.length > 0) {
        toSchedule = args.taskIds.map(id => findTask(data, id)?.task).filter(Boolean);
      } else {
        // Get top priority unscheduled tasks
        toSchedule = tasks
          .filter(t => t.status !== "done" && !t.scheduledTime)
          .sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
            const aPri = priorityOrder[a.priority] ?? 4;
            const bPri = priorityOrder[b.priority] ?? 4;
            if (aPri !== bPri) return aPri - bPri;
            if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
          })
          .slice(0, 10);
      }

      // Build schedule
      const schedule = [];
      let currentMinutes = startHour * 60;
      const endMinutes = endHour * 60;

      for (const task of toSchedule) {
        const duration = task.estimatedMinutes || 30;
        if (currentMinutes + duration > endMinutes) break;

        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

        schedule.push({
          taskId: task.id,
          name: task.name,
          scheduledTime: time,
          estimatedMinutes: duration,
        });

        currentMinutes += duration + 15; // 15 min buffer between tasks
      }

      let output = `## Suggested Schedule for ${targetDate}\n\n`;
      output += `Working hours: ${startHour}:00 - ${endHour}:00\n\n`;

      if (schedule.length === 0) {
        output += "No tasks to schedule.\n";
      } else {
        let totalMinutes = 0;
        schedule.forEach(item => {
          output += `**${item.scheduledTime}** - ${item.name} (${item.estimatedMinutes}m)\n`;
          output += `  ID: ${item.taskId}\n\n`;
          totalMinutes += item.estimatedMinutes;
        });

        output += `---\n`;
        output += `**Total:** ${schedule.length} tasks, ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m\n\n`;
        output += `### To apply this schedule:\n`;
        output += `Use bulk_schedule_today with:\n`;
        output += "```json\n" + JSON.stringify({
          schedule: schedule.map(s => ({
            taskId: s.taskId,
            scheduledTime: s.scheduledTime,
            estimatedMinutes: s.estimatedMinutes
          }))
        }, null, 2) + "\n```";
      }

      return { content: [{ type: "text", text: output }] };
    }

    default:
      return null;
  }
}
