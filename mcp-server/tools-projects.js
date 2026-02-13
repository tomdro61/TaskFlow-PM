import { generateId, getAllTasks, findTask } from "./data.js";

export function getToolDefinitions() {
  return [
    {
      name: "create_project",
      description: "Create a new project.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Project name",
          },
          description: {
            type: "string",
            description: "Project description",
          },
          color: {
            type: "string",
            description: "Hex color code (e.g., #3498db)",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "delete_project",
      description: "Delete a project and all its tasks permanently.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "ID of the project to delete",
          },
          projectName: {
            type: "string",
            description: "Name of the project to delete (alternative to projectId)",
          },
        },
      },
    },
    {
      name: "move_task_to_project",
      description: "Move a task from its current project to a different project. Use get_projects to see available projects.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to move",
          },
          projectId: {
            type: "string",
            description: "ID of the target project to move the task into",
          },
        },
        required: ["taskId", "projectId"],
      },
    },
    {
      name: "get_categories",
      description: "Get all project categories with their project counts.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "create_category",
      description: "Create a new project category.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Category name (required)",
          },
          color: {
            type: "string",
            description: "Hex color code (e.g., #6366f1)",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "suggest_project_breakdown",
      description: "Analyze a project and suggest a task breakdown structure. Returns suggestions for user review - does NOT auto-create tasks. Use this when starting a new project or when a project needs better organization.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "ID of the project to analyze",
          },
          projectName: {
            type: "string",
            description: "Name of the project to analyze (alternative to projectId)",
          },
        },
      },
    },
    {
      name: "add_task_dependency",
      description: "Create a blocking relationship between tasks. The blocked task cannot start until the blocker is complete.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to be blocked",
          },
          blockedByTaskId: {
            type: "string",
            description: "ID of the blocking task (must complete first)",
          },
        },
        required: ["taskId", "blockedByTaskId"],
      },
    },
    {
      name: "remove_task_dependency",
      description: "Remove a blocking relationship between tasks.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the blocked task",
          },
          blockedByTaskId: {
            type: "string",
            description: "ID of the blocker task to remove",
          },
        },
        required: ["taskId", "blockedByTaskId"],
      },
    },
    {
      name: "get_dependency_graph",
      description: "Get a text-based visualization of task dependencies within a project or across all projects.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "Optional project ID to filter dependencies. If not provided, shows all dependencies.",
          },
        },
      },
    },
    {
      name: "suggest_task_order",
      description: "Recommend execution order for tasks based on dependencies, priorities, and due dates.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "Optional project ID to filter tasks",
          },
          includeCompleted: {
            type: "boolean",
            description: "Include completed tasks in analysis. Default: false",
          },
        },
      },
    },
    {
      name: "create_subproject",
      description: "Create a project as a child of another project.",
      inputSchema: {
        type: "object",
        properties: {
          parentProjectId: {
            type: "string",
            description: "ID of the parent project",
          },
          name: {
            type: "string",
            description: "Name of the sub-project",
          },
          description: {
            type: "string",
            description: "Description of the sub-project",
          },
          color: {
            type: "string",
            description: "Hex color code",
          },
        },
        required: ["parentProjectId", "name"],
      },
    },
    {
      name: "get_project_tree",
      description: "Get hierarchical view of projects with progress stats.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

export function handleTool(name, args, { loadData, saveData }) {
  switch (name) {
    case "create_project": {
      const data = loadData();
      if (!args?.name) {
        return { content: [{ type: "text", text: "Error: Project name is required" }] };
      }

      const existing = data.projects.find(
        (p) => p.name.toLowerCase() === args.name.toLowerCase()
      );
      if (existing) {
        return { content: [{ type: "text", text: `Project "${args.name}" already exists` }] };
      }

      const project = {
        id: generateId(),
        name: args.name,
        description: args.description || "",
        color: args.color || "#6366f1",
        tasks: [],
        createdAt: new Date().toISOString(),
      };

      data.projects.push(project);
      saveData(data);

      return {
        content: [{ type: "text", text: `Created project: "${project.name}"` }],
      };
    }

    case "delete_project": {
      const data = loadData();
      if (!args?.projectId && !args?.projectName) {
        return { content: [{ type: "text", text: "Error: projectId or projectName is required" }] };
      }

      let project = null;
      let projectIndex = -1;

      if (args.projectId) {
        projectIndex = data.projects.findIndex((p) => p.id === args.projectId);
        project = data.projects[projectIndex];
      } else if (args.projectName) {
        projectIndex = data.projects.findIndex(
          (p) => p.name.toLowerCase() === args.projectName.toLowerCase()
        );
        project = data.projects[projectIndex];
      }

      if (!project || projectIndex === -1) {
        return { content: [{ type: "text", text: `Error: Project not found` }] };
      }

      if (project.isInbox || project.id === "inbox") {
        return { content: [{ type: "text", text: "Error: Cannot delete the Inbox project" }] };
      }

      const taskCount = project.tasks.length;
      const projectName = project.name;

      data.projects.splice(projectIndex, 1);
      saveData(data);

      return {
        content: [{ type: "text", text: `Deleted project "${projectName}" and ${taskCount} tasks` }],
      };
    }

    case "move_task_to_project": {
      const data = loadData();
      if (!args?.taskId || !args?.projectId) {
        return { content: [{ type: "text", text: "Error: taskId and projectId are required" }] };
      }

      const moveResult = findTask(data, args.taskId);
      if (!moveResult) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const targetProject = data.projects.find(p => p.id === args.projectId);
      if (!targetProject) {
        return { content: [{ type: "text", text: `Error: Project ${args.projectId} not found` }] };
      }

      // Remove from source project
      const sourceProject = moveResult.project;
      const taskIndex = sourceProject.tasks.findIndex(t => t.id === args.taskId);
      if (taskIndex === -1) {
        return { content: [{ type: "text", text: "Error: Task not found in source project" }] };
      }
      const [movedTask] = sourceProject.tasks.splice(taskIndex, 1);
      movedTask.updatedAt = new Date().toISOString();

      // Add to target project
      targetProject.tasks.push(movedTask);
      saveData(data);

      return {
        content: [{ type: "text", text: `Moved "${movedTask.name}" from "${sourceProject.name}" to "${targetProject.name}"` }],
      };
    }

    case "get_categories": {
      const data = loadData();
      // Initialize categories if missing
      if (!data.categories) {
        data.categories = [
          { id: "cat-work", name: "Work", color: "#6366f1", order: 0, collapsed: false },
          { id: "cat-personal", name: "Personal", color: "#10b981", order: 1, collapsed: false },
          { id: "cat-side", name: "Side Projects", color: "#f59e0b", order: 2, collapsed: false },
        ];
        saveData(data);
      }

      const categories = data.categories.map((cat) => {
        const projects = data.projects.filter((p) => p.categoryId === cat.id && !p.isInbox);
        const totalTasks = projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.status !== "done").length, 0);
        const completedTasks = projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "done").length, 0);

        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          projectCount: projects.length,
          activeTasks: totalTasks,
          completedTasks: completedTasks,
        };
      });

      // Count uncategorized
      const uncategorized = data.projects.filter((p) => !p.categoryId && !p.isInbox);
      if (uncategorized.length > 0) {
        categories.push({
          id: null,
          name: "Uncategorized",
          color: "#9ca3af",
          projectCount: uncategorized.length,
          activeTasks: uncategorized.reduce((sum, p) => sum + p.tasks.filter((t) => t.status !== "done").length, 0),
          completedTasks: uncategorized.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "done").length, 0),
        });
      }

      return { content: [{ type: "text", text: JSON.stringify(categories, null, 2) }] };
    }

    case "create_category": {
      const data = loadData();
      if (!args?.name) {
        return { content: [{ type: "text", text: "Error: name is required" }] };
      }

      // Initialize categories if missing
      if (!data.categories) {
        data.categories = [];
      }

      const maxOrder = Math.max(0, ...data.categories.map((c) => c.order || 0));
      const category = {
        id: generateId(),
        name: args.name,
        color: args.color || "#6366f1",
        order: maxOrder + 1,
        collapsed: false,
      };

      data.categories.push(category);
      saveData(data);

      return {
        content: [{
          type: "text",
          text: `Category created!\n\nName: ${category.name}\nColor: ${category.color}\nID: ${category.id}`,
        }],
      };
    }

    case "suggest_project_breakdown": {
      const data = loadData();
      let project = null;

      if (args?.projectId) {
        project = data.projects.find((p) => p.id === args.projectId);
      } else if (args?.projectName) {
        project = data.projects.find((p) =>
          p.name.toLowerCase().includes(args.projectName.toLowerCase())
        );
      }

      if (!project) {
        return { content: [{ type: "text", text: "Error: Project not found. Provide a valid projectId or projectName." }] };
      }

      const tasks = project.tasks;
      const activeTasks = tasks.filter((t) => t.status !== "done");
      const completedTasks = tasks.filter((t) => t.status === "done");

      // Analyze existing task patterns
      const hasSubtasks = tasks.some((t) => t.subtasks && t.subtasks.length > 0);
      const hasPriorities = tasks.some((t) => t.priority && t.priority !== "none");
      const hasDueDates = tasks.some((t) => t.dueDate);
      const hasScheduled = tasks.some((t) => t.scheduledTime);

      let output = `## Project Analysis: ${project.name}\n\n`;

      output += `### Current State\n`;
      output += `- Active tasks: ${activeTasks.length}\n`;
      output += `- Completed tasks: ${completedTasks.length}\n`;
      output += `- Has subtasks: ${hasSubtasks ? "Yes" : "No"}\n`;
      output += `- Uses priorities: ${hasPriorities ? "Yes" : "No"}\n`;
      output += `- Has due dates: ${hasDueDates ? "Yes" : "No"}\n`;
      output += `- Has scheduled times: ${hasScheduled ? "Yes" : "No"}\n\n`;

      output += `### Suggested Task Breakdown\n\n`;
      output += `Based on the project "${project.name}", here's a suggested structure:\n\n`;

      output += `**1. Planning & Research** (AI-suitable)\n`;
      output += `   - Define project scope and requirements\n`;
      output += `   - Research best practices and approaches\n`;
      output += `   - Create technical specification\n\n`;

      output += `**2. Setup & Foundation** (Hybrid)\n`;
      output += `   - Set up project structure\n`;
      output += `   - Configure tools and dependencies\n`;
      output += `   - Create initial scaffolding\n\n`;

      output += `**3. Core Implementation** (Varies by task)\n`;
      output += `   - Implement main features\n`;
      output += `   - Build key components\n`;
      output += `   - Integrate dependencies\n\n`;

      output += `**4. Testing & Review** (Hybrid)\n`;
      output += `   - Write and run tests\n`;
      output += `   - Code review and refinement\n`;
      output += `   - Fix bugs and issues\n\n`;

      output += `**5. Documentation & Polish** (AI-suitable)\n`;
      output += `   - Write documentation\n`;
      output += `   - Clean up code\n`;
      output += `   - Final review\n\n`;

      if (activeTasks.length > 0) {
        output += `### Existing Tasks to Categorize\n`;
        activeTasks.forEach((t) => {
          output += `- ${t.name}${t.priority !== "none" ? ` [${t.priority}]` : ""}\n`;
        });
        output += `\n`;
      }

      output += `---\n`;
      output += `**Next Steps:** Would you like me to create specific tasks for any of these phases? `;
      output += `I can also suggest dependencies between tasks to ensure proper execution order.\n`;

      return { content: [{ type: "text", text: output }] };
    }

    case "add_task_dependency": {
      const data = loadData();
      if (!args?.taskId || !args?.blockedByTaskId) {
        return { content: [{ type: "text", text: "Error: taskId and blockedByTaskId are required" }] };
      }

      if (args.taskId === args.blockedByTaskId) {
        return { content: [{ type: "text", text: "Error: A task cannot block itself" }] };
      }

      const taskResult = findTask(data, args.taskId);
      const blockerResult = findTask(data, args.blockedByTaskId);

      if (!taskResult) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }
      if (!blockerResult) {
        return { content: [{ type: "text", text: `Error: Blocker task ${args.blockedByTaskId} not found` }] };
      }

      const task = taskResult.task;
      const blocker = blockerResult.task;

      // Initialize arrays if needed
      if (!Array.isArray(task.blockedBy)) task.blockedBy = [];
      if (!Array.isArray(blocker.blocks)) blocker.blocks = [];

      // Check for circular dependency
      const visited = new Set();
      const stack = [args.blockedByTaskId];
      while (stack.length > 0) {
        const currentId = stack.pop();
        if (currentId === args.taskId) {
          return { content: [{ type: "text", text: "Error: This would create a circular dependency" }] };
        }
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const current = findTask(data, currentId);
        if (current && Array.isArray(current.task.blockedBy)) {
          stack.push(...current.task.blockedBy);
        }
      }

      // Check if already exists
      if (task.blockedBy.includes(args.blockedByTaskId)) {
        return { content: [{ type: "text", text: `Dependency already exists: "${blocker.name}" blocks "${task.name}"` }] };
      }

      // Add the dependency
      task.blockedBy.push(args.blockedByTaskId);
      blocker.blocks.push(args.taskId);
      saveData(data);

      return {
        content: [{
          type: "text",
          text: `Dependency created!\n\n"${task.name}" is now blocked by "${blocker.name}"\n\nThe blocked task cannot start until the blocker is completed.`,
        }],
      };
    }

    case "remove_task_dependency": {
      const data = loadData();
      if (!args?.taskId || !args?.blockedByTaskId) {
        return { content: [{ type: "text", text: "Error: taskId and blockedByTaskId are required" }] };
      }

      const taskResult = findTask(data, args.taskId);
      const blockerResult = findTask(data, args.blockedByTaskId);

      if (!taskResult) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const task = taskResult.task;

      // Remove from blockedBy
      if (Array.isArray(task.blockedBy)) {
        task.blockedBy = task.blockedBy.filter((id) => id !== args.blockedByTaskId);
      }

      // Remove from blocks
      if (blockerResult && Array.isArray(blockerResult.task.blocks)) {
        blockerResult.task.blocks = blockerResult.task.blocks.filter((id) => id !== args.taskId);
      }

      saveData(data);

      return {
        content: [{
          type: "text",
          text: `Dependency removed! "${task.name}" is no longer blocked by "${blockerResult?.task.name || args.blockedByTaskId}"`,
        }],
      };
    }

    case "get_dependency_graph": {
      const data = loadData();
      const tasks = getAllTasks(data);
      let projectTasks = tasks;

      if (args?.projectId) {
        projectTasks = tasks.filter((t) => t.projectId === args.projectId);
      }

      // Find tasks with dependencies
      const withDeps = projectTasks.filter((t) =>
        (t.blockedBy && t.blockedBy.length > 0) || (t.blocks && t.blocks.length > 0)
      );

      if (withDeps.length === 0) {
        return { content: [{ type: "text", text: "No task dependencies found." }] };
      }

      let output = "## Task Dependency Graph\n\n";

      // Build adjacency visualization
      const taskMap = new Map(tasks.map((t) => [t.id, t]));

      // Group by status
      const blocked = withDeps.filter((t) =>
        t.blockedBy && t.blockedBy.some((id) => {
          const blocker = taskMap.get(id);
          return blocker && blocker.status !== "done";
        })
      );

      const blocking = withDeps.filter((t) =>
        t.blocks && t.blocks.length > 0 && t.status !== "done"
      );

      const ready = withDeps.filter((t) =>
        (!t.blockedBy || t.blockedBy.length === 0 ||
          t.blockedBy.every((id) => {
            const blocker = taskMap.get(id);
            return !blocker || blocker.status === "done";
          })) &&
        t.status !== "done"
      );

      output += `### Status Summary\n`;
      output += `- Ready to start: ${ready.length}\n`;
      output += `- Currently blocked: ${blocked.length}\n`;
      output += `- Blocking others: ${blocking.length}\n\n`;

      output += `### Dependency Chains\n\n`;

      for (const task of withDeps) {
        if (task.status === "done") continue;

        const statusEmoji = blocked.includes(task) ? "🔒" : blocking.includes(task) ? "⛓" : "✅";
        output += `${statusEmoji} **${task.name}**`;
        if (task.projectName) output += ` [${task.projectName}]`;
        output += `\n`;

        if (task.blockedBy && task.blockedBy.length > 0) {
          output += `   Blocked by:\n`;
          task.blockedBy.forEach((id) => {
            const blocker = taskMap.get(id);
            if (blocker) {
              const blockerStatus = blocker.status === "done" ? "✓" : "○";
              output += `   ${blockerStatus} ${blocker.name}\n`;
            }
          });
        }

        if (task.blocks && task.blocks.length > 0) {
          output += `   Blocks:\n`;
          task.blocks.forEach((id) => {
            const blockedTask = taskMap.get(id);
            if (blockedTask) {
              output += `   → ${blockedTask.name}\n`;
            }
          });
        }

        output += `\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "suggest_task_order": {
      const data = loadData();
      const tasks = getAllTasks(data);
      let projectTasks = tasks;

      if (args?.projectId) {
        projectTasks = tasks.filter((t) => t.projectId === args.projectId);
      }

      // Filter to active tasks unless includeCompleted
      if (!args?.includeCompleted) {
        projectTasks = projectTasks.filter((t) => t.status !== "done");
      }

      if (projectTasks.length === 0) {
        return { content: [{ type: "text", text: "No tasks found to order." }] };
      }

      const taskMap = new Map(projectTasks.map((t) => [t.id, t]));

      // Topological sort based on dependencies
      const visited = new Set();
      const sorted = [];

      function visit(taskId) {
        if (visited.has(taskId)) return;
        visited.add(taskId);

        const task = taskMap.get(taskId);
        if (!task) return;

        // Visit blockers first
        if (task.blockedBy) {
          for (const blockerId of task.blockedBy) {
            if (taskMap.has(blockerId)) {
              visit(blockerId);
            }
          }
        }

        sorted.push(task);
      }

      // Start with tasks that aren't blocked
      const unblocked = projectTasks.filter((t) =>
        !t.blockedBy || t.blockedBy.length === 0 ||
        t.blockedBy.every((id) => !taskMap.has(id))
      );

      unblocked.forEach((t) => visit(t.id));

      // Visit remaining
      projectTasks.forEach((t) => {
        if (!visited.has(t.id)) visit(t.id);
      });

      // Now sort by priority and due date within unblocked groups
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };

      sorted.sort((a, b) => {
        // Check if one blocks the other
        if (a.blockedBy?.includes(b.id)) return 1;
        if (b.blockedBy?.includes(a.id)) return -1;

        // Then by priority
        const aPri = priorityOrder[a.priority] ?? 4;
        const bPri = priorityOrder[b.priority] ?? 4;
        if (aPri !== bPri) return aPri - bPri;

        // Then by due date
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;

        return 0;
      });

      let output = "## Suggested Task Order\n\n";
      output += "Based on dependencies, priorities, and due dates:\n\n";

      sorted.forEach((task, idx) => {
        const isBlocked = task.blockedBy?.some((id) => {
          const blocker = taskMap.get(id);
          return blocker && blocker.status !== "done";
        });

        const statusIcon = isBlocked ? "🔒" : task.status === "done" ? "✓" : `${idx + 1}.`;

        output += `${statusIcon} **${task.name}**`;
        if (task.priority && task.priority !== "none") output += ` [${task.priority}]`;
        if (task.dueDate) output += ` (due: ${task.dueDate})`;
        if (task.projectName) output += ` [${task.projectName}]`;
        if (isBlocked) output += " ← Blocked";
        output += `\n`;
      });

      output += `\n---\n`;
      output += `**Total:** ${sorted.length} tasks\n`;
      output += `**Ready now:** ${sorted.filter((t) =>
        !t.blockedBy?.some((id) => {
          const blocker = taskMap.get(id);
          return blocker && blocker.status !== "done";
        })
      ).length}\n`;

      return { content: [{ type: "text", text: output }] };
    }

    case "create_subproject": {
      const data = loadData();
      if (!args?.parentProjectId || !args?.name) {
        return { content: [{ type: "text", text: "Error: parentProjectId and name are required" }] };
      }

      const parent = data.projects.find(p => p.id === args.parentProjectId);
      if (!parent) {
        return { content: [{ type: "text", text: `Error: Parent project ${args.parentProjectId} not found` }] };
      }

      const subproject = {
        id: generateId(),
        name: args.name,
        description: args.description || "",
        color: args.color || parent.color,
        parentProjectId: args.parentProjectId,
        level: (parent.level || 0) + 1,
        tasks: [],
        createdAt: new Date().toISOString()
      };

      data.projects.push(subproject);
      saveData(data);

      return {
        content: [{ type: "text", text: `Created sub-project "${args.name}" under "${parent.name}"\nID: ${subproject.id}` }]
      };
    }

    case "get_project_tree": {
      const data = loadData();
      const projects = data.projects.filter(p => !p.isInbox);

      // Build tree structure
      const tree = [];
      const byId = {};

      projects.forEach(p => {
        byId[p.id] = {
          ...p,
          children: [],
          progress: {
            total: p.tasks.length,
            completed: p.tasks.filter(t => t.status === "done").length,
            active: p.tasks.filter(t => t.status !== "done").length
          }
        };
      });

      projects.forEach(p => {
        if (p.parentProjectId && byId[p.parentProjectId]) {
          byId[p.parentProjectId].children.push(byId[p.id]);
        } else if (!p.parentProjectId) {
          tree.push(byId[p.id]);
        }
      });

      function renderTree(nodes, indent = 0) {
        let output = "";
        nodes.forEach(node => {
          const prefix = "  ".repeat(indent);
          const percent = node.progress.total > 0
            ? Math.round(node.progress.completed / node.progress.total * 100)
            : 0;
          output += `${prefix}📁 **${node.name}** (${node.progress.completed}/${node.progress.total} - ${percent}%)\n`;
          if (node.children.length > 0) {
            output += renderTree(node.children, indent + 1);
          }
        });
        return output;
      }

      let output = `## Project Hierarchy\n\n`;
      output += renderTree(tree);

      return { content: [{ type: "text", text: output }] };
    }

    default:
      return null;
  }
}
