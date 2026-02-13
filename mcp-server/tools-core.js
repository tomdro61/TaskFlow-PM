import fs from "fs";
import { generateId, getAllTasks, findTask } from "./data.js";

export function getToolDefinitions() {
  return [
    {
      name: "get_all_tasks",
      description: "Get all tasks from TaskFlow. Returns tasks organized by status with project and tag info.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["all", "todo", "in-progress", "review", "done"],
            description: "Filter by status. Default: all",
          },
          project: {
            type: "string",
            description: "Filter by project name",
          },
        },
      },
    },
    {
      name: "create_task",
      description: "Create a new task in TaskFlow. Supports scheduling with time blocks.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Task name (required)",
          },
          description: {
            type: "string",
            description: "Task description",
          },
          context: {
            type: "string",
            description: "Brain dump / context for AI assistance",
          },
          project: {
            type: "string",
            description: "Project name to add task to. Creates project if doesn't exist.",
          },
          priority: {
            type: "string",
            enum: ["none", "low", "medium", "high", "urgent"],
            description: "Task priority",
          },
          dueDate: {
            type: "string",
            description: "Due date in YYYY-MM-DD format",
          },
          scheduledTime: {
            type: "string",
            description: "Scheduled start time in HH:MM format (e.g., '09:00')",
          },
          scheduledDate: {
            type: "string",
            description: "Scheduled date in YYYY-MM-DD format. Defaults to dueDate or today.",
          },
          estimatedMinutes: {
            type: "number",
            description: "Estimated duration in minutes (15, 30, 45, 60, 90, 120)",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tag names to apply",
          },
          status: {
            type: "string",
            enum: ["todo", "ready", "in-progress", "waiting", "done"],
            description: "Initial status. Default: todo",
          },
          executionType: {
            type: "string",
            enum: ["ai", "manual", "hybrid"],
            description: "How the task should be executed: 'ai' = Claude can do autonomously, 'manual' = requires human action, 'hybrid' = collaborative. Default: manual",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "create_subtasks",
      description: "Break down a task into subtasks. Great for action planning.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the parent task",
          },
          subtasks: {
            type: "array",
            items: { type: "string" },
            description: "List of subtask names to create",
          },
        },
        required: ["taskId", "subtasks"],
      },
    },
    {
      name: "complete_task",
      description: "Mark a task as complete.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to complete",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "update_task",
      description: "Update a task's properties. Supports all task fields including scheduling, assignment, and execution type.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to update",
          },
          name: { type: "string", description: "Task name" },
          description: { type: "string", description: "Task description" },
          context: { type: "string", description: "Brain dump / context for AI processing" },
          status: {
            type: "string",
            enum: ["todo", "ready", "in-progress", "waiting", "done"],
            description: "Task status",
          },
          priority: {
            type: "string",
            enum: ["none", "low", "medium", "high", "urgent"],
          },
          dueDate: { type: "string", description: "Due date (YYYY-MM-DD) or null to clear" },
          scheduledDate: { type: "string", description: "Scheduled date (YYYY-MM-DD) or null to clear. Use this to add a task to Today." },
          scheduledTime: { type: "string", description: "Scheduled time (HH:MM) or null to clear" },
          estimatedMinutes: { type: "number", description: "Estimated duration in minutes" },
          executionType: {
            type: "string",
            enum: ["ai", "manual", "hybrid"],
            description: "Who executes: ai (Claude alone), manual (human), hybrid (together)",
          },
          assignedTo: { type: "string", description: "Assigned to: 'claude', 'vin', or null to clear" },
        },
        required: ["taskId"],
      },
    },
    {
      name: "delete_task",
      description: "Delete a task permanently.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to delete",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "delete_all_completed",
      description: "Delete all completed tasks. Optionally filter by project.",
      inputSchema: {
        type: "object",
        properties: {
          projectName: {
            type: "string",
            description: "Optional: Only delete completed tasks from this project",
          },
        },
      },
    },
    {
      name: "bulk_update_tasks",
      description: "Update multiple tasks at once with the same changes. Efficient for batch operations.",
      inputSchema: {
        type: "object",
        properties: {
          taskIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of task IDs to update",
          },
          updates: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["todo", "ready", "in-progress", "waiting", "done"] },
              priority: { type: "string", enum: ["none", "low", "medium", "high", "urgent"] },
              dueDate: { type: "string" },
              scheduledDate: { type: "string" },
              executionType: { type: "string", enum: ["ai", "manual", "hybrid"] },
            },
            description: "Updates to apply to all specified tasks",
          },
        },
        required: ["taskIds", "updates"],
      },
    },
    {
      name: "log_time",
      description: "Log time spent working on a task.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task",
          },
          minutes: {
            type: "number",
            description: "Minutes spent on the task",
          },
          notes: {
            type: "string",
            description: "Optional notes about what was done",
          },
        },
        required: ["taskId", "minutes"],
      },
    },
    {
      name: "set_task_goal",
      description: "Set the goal/purpose for a task - why this task matters.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task",
          },
          goal: {
            type: "string",
            description: "The goal or purpose of this task",
          },
        },
        required: ["taskId", "goal"],
      },
    },
    {
      name: "add_learning",
      description: "Record something learned while working on a task.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task",
          },
          learning: {
            type: "string",
            description: "What was learned",
          },
        },
        required: ["taskId", "learning"],
      },
    },
    {
      name: "get_task_context",
      description: "Get the full context/brain dump for a task. Use this to understand what the user needs help with.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "append_context",
      description: "Add additional context or notes to a task's brain dump field.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task",
          },
          context: {
            type: "string",
            description: "Additional context to append",
          },
        },
        required: ["taskId", "context"],
      },
    },
    {
      name: "get_working_on_task",
      description: "Get the task the user is currently working on. This shows what they've marked as 'Working On Now' in TaskFlow.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_focus_task",
      description: "Get the single most important task to focus on right now. Considers due dates, priorities, and status.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "create_subtasks_enhanced",
      description: "Create subtasks with time estimates and scheduling capability.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the parent task",
          },
          subtasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                estimatedMinutes: { type: "number" },
                scheduledTime: { type: "string" },
                scheduledDate: { type: "string" },
              },
              required: ["name"],
            },
            description: "Subtasks to create with optional time estimates and scheduling",
          },
        },
        required: ["taskId", "subtasks"],
      },
    },
    {
      name: "schedule_subtask",
      description: "Schedule a subtask to appear on the timeline.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the parent task",
          },
          subtaskId: {
            type: "string",
            description: "ID of the subtask to schedule",
          },
          scheduledTime: {
            type: "string",
            description: "Time in HH:MM format",
          },
          scheduledDate: {
            type: "string",
            description: "Date in YYYY-MM-DD format. Defaults to today.",
          },
          estimatedMinutes: {
            type: "number",
            description: "Duration in minutes",
          },
        },
        required: ["taskId", "subtaskId", "scheduledTime"],
      },
    },
    {
      name: "assign_task",
      description: "Assign a task or subtask to Claude or the user. Use this to indicate who will work on the task.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task or subtask to assign",
          },
          assignTo: {
            type: "string",
            enum: ["claude", "user", "none"],
            description: "Who to assign the task to: 'claude' for AI tasks, 'user' for manual tasks, 'none' to unassign",
          },
        },
        required: ["taskId", "assignTo"],
      },
    },
    {
      name: "get_claude_tasks",
      description: "Get all tasks and subtasks assigned to Claude with full context. Returns task details, descriptions, brain dump context, and parent task info for subtasks.",
      inputSchema: {
        type: "object",
        properties: {
          todayOnly: {
            type: "boolean",
            description: "If true, only return tasks scheduled for today. Default: false (returns all Claude tasks)",
          },
        },
      },
    },
    {
      name: "sync_claude_queue",
      description: "Write all Claude-assigned tasks to the claude_queue.md file for overnight/batch processing. This overwrites the queue file with current Claude tasks.",
      inputSchema: {
        type: "object",
        properties: {
          todayOnly: {
            type: "boolean",
            description: "If true, only include tasks scheduled for today. Default: false",
          },
        },
      },
    },
    {
      name: "set_blocker",
      description: "Set detailed blocker information for a waiting task.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task",
          },
          type: {
            type: "string",
            enum: ["person", "external", "dependency", "resource", "decision"],
            description: "Type of blocker",
          },
          description: {
            type: "string",
            description: "Description of what's blocking the task",
          },
          expectedResolution: {
            type: "string",
            description: "Expected resolution date in YYYY-MM-DD format",
          },
          followUpDate: {
            type: "string",
            description: "Date to follow up in YYYY-MM-DD format",
          },
          contactInfo: {
            type: "string",
            description: "Contact info for person blockers (email, name, etc.)",
          },
        },
        required: ["taskId", "type", "description"],
      },
    },
    {
      name: "log_follow_up",
      description: "Record a follow-up attempt for a blocked task.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the blocked task",
          },
          note: {
            type: "string",
            description: "What was done to follow up",
          },
          newFollowUpDate: {
            type: "string",
            description: "Optional: Set a new follow-up date",
          },
        },
        required: ["taskId", "note"],
      },
    },
    {
      name: "get_blockers_summary",
      description: "Get a summary of all blocked tasks with aging analysis.",
      inputSchema: {
        type: "object",
        properties: {
          includeResolved: {
            type: "boolean",
            description: "Include recently resolved blockers. Default: false",
          },
        },
      },
    },
    {
      name: "clear_blocker",
      description: "Mark a blocker as resolved and set task status to ready.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the blocked task",
          },
          resolution: {
            type: "string",
            description: "How the blocker was resolved",
          },
        },
        required: ["taskId"],
      },
    },
  ];
}

