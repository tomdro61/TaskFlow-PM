import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Data layer
import {
  loadData,
  saveData,
  withLock,
  getAllTasks,
  formatTaskForDisplay,
} from "./data.js";

// Tool modules
import * as toolsCore from "./tools-core.js";
import * as toolsViews from "./tools-views.js";
import * as toolsScheduling from "./tools-scheduling.js";
import * as toolsAi from "./tools-ai.js";
import * as toolsRecaps from "./tools-recaps.js";
import * as toolsProjects from "./tools-projects.js";
import * as toolsAnalytics from "./tools-analytics.js";
import * as toolsNotion from "./tools-notion.js";

// All tool modules in order for routing
const toolModules = [
  toolsCore,
  toolsViews,
  toolsScheduling,
  toolsAi,
  toolsRecaps,
  toolsProjects,
  toolsAnalytics,
  toolsNotion,
];

// Create MCP Server
const server = new Server(
  {
    name: "taskflow-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools - concatenate all module definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [];
  for (const mod of toolModules) {
    tools.push(...mod.getToolDefinitions());
  }
  return { tools };
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "taskflow://tasks",
        name: "All Tasks",
        description: "Complete task list from TaskFlow",
        mimeType: "text/plain",
      },
      {
        uri: "taskflow://summary",
        name: "Task Summary",
        description: "Quick summary of task status",
        mimeType: "text/plain",
      },
    ],
  };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const data = loadData();
  const tasks = getAllTasks(data);

  if (request.params.uri === "taskflow://tasks") {
    let content = "# TaskFlow Tasks\n\n";

    const byStatus = {
      "todo": tasks.filter((t) => t.status === "todo"),
      "in-progress": tasks.filter((t) => t.status === "in-progress"),
      "review": tasks.filter((t) => t.status === "review"),
      "done": tasks.filter((t) => t.status === "done"),
    };

    for (const [status, statusTasks] of Object.entries(byStatus)) {
      if (statusTasks.length > 0) {
        content += `## ${status.toUpperCase()} (${statusTasks.length})\n`;
        for (const task of statusTasks) {
          const project = data.projects.find((p) => p.id === task.projectId);
          content += formatTaskForDisplay(task, project, data.tags) + "\n";
        }
        content += "\n";
      }
    }

    return {
      contents: [{ uri: request.params.uri, mimeType: "text/plain", text: content }],
    };
  }

  if (request.params.uri === "taskflow://summary") {
    const today = new Date().toISOString().split("T")[0];
    const active = tasks.filter((t) => t.status !== "done");
    const todayTasks = active.filter((t) => t.dueDate === today);
    const overdue = active.filter((t) => t.dueDate && t.dueDate < today);
    const highPriority = active.filter((t) => t.priority === "high" || t.priority === "urgent");

    const content = `# TaskFlow Summary

**Total Active Tasks:** ${active.length}
**Due Today:** ${todayTasks.length}
**Overdue:** ${overdue.length}
**High Priority:** ${highPriority.length}

## Projects
${data.projects
  .filter((p) => !p.isInbox)
  .map((p) => `- ${p.name}: ${p.tasks.filter((t) => t.status !== "done").length} active tasks`)
  .join("\n")}
`;

    return {
      contents: [{ uri: request.params.uri, mimeType: "text/plain", text: content }],
    };
  }

  throw new Error(`Unknown resource: ${request.params.uri}`);
});

// Handle tool calls - route to the appropriate module
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return withLock(async () => {
    const { name, arguments: args } = request.params;

    // Try each module's handleTool until one handles it (returns non-null)
    for (const mod of toolModules) {
      const result = await mod.handleTool(name, args, { loadData, saveData });
      if (result !== null && result !== undefined) {
        return result;
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  });
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TaskFlow MCP Server running");
}

main().catch(console.error);