export function handleTool(name, args, { loadData, saveData }) {
  switch (name) {
    case "get_all_tasks": {
      const data = loadData();
      let tasks = getAllTasks(data);

      if (args?.status && args.status !== "all") {
        tasks = tasks.filter((t) => t.status === args.status);
      }
      if (args?.project) {
        tasks = tasks.filter((t) =>
          t.projectName?.toLowerCase().includes(args.project.toLowerCase())
        );
      }

      const output = tasks.map((task) => {
        const project = data.projects.find((p) => p.id === task.projectId);
        return {
          id: task.id,
          name: task.name,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          project: project?.name || "Inbox",
          subtasks: task.subtasks?.length || 0,
          description: task.description,
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    }

    case "create_task": {
      const data = loadData();
      if (!args?.name) {
        return { content: [{ type: "text", text: "Error: Task name is required" }] };
      }

      // Find or create project
      let project = null;
      if (args.project) {
        project = data.projects.find(
          (p) => p.name.toLowerCase() === args.project.toLowerCase()
        );
        if (!project) {
          project = {
            id: generateId(),
            name: args.project,
            description: "",
            color: "#6366f1",
            tasks: [],
            createdAt: new Date().toISOString(),
          };
          data.projects.push(project);
        }
      } else {
        project = data.projects.find((p) => p.isInbox || p.id === "inbox");
        if (!project) {
          project = { id: "inbox", name: "Inbox", color: "#6366f1", tasks: [], isInbox: true };
          data.projects.unshift(project);
        }
      }

      // Resolve tag IDs
      const tagIds = [];
      if (args.tags) {
        for (const tagName of args.tags) {
          let tag = data.tags.find(
            (t) => t.name.toLowerCase() === tagName.toLowerCase()
          );
          if (!tag) {
            tag = { id: generateId(), name: tagName, color: "#6366f1" };
            data.tags.push(tag);
          }
          tagIds.push(tag.id);
        }
      }

      const today = new Date().toISOString().split("T")[0];
      const task = {
        id: generateId(),
        name: args.name,
        description: args.description || "",
        context: args.context || "",
        status: args.status || "todo",
        priority: args.priority || "none",
        dueDate: args.dueDate || null,
        scheduledTime: args.scheduledTime || null,
        scheduledDate: args.scheduledDate || args.dueDate || (args.scheduledTime ? today : null),
        estimatedMinutes: args.estimatedMinutes || null,
        executionType: args.executionType || "manual",
        tags: tagIds,
        subtasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };

      // If scheduled but no due date, set due date to scheduled date
      if (task.scheduledDate && !task.dueDate) {
        task.dueDate = task.scheduledDate;
      }

      project.tasks.push(task);
      saveData(data);

      let response = `Created task: "${task.name}"\nID: ${task.id}\nProject: ${project.name}`;
      if (task.scheduledTime) {
        response += `\nScheduled: ${task.scheduledTime} on ${task.scheduledDate}`;
        if (task.estimatedMinutes) {
          response += ` (${task.estimatedMinutes}m)`;
        }
      }

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    }

    case "create_subtasks": {
      const data = loadData();
      if (!args?.taskId || !args?.subtasks) {
        return { content: [{ type: "text", text: "Error: taskId and subtasks are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      if (!task.subtasks) task.subtasks = [];

      const created = [];
      for (const subtaskName of args.subtasks) {
        const subtask = {
          id: generateId(),
          name: subtaskName,
          status: "todo",
          priority: "none",
          createdAt: new Date().toISOString(),
        };
        task.subtasks.push(subtask);
        created.push(subtaskName);
      }

      saveData(data);

      return {
        content: [
          {
            type: "text",
            text: `Added ${created.length} subtasks to "${task.name}":\n${created.map((s) => `- ${s}`).join("\n")}`,
          },
        ],
      };
    }

    case "complete_task": {
      const data = loadData();
      if (!args?.taskId) {
        return { content: [{ type: "text", text: "Error: taskId is required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      result.task.status = "done";
      result.task.completedAt = new Date().toISOString();
      saveData(data);

      return {
        content: [{ type: "text", text: `Completed: "${result.task.name}"` }],
      };
    }

    case "update_task": {
      const data = loadData();
      if (!args?.taskId) {
        return { content: [{ type: "text", text: "Error: taskId is required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      const changes = [];
      if (args.name) { task.name = args.name; changes.push("name"); }
      if (args.description !== undefined) { task.description = args.description; changes.push("description"); }
      if (args.context !== undefined) { task.context = args.context; changes.push("context"); }
      if (args.status) {
        task.status = args.status;
        if (args.status === "done") {
          task.completedAt = new Date().toISOString();
        } else {
          task.completedAt = null;
        }
        changes.push("status → " + args.status);
      }
      if (args.priority) { task.priority = args.priority; changes.push("priority → " + args.priority); }
      if (args.dueDate !== undefined) { task.dueDate = args.dueDate || null; changes.push("dueDate → " + (args.dueDate || "cleared")); }
      if (args.scheduledDate !== undefined) { task.scheduledDate = args.scheduledDate || null; changes.push("scheduledDate → " + (args.scheduledDate || "cleared")); }
      if (args.scheduledTime !== undefined) { task.scheduledTime = args.scheduledTime || null; changes.push("scheduledTime → " + (args.scheduledTime || "cleared")); }
      if (args.estimatedMinutes !== undefined) { task.estimatedMinutes = args.estimatedMinutes; changes.push("estimate → " + args.estimatedMinutes + "min"); }
      if (args.executionType) { task.executionType = args.executionType; changes.push("type → " + args.executionType); }
      if (args.assignedTo !== undefined) { task.assignedTo = args.assignedTo || null; changes.push("assigned → " + (args.assignedTo || "unassigned")); }
      task.updatedAt = new Date().toISOString();

      saveData(data);

      return {
        content: [{ type: "text", text: `Updated task: "${task.name}" (${changes.join(", ")})` }],
      };
    }

    case "delete_task": {
      const data = loadData();
      if (!args?.taskId) {
        return { content: [{ type: "text", text: "Error: taskId is required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task, project, parentTask } = result;
      const taskName = task.name;

      if (parentTask) {
        // It's a subtask
        parentTask.subtasks = parentTask.subtasks.filter((st) => st.id !== args.taskId);
      } else {
        // It's a main task
        project.tasks = project.tasks.filter((t) => t.id !== args.taskId);
      }

      saveData(data);
      return { content: [{ type: "text", text: `Deleted task: "${taskName}"` }] };
    }

    case "delete_all_completed": {
      const data = loadData();
      let deletedCount = 0;
      const projectFilter = args?.projectName?.toLowerCase();

      for (const project of data.projects) {
        if (projectFilter && project.name.toLowerCase() !== projectFilter) {
          continue;
        }

        const beforeCount = project.tasks.length;
        project.tasks = project.tasks.filter((t) => t.status !== "done");
        deletedCount += beforeCount - project.tasks.length;

        // Also clean up completed subtasks
        for (const task of project.tasks) {
          if (task.subtasks) {
            const subtasksBefore = task.subtasks.length;
            task.subtasks = task.subtasks.filter((st) => st.status !== "done");
            deletedCount += subtasksBefore - task.subtasks.length;
          }
        }
      }

      saveData(data);

      const scopeMsg = projectFilter ? ` from "${args.projectName}"` : "";
      return {
        content: [{ type: "text", text: `Deleted ${deletedCount} completed tasks${scopeMsg}` }],
      };
    }

    case "bulk_update_tasks": {
      const data = loadData();
      if (!args?.taskIds || !Array.isArray(args.taskIds) || !args?.updates) {
        return { content: [{ type: "text", text: "Error: taskIds array and updates object are required" }] };
      }

      const results = [];
      const errors = [];

      for (const taskId of args.taskIds) {
        const result = findTask(data, taskId);
        if (!result) {
          errors.push(`Task ${taskId} not found`);
          continue;
        }

        const { task } = result;
        const updates = args.updates;

        if (updates.status) task.status = updates.status;
        if (updates.priority) task.priority = updates.priority;
        if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
        if (updates.scheduledDate !== undefined) task.scheduledDate = updates.scheduledDate;
        if (updates.executionType) task.executionType = updates.executionType;

        if (updates.status === "done" && !task.completedAt) {
          task.completedAt = new Date().toISOString();
        }

        results.push(task.name);
      }

      saveData(data);

      let output = `## Bulk Update Results\n\n`;
      output += `**Updated ${results.length} tasks:**\n`;
      results.forEach(name => output += `- ${name}\n`);

      if (errors.length > 0) {
        output += `\n**Errors (${errors.length}):**\n`;
        errors.forEach(e => output += `- ${e}\n`);
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "log_time": {
      const data = loadData();
      if (!args?.taskId || !args?.minutes) {
        return { content: [{ type: "text", text: "Error: taskId and minutes are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      if (!task.timeLog) task.timeLog = [];

      const entry = {
        id: generateId(),
        minutes: args.minutes,
        notes: args.notes || "",
        loggedAt: new Date().toISOString(),
      };

      task.timeLog.push(entry);
      saveData(data);

      const totalMinutes = task.timeLog.reduce((sum, e) => sum + e.minutes, 0);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      return {
        content: [
          {
            type: "text",
            text: `Logged ${args.minutes} min on "${task.name}"\nTotal time: ${hours}h ${mins}m`,
          },
        ],
      };
    }

    case "set_task_goal": {
      const data = loadData();
      if (!args?.taskId || !args?.goal) {
        return { content: [{ type: "text", text: "Error: taskId and goal are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      result.task.goal = args.goal;
      saveData(data);

      return {
        content: [{ type: "text", text: `Set goal for "${result.task.name}":\n"${args.goal}"` }],
      };
    }

    case "add_learning": {
      const data = loadData();
      if (!args?.taskId || !args?.learning) {
        return { content: [{ type: "text", text: "Error: taskId and learning are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      if (!task.learnings) task.learnings = [];

      task.learnings.push({
        id: generateId(),
        text: args.learning,
        addedAt: new Date().toISOString(),
      });

      saveData(data);

      return {
        content: [{ type: "text", text: `Added learning to "${task.name}":\n"${args.learning}"` }],
      };
    }

    case "get_task_context": {
      const data = loadData();
      if (!args?.taskId) {
        return { content: [{ type: "text", text: "Error: taskId is required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task, project } = result;

      let output = `## Task Context: ${task.name}\n\n`;
      output += `**ID:** ${task.id}\n`;
      output += `**Status:** ${task.status}\n`;
      output += `**Priority:** ${task.priority}\n`;
      if (task.dueDate) output += `**Due:** ${task.dueDate}\n`;
      if (project) output += `**Project:** ${project.name}\n`;
      output += `\n`;

      if (task.description) {
        output += `### Description\n${task.description}\n\n`;
      }

      if (task.context) {
        output += `### Brain Dump / Context\n${task.context}\n\n`;
      }

      if (task.goal) {
        output += `### Goal\n${task.goal}\n\n`;
      }

      if (task.subtasks && task.subtasks.length > 0) {
        output += `### Action Plan (${task.subtasks.filter(s => s.status === 'done').length}/${task.subtasks.length} done)\n`;
        task.subtasks.forEach(st => {
          output += `- [${st.status === 'done' ? 'x' : ' '}] ${st.name}\n`;
        });
        output += `\n`;
      }

      if (task.learnings && task.learnings.length > 0) {
        output += `### Learnings\n`;
        task.learnings.forEach(l => {
          output += `- ${l.text}\n`;
        });
        output += `\n`;
      }

      if (task.timeLog && task.timeLog.length > 0) {
        const totalMins = task.timeLog.reduce((sum, e) => sum + e.minutes, 0);
        output += `### Time Invested: ${Math.floor(totalMins / 60)}h ${totalMins % 60}m\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "append_context": {
      const data = loadData();
      if (!args?.taskId || !args?.context) {
        return { content: [{ type: "text", text: "Error: taskId and context are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      const timestamp = new Date().toLocaleString();
      const newContext = task.context
        ? `${task.context}\n\n---\n[Added ${timestamp}]\n${args.context}`
        : args.context;

      task.context = newContext;
      saveData(data);

      return {
        content: [{ type: "text", text: `Added context to "${task.name}"` }],
      };
    }

    case "get_working_on_task": {
      const data = loadData();
      // Support both old single ID and new array format
      const workingOnTaskIds = data.workingOnTaskIds || (data.workingOnTaskId ? [data.workingOnTaskId] : []);

      if (workingOnTaskIds.length === 0) {
        return { content: [{ type: "text", text: "No tasks currently marked as 'Active'. The user hasn't selected any tasks to focus on." }] };
      }

      let output = `## Currently Active Tasks (${workingOnTaskIds.length})\n\n`;

      workingOnTaskIds.forEach((taskId, index) => {
        const result = findTask(data, taskId);
        if (!result) {
          output += `### Task ${index + 1} (not found - may have been deleted)\n\n`;
          return;
        }

        const { task, project } = result;

        output += `### ${task.name}\n`;
        output += `ID: ${task.id}\n`;
        output += `Project: ${project?.name || 'Inbox'}\n`;
        output += `Status: ${task.status}\n`;
        output += `Priority: ${task.priority || 'none'}\n`;

        if (task.description) {
          output += `\n**Description:**\n${task.description}\n`;
        }

        if (task.context) {
          output += `\n**Context/Brain Dump:**\n${task.context}\n`;
        }

        if (task.workNotes) {
          output += `\n**Work Notes:**\n${task.workNotes}\n`;
        }

        if (task.subtasks && task.subtasks.length > 0) {
          output += `\n**Subtasks:**\n`;
          task.subtasks.forEach(st => {
            output += `- [${st.status === 'done' ? 'x' : ' '}] ${st.name}\n`;
          });
        }

        if (task.dueDate) {
          output += `\nDue: ${task.dueDate}\n`;
        }

        if (task.scheduledTime) {
          output += `Scheduled: ${task.scheduledDate || 'today'} at ${task.scheduledTime}\n`;
        }

        if (task.estimatedMinutes) {
          output += `Estimated: ${task.estimatedMinutes} minutes\n`;
        }

        output += `\n---\n\n`;
      });

      return { content: [{ type: "text", text: output }] };
    }

    case "get_focus_task": {
      const data = loadData();
      const today = new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data).filter((t) => t.status !== "done");

      if (tasks.length === 0) {
        return {
          content: [{ type: "text", text: "No active tasks! Time to add some or take a break." }],
        };
      }

      // Score tasks: overdue > due today > high priority > in progress > other
      const scored = tasks.map((task) => {
        let score = 0;
        if (task.dueDate && task.dueDate < today) score += 100;
        if (task.dueDate === today) score += 50;
        if (task.priority === "urgent") score += 40;
        if (task.priority === "high") score += 30;
        if (task.status === "in-progress") score += 20;
        if (task.priority === "medium") score += 10;
        return { task, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const focus = scored[0].task;
      const project = data.projects.find((p) => p.id === focus.projectId);

      let output = `## Focus on This Task\n\n`;
      output += `**${focus.name}**\n`;
      if (focus.description) output += `${focus.description}\n`;
      output += `\n`;
      output += `- Status: ${focus.status}\n`;
      output += `- Priority: ${focus.priority}\n`;
      if (focus.dueDate) output += `- Due: ${focus.dueDate}\n`;
      if (project) output += `- Project: ${project.name}\n`;
      output += `- ID: ${focus.id}\n`;

      if (focus.subtasks?.length > 0) {
        output += `\n### Subtasks\n`;
        focus.subtasks.forEach((st) => {
          output += `- [${st.status === "done" ? "x" : " "}] ${st.name}\n`;
        });
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "create_subtasks_enhanced": {
      const data = loadData();
      if (!args?.taskId || !args?.subtasks || !Array.isArray(args.subtasks)) {
        return { content: [{ type: "text", text: "Error: taskId and subtasks array are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      if (!task.subtasks) task.subtasks = [];

      const created = [];
      for (const st of args.subtasks) {
        if (!st.name) continue;

        const subtask = {
          id: generateId(),
          name: st.name,
          status: "todo",
          estimatedMinutes: st.estimatedMinutes || null,
          scheduledTime: st.scheduledTime || null,
          scheduledDate: st.scheduledDate || null,
          createdAt: new Date().toISOString()
        };

        task.subtasks.push(subtask);
        created.push({
          name: st.name,
          duration: st.estimatedMinutes,
          scheduled: st.scheduledTime ? `${st.scheduledTime} on ${st.scheduledDate || "today"}` : null
        });
      }

      saveData(data);

      let output = `## Created ${created.length} Subtasks for "${task.name}"\n\n`;
      created.forEach(st => {
        output += `- ${st.name}`;
        if (st.duration) output += ` (${st.duration}m)`;
        if (st.scheduled) output += ` @ ${st.scheduled}`;
        output += `\n`;
      });

      return { content: [{ type: "text", text: output }] };
    }

    case "schedule_subtask": {
      const data = loadData();
      if (!args?.taskId || !args?.subtaskId || !args?.scheduledTime) {
        return { content: [{ type: "text", text: "Error: taskId, subtaskId, and scheduledTime are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      const subtask = task.subtasks?.find(st => st.id === args.subtaskId);
      if (!subtask) {
        return { content: [{ type: "text", text: `Error: Subtask ${args.subtaskId} not found` }] };
      }

      subtask.scheduledTime = args.scheduledTime;
      subtask.scheduledDate = args.scheduledDate || new Date().toISOString().split("T")[0];
      if (args.estimatedMinutes) {
        subtask.estimatedMinutes = args.estimatedMinutes;
      }

      saveData(data);

      return {
        content: [{ type: "text", text: `Scheduled subtask "${subtask.name}" at ${subtask.scheduledTime} on ${subtask.scheduledDate}` }]
      };
    }

    case "assign_task": {
      const data = loadData();
      if (!args?.taskId || !args?.assignTo) {
        return { content: [{ type: "text", text: "Error: taskId and assignTo are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task, parentTask } = result;
      const assignValue = args.assignTo === "none" ? null : args.assignTo;
      task.assignedTo = assignValue;

      saveData(data);

      const taskType = parentTask ? "Subtask" : "Task";
      const assignedLabel = assignValue ? `to ${assignValue}` : "(unassigned)";
      return {
        content: [{ type: "text", text: `${taskType} "${task.name}" assigned ${assignedLabel}` }]
      };
    }

    case "get_claude_tasks": {
      const data = loadData();
      const todayOnly = args?.todayOnly || false;
      const today = new Date().toISOString().split("T")[0];
      const claudeTasks = [];

      for (const project of data.projects) {
        for (const task of project.tasks) {
          // Check if main task is assigned to Claude
          if (task.assignedTo === "claude" && task.status !== "done") {
            // Apply todayOnly filter
            if (todayOnly && task.scheduledDate !== today && task.dueDate !== today) {
              continue;
            }

            // Get subtasks assigned to Claude for this task
            const claudeSubtasks = (task.subtasks || [])
              .filter(st => st.assignedTo === "claude" && st.status !== "done")
              .map(st => st.name);

            claudeTasks.push({
              type: "task",
              id: task.id,
              name: task.name,
              description: task.description || "",
              context: task.context || "",
              priority: task.priority,
              dueDate: task.dueDate,
              scheduledDate: task.scheduledDate,
              scheduledTime: task.scheduledTime,
              estimatedMinutes: task.estimatedMinutes,
              projectName: project.name,
              subtasks: task.subtasks ? task.subtasks.map(st => ({
                name: st.name,
                status: st.status,
                assignedTo: st.assignedTo
              })) : [],
              claudeSubtasks: claudeSubtasks,
            });
          }

          // Check subtasks assigned to Claude (where parent task is NOT assigned to Claude)
          if (task.subtasks && task.assignedTo !== "claude") {
            for (const subtask of task.subtasks) {
              if (subtask.assignedTo === "claude" && subtask.status !== "done") {
                // Apply todayOnly filter based on parent task
                if (todayOnly && task.scheduledDate !== today && task.dueDate !== today) {
                  continue;
                }

                claudeTasks.push({
                  type: "subtask",
                  id: subtask.id,
                  name: subtask.name,
                  parentTask: {
                    id: task.id,
                    name: task.name,
                    description: task.description || "",
                    context: task.context || "",
                    priority: task.priority,
                    dueDate: task.dueDate,
                    scheduledDate: task.scheduledDate,
                    allSubtasks: task.subtasks.map(st => ({
                      name: st.name,
                      status: st.status,
                      assignedTo: st.assignedTo
                    })),
                  },
                  projectName: project.name,
                });
              }
            }
          }
        }
      }

      if (claudeTasks.length === 0) {
        const filterNote = todayOnly ? " for today" : "";
        return { content: [{ type: "text", text: `No tasks assigned to Claude${filterNote}.` }] };
      }

      const filterNote = todayOnly ? " (Today Only)" : "";
      let output = `## Claude's Tasks${filterNote} (${claudeTasks.length})\n\n`;

      for (const item of claudeTasks) {
        if (item.type === "task") {
          output += `### TASK: ${item.name}\n`;
          output += `**ID:** ${item.id}\n`;
          output += `**Project:** ${item.projectName}\n`;
          if (item.priority && item.priority !== "none") output += `**Priority:** ${item.priority}\n`;
          if (item.dueDate) output += `**Due:** ${item.dueDate}\n`;
          if (item.scheduledDate) output += `**Scheduled:** ${item.scheduledDate}${item.scheduledTime ? ' at ' + item.scheduledTime : ''}\n`;
          if (item.estimatedMinutes) output += `**Estimated:** ${item.estimatedMinutes} minutes\n`;
          output += `\n`;
          if (item.description) output += `**Description:**\n${item.description}\n\n`;
          if (item.context) output += `**Context/Brain Dump:**\n${item.context}\n\n`;
          if (item.subtasks && item.subtasks.length > 0) {
            output += `**Subtasks:**\n`;
            for (const st of item.subtasks) {
              const status = st.status === "done" ? "✓" : "○";
              const assignee = st.assignedTo ? ` [${st.assignedTo}]` : "";
              output += `- ${status} ${st.name}${assignee}\n`;
            }
            output += `\n`;
          }
          output += `---\n\n`;
        } else {
          output += `### SUBTASK: ${item.name}\n`;
          output += `**ID:** ${item.id}\n`;
          output += `**Project:** ${item.projectName}\n`;
          output += `\n**Parent Task:** ${item.parentTask.name}\n`;
          if (item.parentTask.priority && item.parentTask.priority !== "none") output += `**Parent Priority:** ${item.parentTask.priority}\n`;
          if (item.parentTask.dueDate) output += `**Parent Due:** ${item.parentTask.dueDate}\n`;
          output += `\n`;
          if (item.parentTask.description) output += `**Parent Description:**\n${item.parentTask.description}\n\n`;
          if (item.parentTask.context) output += `**Parent Context/Brain Dump:**\n${item.parentTask.context}\n\n`;
          if (item.parentTask.allSubtasks && item.parentTask.allSubtasks.length > 0) {
            output += `**All Subtasks in Parent:**\n`;
            for (const st of item.parentTask.allSubtasks) {
              const status = st.status === "done" ? "✓" : "○";
              const assignee = st.assignedTo ? ` [${st.assignedTo}]` : "";
              const isCurrent = st.name === item.name ? " ← THIS ONE" : "";
              output += `- ${status} ${st.name}${assignee}${isCurrent}\n`;
            }
            output += `\n`;
          }
          output += `---\n\n`;
        }
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "sync_claude_queue": {
      const data = loadData();
      const todayOnly = args?.todayOnly || false;
      const today = new Date().toISOString().split("T")[0];
      const claudeTasks = [];

      // Collect Claude tasks
      for (const project of data.projects) {
        for (const task of project.tasks) {
          if (task.assignedTo === "claude" && task.status !== "done") {
            if (todayOnly && task.scheduledDate !== today && task.dueDate !== today) {
              continue;
            }
            claudeTasks.push({
              type: "task",
              task: task,
              projectName: project.name,
            });
          }

          // Check subtasks
          if (task.subtasks) {
            for (const subtask of task.subtasks) {
              if (subtask.assignedTo === "claude" && subtask.status !== "done") {
                if (todayOnly && task.scheduledDate !== today && task.dueDate !== today) {
                  continue;
                }
                claudeTasks.push({
                  type: "subtask",
                  subtask: subtask,
                  parentTask: task,
                  projectName: project.name,
                });
              }
            }
          }
        }
      }

      if (claudeTasks.length === 0) {
        return { content: [{ type: "text", text: "No Claude tasks to sync. Queue file not updated." }] };
      }

      // Build queue file content
      const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      let queueContent = `# CLAUDE QUEUE — ${dateStr}

**Owner:** Tom
**Prepared by:** TaskFlow PM (Auto-synced)
**Run Order:** Tasks 1 → ${claudeTasks.length}
**Output Location:** \`C:\\Projects\\Claude\\outputs\\\`

---

## OVERNIGHT TASKS

`;

      let taskNum = 1;
      for (const item of claudeTasks) {
        if (item.type === "task") {
          const t = item.task;
          queueContent += `### TASK ${taskNum}: ${t.name}

**Status:** [ ] Queued
**Task ID:** ${t.id}
**Project:** ${item.projectName}
${t.priority && t.priority !== "none" ? `**Priority:** ${t.priority}\n` : ""}${t.dueDate ? `**Due Date:** ${t.dueDate}\n` : ""}${t.estimatedMinutes ? `**Estimated:** ${t.estimatedMinutes} minutes\n` : ""}
**Objective:**
${t.description || t.name}

${t.context ? `**Background/Context:**
${t.context}

` : ""}${t.subtasks && t.subtasks.length > 0 ? `**Subtasks:**
${t.subtasks.map(st => `- [${st.status === "done" ? "x" : " "}] ${st.name}${st.assignedTo ? ` (${st.assignedTo})` : ""}`).join("\n")}

` : ""}---

`;
        } else {
          const st = item.subtask;
          const pt = item.parentTask;
          queueContent += `### TASK ${taskNum}: ${st.name} (Subtask)

**Status:** [ ] Queued
**Subtask ID:** ${st.id}
**Parent Task:** ${pt.name}
**Parent Task ID:** ${pt.id}
**Project:** ${item.projectName}
${pt.priority && pt.priority !== "none" ? `**Priority:** ${pt.priority}\n` : ""}${pt.dueDate ? `**Due Date:** ${pt.dueDate}\n` : ""}
**Objective:**
${st.name}

${pt.description ? `**Parent Task Description:**
${pt.description}

` : ""}${pt.context ? `**Parent Task Context:**
${pt.context}

` : ""}---

`;
        }
        taskNum++;
      }

      // Add completion checklist
      queueContent += `## COMPLETION CHECKLIST

`;
      taskNum = 1;
      for (const item of claudeTasks) {
        const taskName = item.type === "task" ? item.task.name : item.subtask.name;
        queueContent += `- [ ] Task ${taskNum}: ${taskName}\n`;
        taskNum++;
      }

      queueContent += `
---

## DONE — OVERNIGHT RUN SUMMARY

*[Clawdbot fills this in after completing all tasks]*
`;

      // Write to file
      const queuePath = "C:\\Projects\\Claude\\claude_queue.md";
      try {
        fs.writeFileSync(queuePath, queueContent, "utf-8");
        return {
          content: [{
            type: "text",
            text: `Queue synced! ${claudeTasks.length} task(s) written to claude_queue.md.\n\nTasks queued:\n${claudeTasks.map((item, i) => `${i + 1}. ${item.type === "task" ? item.task.name : item.subtask.name}`).join("\n")}`
          }]
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error writing queue file: ${err.message}` }] };
      }
    }

    case "set_blocker": {
      const data = loadData();
      if (!args?.taskId || !args?.type || !args?.description) {
        return { content: [{ type: "text", text: "Error: taskId, type, and description are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      task.status = "waiting";
      task.blockerInfo = {
        type: args.type,
        description: args.description,
        blockedSince: new Date().toISOString(),
        expectedResolution: args.expectedResolution || null,
        followUpDate: args.followUpDate || null,
        contactInfo: args.contactInfo || null,
        notes: []
      };

      saveData(data);

      let output = `## Blocker Set\n\n`;
      output += `**Task:** ${task.name}\n`;
      output += `**Type:** ${args.type}\n`;
      output += `**Reason:** ${args.description}\n`;
      if (args.expectedResolution) output += `**Expected Resolution:** ${args.expectedResolution}\n`;
      if (args.followUpDate) output += `**Follow-up Date:** ${args.followUpDate}\n`;
      if (args.contactInfo) output += `**Contact:** ${args.contactInfo}\n`;

      return { content: [{ type: "text", text: output }] };
    }

    case "log_follow_up": {
      const data = loadData();
      if (!args?.taskId || !args?.note) {
        return { content: [{ type: "text", text: "Error: taskId and note are required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      if (!task.blockerInfo) {
        task.blockerInfo = { notes: [] };
      }
      if (!task.blockerInfo.notes) {
        task.blockerInfo.notes = [];
      }

      task.blockerInfo.notes.push({
        date: new Date().toISOString(),
        note: args.note
      });

      if (args.newFollowUpDate) {
        task.blockerInfo.followUpDate = args.newFollowUpDate;
      }

      saveData(data);

      return {
        content: [{ type: "text", text: `Follow-up logged for "${task.name}": ${args.note}` }]
      };
    }

    case "get_blockers_summary": {
      const data = loadData();
      const tasks = getAllTasks(data);
      const blocked = tasks.filter(t =>
        t.status === "waiting" || t.blockerInfo?.type
      );

      if (blocked.length === 0) {
        return { content: [{ type: "text", text: "No blocked tasks! All clear." }] };
      }

      const now = new Date();
      const getAgeDays = (task) => {
        const since = task.blockerInfo?.blockedSince || task.createdAt;
        if (!since) return 0;
        return Math.floor((now - new Date(since)) / (1000 * 60 * 60 * 24));
      };

      // Group by type
      const byType = {};
      blocked.forEach(t => {
        const type = t.blockerInfo?.type || "unspecified";
        if (!byType[type]) byType[type] = [];
        byType[type].push(t);
      });

      let output = `## Blockers Summary\n\n`;
      output += `**Total Blocked:** ${blocked.length}\n`;
      output += `**Critical (>14d):** ${blocked.filter(t => getAgeDays(t) > 14).length}\n`;
      output += `**Warning (7-14d):** ${blocked.filter(t => getAgeDays(t) > 7 && getAgeDays(t) <= 14).length}\n\n`;

      for (const [type, tasks] of Object.entries(byType)) {
        output += `### ${type.charAt(0).toUpperCase() + type.slice(1)} (${tasks.length})\n\n`;
        tasks.forEach(t => {
          const age = getAgeDays(t);
          const ageLabel = age > 14 ? "🔴 CRITICAL" : age > 7 ? "🟡 Warning" : "🟢 Recent";
          output += `**${t.name}** - ${ageLabel} (${age}d)\n`;
          output += `  ID: ${t.id}\n`;
          if (t.blockerInfo?.description) {
            output += `  Reason: ${t.blockerInfo.description}\n`;
          }
          if (t.blockerInfo?.followUpDate) {
            output += `  Follow-up: ${t.blockerInfo.followUpDate}\n`;
          }
          output += `\n`;
        });
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "clear_blocker": {
      const data = loadData();
      if (!args?.taskId) {
        return { content: [{ type: "text", text: "Error: taskId is required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      task.status = "ready";

      if (task.blockerInfo) {
        task.blockerInfo.resolvedAt = new Date().toISOString();
        if (args.resolution) {
          task.blockerInfo.notes = task.blockerInfo.notes || [];
          task.blockerInfo.notes.push({
            date: new Date().toISOString(),
            note: `RESOLVED: ${args.resolution}`
          });
        }
      }

      saveData(data);

      return {
        content: [{ type: "text", text: `Blocker cleared for "${task.name}". Task is now ready.` }]
      };
    }

    default:
      return null;
  }
}
