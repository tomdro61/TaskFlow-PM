import { getAllTasks, findTask } from "./data.js";

export function getToolDefinitions() {
  return [
    {
      name: "process_brain_dump",
      description: "Analyze raw brain dump text and extract structured task information. Returns suggested task name, description, project, priority, and complexity.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task containing the brain dump to process",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "suggest_subtasks",
      description: "Analyze a task and suggest a breakdown into actionable subtasks. Returns suggestions with reasoning - user decides which to apply.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to break down",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "suggest_priority",
      description: "Analyze a task and suggest an appropriate priority level with reasoning.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task to analyze",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "suggest_next_task",
      description: "Analyze all ready tasks and recommend the single most important task to work on next, with reasoning.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "prioritize_inbox",
      description: "Analyze all inbox/brain dump items and return a ranked list with suggested priorities.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "set_execution_type",
      description: "Set how a task should be executed: 'ai' (Claude does autonomously), 'manual' (requires human), or 'hybrid' (collaborative).",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "ID of the task",
          },
          executionType: {
            type: "string",
            enum: ["ai", "manual", "hybrid"],
            description: "Execution type: 'ai' for Claude-driven, 'manual' for human-driven, 'hybrid' for collaborative",
          },
        },
        required: ["taskId", "executionType"],
      },
    },
    {
      name: "suggest_parallel_tasks",
      description: "Analyze ready/scheduled tasks and suggest pairs that can be done in parallel - one for Claude (AI), one for the human (manual).",
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
      name: "get_parallel_schedule",
      description: "Get the dual-track schedule for a date - showing AI tasks on one track and manual tasks on another, allowing parallel execution.",
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
  ];
}

export function handleTool(name, args, { loadData, saveData }) {
  switch (name) {
    case "process_brain_dump": {
      const data = loadData();
      if (!args?.taskId) {
        return { content: [{ type: "text", text: "Error: taskId is required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task, project } = result;
      const context = `${task.name} ${task.description || ''} ${task.context || ''}`.toLowerCase();

      // Extract structured information from the brain dump
      const analysis = {
        suggestedName: task.name,
        hasDescription: !!task.description,
        hasContext: !!task.context,
        suggestedPriority: "medium",
        suggestedComplexity: 3,
        suggestedProject: project?.name || null,
        keyPhrases: [],
        actionItems: [],
        questions: [],
        blockers: [],
      };

      // Analyze priority signals
      if (context.includes("urgent") || context.includes("asap") || context.includes("critical") || context.includes("emergency")) {
        analysis.suggestedPriority = "urgent";
      } else if (context.includes("important") || context.includes("high priority") || context.includes("deadline")) {
        analysis.suggestedPriority = "high";
      } else if (context.includes("when i get time") || context.includes("nice to have") || context.includes("eventually")) {
        analysis.suggestedPriority = "low";
      }

      // Analyze complexity signals
      let complexityScore = 3;
      if (context.includes("simple") || context.includes("quick") || context.includes("easy")) complexityScore--;
      if (context.includes("complex") || context.includes("complicated") || context.includes("multiple")) complexityScore++;
      if (context.includes("research") || context.includes("investigate") || context.includes("figure out")) complexityScore++;
      if (context.length > 500) complexityScore++;
      if (context.length < 100) complexityScore--;
      analysis.suggestedComplexity = Math.max(1, Math.min(5, complexityScore));

      // Extract questions (lines ending with ?)
      const fullText = task.context || task.description || '';
      const questions = fullText.match(/[^.!?]*\?/g) || [];
      analysis.questions = questions.slice(0, 3);

      // Look for action words to suggest subtasks
      const actionPatterns = [
        /need to ([^.!?]+)/gi,
        /should ([^.!?]+)/gi,
        /have to ([^.!?]+)/gi,
        /must ([^.!?]+)/gi,
        /will ([^.!?]+)/gi,
      ];

      actionPatterns.forEach(pattern => {
        const matches = fullText.match(pattern) || [];
        analysis.actionItems.push(...matches.slice(0, 2));
      });
      analysis.actionItems = [...new Set(analysis.actionItems)].slice(0, 5);

      // Look for blocker signals
      if (context.includes("waiting") || context.includes("blocked") || context.includes("depends on") || context.includes("need from")) {
        analysis.blockers.push("Potential dependency or blocker detected in context");
      }

      let output = `## Brain Dump Analysis: ${task.name}\n\n`;
      output += `### Current State\n`;
      output += `- Has description: ${analysis.hasDescription ? 'Yes' : 'No'}\n`;
      output += `- Has context/brain dump: ${analysis.hasContext ? 'Yes' : 'No'}\n`;
      output += `- Current priority: ${task.priority}\n`;
      output += `- Current status: ${task.status}\n\n`;

      output += `### Suggestions\n`;
      output += `- **Suggested Priority:** ${analysis.suggestedPriority}`;
      if (analysis.suggestedPriority !== task.priority) output += ` (currently: ${task.priority})`;
      output += `\n`;
      output += `- **Complexity Score:** ${analysis.suggestedComplexity}/5\n`;

      if (analysis.questions.length > 0) {
        output += `\n### Questions Found\n`;
        analysis.questions.forEach(q => output += `- ${q.trim()}\n`);
      }

      if (analysis.actionItems.length > 0) {
        output += `\n### Potential Action Items\n`;
        analysis.actionItems.forEach(a => output += `- ${a.trim()}\n`);
      }

      if (analysis.blockers.length > 0) {
        output += `\n### Potential Blockers\n`;
        analysis.blockers.forEach(b => output += `- ${b}\n`);
      }

      output += `\n### Recommended Next Steps\n`;
      if (!analysis.hasContext && !analysis.hasDescription) {
        output += `1. Add more context to clarify what needs to be done\n`;
      }
      if (task.status === 'todo') {
        output += `2. Change status to 'ready' once clarified\n`;
      }
      if (analysis.suggestedPriority !== task.priority) {
        output += `3. Consider updating priority to '${analysis.suggestedPriority}'\n`;
      }
      if (analysis.actionItems.length > 0) {
        output += `4. Consider breaking into subtasks using suggest_subtasks\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "suggest_subtasks": {
      const data = loadData();
      if (!args?.taskId) {
        return { content: [{ type: "text", text: "Error: taskId is required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      const fullText = `${task.name} ${task.description || ''} ${task.context || ''}`;
      const suggestions = [];

      // Common action patterns
      const patterns = [
        { pattern: /need to ([^.!?]+)/gi, prefix: "" },
        { pattern: /should ([^.!?]+)/gi, prefix: "" },
        { pattern: /have to ([^.!?]+)/gi, prefix: "" },
        { pattern: /must ([^.!?]+)/gi, prefix: "" },
        { pattern: /first,? ([^.!?,]+)/gi, prefix: "" },
        { pattern: /then,? ([^.!?,]+)/gi, prefix: "" },
        { pattern: /finally,? ([^.!?,]+)/gi, prefix: "" },
        { pattern: /\d+\.\s*([^.!?\n]+)/gi, prefix: "" },
        { pattern: /-\s*([^.!?\n]+)/gi, prefix: "" },
      ];

      patterns.forEach(({ pattern }) => {
        const matches = fullText.matchAll(pattern);
        for (const match of matches) {
          const suggestion = match[1].trim();
          if (suggestion.length > 5 && suggestion.length < 100 && !suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
        }
      });

      // Add standard workflow suggestions based on task type
      const taskLower = fullText.toLowerCase();

      if (taskLower.includes("write") || taskLower.includes("document") || taskLower.includes("article")) {
        if (!suggestions.some(s => s.includes("outline"))) suggestions.push("Create outline");
        if (!suggestions.some(s => s.includes("draft"))) suggestions.push("Write first draft");
        if (!suggestions.some(s => s.includes("review"))) suggestions.push("Review and edit");
      }

      if (taskLower.includes("research") || taskLower.includes("investigate")) {
        if (!suggestions.some(s => s.includes("gather"))) suggestions.push("Gather sources");
        if (!suggestions.some(s => s.includes("summarize"))) suggestions.push("Summarize findings");
      }

      if (taskLower.includes("meeting") || taskLower.includes("present")) {
        if (!suggestions.some(s => s.includes("agenda"))) suggestions.push("Prepare agenda");
        if (!suggestions.some(s => s.includes("slides"))) suggestions.push("Create slides/materials");
        if (!suggestions.some(s => s.includes("follow"))) suggestions.push("Send follow-up notes");
      }

      if (taskLower.includes("code") || taskLower.includes("develop") || taskLower.includes("implement") || taskLower.includes("build")) {
        if (!suggestions.some(s => s.includes("design"))) suggestions.push("Design approach");
        if (!suggestions.some(s => s.includes("implement"))) suggestions.push("Implement solution");
        if (!suggestions.some(s => s.includes("test"))) suggestions.push("Write tests");
        if (!suggestions.some(s => s.includes("review"))) suggestions.push("Code review");
      }

      // Limit to 7 suggestions
      const finalSuggestions = suggestions.slice(0, 7);

      let output = `## Suggested Subtasks for: ${task.name}\n\n`;

      if (finalSuggestions.length === 0) {
        output += `No obvious subtasks detected from the context.\n\n`;
        output += `### Generic Suggestions\n`;
        output += `Consider breaking this down into:\n`;
        output += `- Research/gather information\n`;
        output += `- Plan approach\n`;
        output += `- Execute main work\n`;
        output += `- Review/finalize\n`;
      } else {
        output += `Based on the task context, here are suggested subtasks:\n\n`;
        finalSuggestions.forEach((s, i) => {
          output += `${i + 1}. ${s}\n`;
        });
        output += `\n### To apply these subtasks:\n`;
        output += `Use create_subtasks with the subtasks you want to create.\n`;
      }

      // Return as JSON for programmatic use
      output += `\n---\n`;
      output += `\`\`\`json\n${JSON.stringify({ taskId: task.id, suggestions: finalSuggestions }, null, 2)}\n\`\`\``;

      return { content: [{ type: "text", text: output }] };
    }

    case "set_execution_type": {
      const data = loadData();
      if (!args?.taskId || !args?.executionType) {
        return { content: [{ type: "text", text: "Error: taskId and executionType are required" }] };
      }

      const validTypes = ["ai", "manual", "hybrid"];
      if (!validTypes.includes(args.executionType)) {
        return { content: [{ type: "text", text: `Error: executionType must be one of: ${validTypes.join(", ")}` }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      task.executionType = args.executionType;
      saveData(data);

      const typeLabels = {
        ai: "🤖 AI (Claude can do autonomously)",
        manual: "👤 Manual (requires your action)",
        hybrid: "🤝 Hybrid (collaborative)",
      };

      return {
        content: [{ type: "text", text: `Updated "${task.name}" execution type to: ${typeLabels[args.executionType]}` }],
      };
    }

    case "suggest_parallel_tasks": {
      const data = loadData();
      const targetDate = args?.date || new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data).filter(t =>
        t.status !== "done" && t.status !== "waiting"
      );

      // Get tasks for today
      const todayTasks = tasks.filter(t =>
        t.scheduledDate === targetDate ||
        t.dueDate === targetDate ||
        t.status === "ready" ||
        t.status === "in-progress"
      );

      // Separate by execution type (default to manual if not set)
      const aiTasks = todayTasks.filter(t => t.executionType === "ai");
      const manualTasks = todayTasks.filter(t => !t.executionType || t.executionType === "manual");
      const hybridTasks = todayTasks.filter(t => t.executionType === "hybrid");

      // Find good parallel pairs
      const suggestions = [];

      // Pair AI tasks with manual tasks that can be done simultaneously
      for (const aiTask of aiTasks) {
        for (const manualTask of manualTasks) {
          // Check if they don't conflict (not same scheduled time)
          const noTimeConflict = !aiTask.scheduledTime || !manualTask.scheduledTime ||
            aiTask.scheduledTime !== manualTask.scheduledTime;

          if (noTimeConflict) {
            suggestions.push({
              aiTask: { id: aiTask.id, name: aiTask.name, estimated: aiTask.estimatedMinutes || 30 },
              manualTask: { id: manualTask.id, name: manualTask.name, estimated: manualTask.estimatedMinutes || 30 },
              reason: "These can be done in parallel - Claude works on one while you do the other",
            });
          }
        }
      }

      // Also suggest untagged tasks that could be parallelized
      const untaggedTasks = todayTasks.filter(t => !t.executionType);

      let output = `## Parallel Task Suggestions for ${targetDate}\n\n`;

      if (suggestions.length > 0) {
        output += `### Recommended Parallel Pairs\n\n`;
        suggestions.slice(0, 3).forEach((s, i) => {
          output += `**Pair ${i + 1}:**\n`;
          output += `- 🤖 Claude: "${s.aiTask.name}" (~${s.aiTask.estimated}m)\n`;
          output += `- 👤 You: "${s.manualTask.name}" (~${s.manualTask.estimated}m)\n`;
          output += `- _${s.reason}_\n\n`;
        });
      } else if (aiTasks.length === 0 && manualTasks.length > 0) {
        output += `### No AI tasks defined yet\n\n`;
        output += `Consider marking some tasks as AI-executable using set_execution_type.\n`;
        output += `Good candidates for AI tasks:\n`;
        output += `- Research and summarization\n`;
        output += `- Code generation and refactoring\n`;
        output += `- Writing first drafts\n`;
        output += `- Data analysis\n\n`;
      }

      output += `### Current Task Distribution\n`;
      output += `- 🤖 AI tasks: ${aiTasks.length}\n`;
      output += `- 👤 Manual tasks: ${manualTasks.length}\n`;
      output += `- 🤝 Hybrid tasks: ${hybridTasks.length}\n`;
      output += `- ❓ Untagged: ${untaggedTasks.length}\n`;

      return { content: [{ type: "text", text: output }] };
    }

    case "get_parallel_schedule": {
      const data = loadData();
      const targetDate = args?.date || new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data).filter(t =>
        t.status !== "done" &&
        (t.scheduledDate === targetDate || t.dueDate === targetDate)
      );

      // Separate by execution type
      const aiTasks = tasks.filter(t => t.executionType === "ai")
        .sort((a, b) => (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"));
      const manualTasks = tasks.filter(t => !t.executionType || t.executionType === "manual")
        .sort((a, b) => (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"));
      const hybridTasks = tasks.filter(t => t.executionType === "hybrid")
        .sort((a, b) => (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"));

      let output = `## Parallel Schedule for ${targetDate}\n\n`;

      // AI Track
      output += `### 🤖 CLAUDE TRACK\n`;
      if (aiTasks.length === 0) {
        output += `_No AI tasks scheduled_\n\n`;
      } else {
        aiTasks.forEach(t => {
          const time = t.scheduledTime || "Unscheduled";
          const duration = t.estimatedMinutes ? `(${t.estimatedMinutes}m)` : "";
          output += `- **${time}** ${t.name} ${duration}\n`;
          output += `  ID: ${t.id}\n`;
        });
        output += `\n`;
      }

      // Manual Track
      output += `### 👤 YOUR TRACK\n`;
      if (manualTasks.length === 0) {
        output += `_No manual tasks scheduled_\n\n`;
      } else {
        manualTasks.forEach(t => {
          const time = t.scheduledTime || "Unscheduled";
          const duration = t.estimatedMinutes ? `(${t.estimatedMinutes}m)` : "";
          output += `- **${time}** ${t.name} ${duration}\n`;
          output += `  ID: ${t.id}\n`;
        });
        output += `\n`;
      }

      // Hybrid Track
      if (hybridTasks.length > 0) {
        output += `### 🤝 COLLABORATIVE TRACK\n`;
        hybridTasks.forEach(t => {
          const time = t.scheduledTime || "Unscheduled";
          const duration = t.estimatedMinutes ? `(${t.estimatedMinutes}m)` : "";
          output += `- **${time}** ${t.name} ${duration}\n`;
          output += `  ID: ${t.id}\n`;
        });
        output += `\n`;
      }

      // Summary
      const totalAiMins = aiTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
      const totalManualMins = manualTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);

      output += `---\n`;
      output += `**Summary:**\n`;
      output += `- Claude track: ${aiTasks.length} tasks, ~${Math.floor(totalAiMins / 60)}h ${totalAiMins % 60}m\n`;
      output += `- Your track: ${manualTasks.length} tasks, ~${Math.floor(totalManualMins / 60)}h ${totalManualMins % 60}m\n`;
      output += `- Collaborative: ${hybridTasks.length} tasks\n`;

      return { content: [{ type: "text", text: output }] };
    }

    case "suggest_priority": {
      const data = loadData();
      if (!args?.taskId) {
        return { content: [{ type: "text", text: "Error: taskId is required" }] };
      }

      const result = findTask(data, args.taskId);
      if (!result) {
        return { content: [{ type: "text", text: `Error: Task ${args.taskId} not found` }] };
      }

      const { task } = result;
      const fullText = `${task.name} ${task.description || ''} ${task.context || ''}`.toLowerCase();
      const today = new Date().toISOString().split("T")[0];

      let suggestedPriority = "medium";
      const reasons = [];

      // Check for urgency signals in text
      if (fullText.includes("urgent") || fullText.includes("asap") || fullText.includes("emergency") || fullText.includes("critical")) {
        suggestedPriority = "urgent";
        reasons.push("Contains urgency keywords (urgent, asap, emergency, critical)");
      } else if (fullText.includes("important") || fullText.includes("high priority") || fullText.includes("crucial")) {
        suggestedPriority = "high";
        reasons.push("Contains importance keywords (important, high priority, crucial)");
      } else if (fullText.includes("eventually") || fullText.includes("nice to have") || fullText.includes("when i get time") || fullText.includes("low priority")) {
        suggestedPriority = "low";
        reasons.push("Contains low-priority keywords (eventually, nice to have)");
      }

      // Check due date
      if (task.dueDate) {
        if (task.dueDate < today) {
          if (suggestedPriority !== "urgent") {
            suggestedPriority = "urgent";
            reasons.push(`Task is OVERDUE (was due ${task.dueDate})`);
          }
        } else if (task.dueDate === today) {
          if (suggestedPriority === "low" || suggestedPriority === "medium") {
            suggestedPriority = "high";
            reasons.push("Task is due TODAY");
          }
        } else {
          const dueDate = new Date(task.dueDate);
          const todayDate = new Date(today);
          const daysUntil = Math.ceil((dueDate - todayDate) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 2 && suggestedPriority === "low") {
            suggestedPriority = "medium";
            reasons.push(`Task is due in ${daysUntil} days`);
          }
        }
      }

      // Check for blocked status
      if (task.status === "waiting") {
        reasons.push("Task is currently blocked/waiting - priority may be less relevant until unblocked");
      }

      let output = `## Priority Suggestion: ${task.name}\n\n`;
      output += `**Current Priority:** ${task.priority}\n`;
      output += `**Suggested Priority:** ${suggestedPriority}\n\n`;

      if (reasons.length > 0) {
        output += `### Reasoning\n`;
        reasons.forEach(r => output += `- ${r}\n`);
        output += `\n`;
      }

      if (suggestedPriority !== task.priority) {
        output += `### Action\n`;
        output += `To update the priority, use:\n`;
        output += `\`update_task\` with taskId: "${task.id}" and priority: "${suggestedPriority}"\n`;
      } else {
        output += `Current priority appears appropriate.\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "suggest_next_task": {
      const data = loadData();
      const today = new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data).filter(t =>
        t.status !== "done" && t.status !== "waiting"
      );

      if (tasks.length === 0) {
        return { content: [{ type: "text", text: "No active tasks available! Either all tasks are complete, or they're blocked/waiting." }] };
      }

      // Score each task
      const scored = tasks.map(task => {
        let score = 0;
        const reasons = [];

        // Scheduled now/soon
        if (task.scheduledDate === today && task.scheduledTime) {
          const now = new Date();
          const [h, m] = task.scheduledTime.split(":").map(Number);
          const scheduledMins = h * 60 + m;
          const currentMins = now.getHours() * 60 + now.getMinutes();

          if (currentMins >= scheduledMins && currentMins <= scheduledMins + (task.estimatedMinutes || 60)) {
            score += 100;
            reasons.push("Scheduled for RIGHT NOW");
          } else if (currentMins < scheduledMins && scheduledMins - currentMins <= 60) {
            score += 50;
            reasons.push("Scheduled within the next hour");
          }
        }

        // Overdue
        if (task.dueDate && task.dueDate < today) {
          score += 80;
          reasons.push(`OVERDUE since ${task.dueDate}`);
        }

        // Due today
        if (task.dueDate === today) {
          score += 40;
          reasons.push("Due TODAY");
        }

        // Priority
        if (task.priority === "urgent") {
          score += 35;
          reasons.push("Marked as URGENT");
        } else if (task.priority === "high") {
          score += 25;
          reasons.push("High priority");
        } else if (task.priority === "medium") {
          score += 10;
          reasons.push("Medium priority");
        }

        // Status
        if (task.status === "in-progress") {
          score += 20;
          reasons.push("Already in progress");
        } else if (task.status === "ready") {
          score += 10;
          reasons.push("Ready to work on");
        }

        // Complexity preference (prefer simpler tasks for quick wins)
        if (task.complexity === 1) score += 5;
        if (task.complexity === 2) score += 3;

        return { task, score, reasons };
      });

      scored.sort((a, b) => b.score - a.score);
      const top = scored[0];
      const project = data.projects.find(p => p.tasks.some(t => t.id === top.task.id));

      let output = `## Recommended Next Task\n\n`;
      output += `### ${top.task.name}\n\n`;
      output += `**ID:** ${top.task.id}\n`;
      output += `**Status:** ${top.task.status}\n`;
      output += `**Priority:** ${top.task.priority}\n`;
      if (top.task.dueDate) output += `**Due:** ${top.task.dueDate}\n`;
      if (project && !project.isInbox) output += `**Project:** ${project.name}\n`;
      if (top.task.estimatedMinutes) output += `**Estimated:** ${top.task.estimatedMinutes} min\n`;
      output += `\n`;

      output += `### Why This Task?\n`;
      top.reasons.forEach(r => output += `- ${r}\n`);
      output += `\n`;

      if (top.task.context || top.task.description) {
        output += `### Context\n`;
        output += top.task.description ? `${top.task.description}\n` : '';
        if (top.task.context) {
          const preview = top.task.context.length > 200
            ? top.task.context.substring(0, 200) + '...'
            : top.task.context;
          output += preview + '\n';
        }
        output += `\n`;
      }

      output += `### Next Steps\n`;
      output += `1. Start working on this task\n`;
      output += `2. Use \`update_task\` to set status to 'in-progress'\n`;
      if (top.task.subtasks && top.task.subtasks.length > 0) {
        const pending = top.task.subtasks.filter(s => s.status !== 'done').length;
        output += `3. ${pending} subtask(s) pending\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "prioritize_inbox": {
      const data = loadData();
      const inbox = data.projects.find(p => p.isInbox || p.id === "inbox");
      if (!inbox || inbox.tasks.length === 0) {
        return { content: [{ type: "text", text: "Inbox is empty! No items to prioritize." }] };
      }

      const inboxTasks = inbox.tasks.filter(t => t.status === "todo");
      if (inboxTasks.length === 0) {
        return { content: [{ type: "text", text: "No unprocessed inbox items. All tasks have been organized." }] };
      }

      const today = new Date().toISOString().split("T")[0];

      // Score and prioritize
      const prioritized = inboxTasks.map(task => {
        const fullText = `${task.name} ${task.description || ''} ${task.context || ''}`.toLowerCase();
        let suggestedPriority = "medium";
        let score = 50;
        const signals = [];

        // Urgency signals
        if (fullText.includes("urgent") || fullText.includes("asap") || fullText.includes("emergency")) {
          suggestedPriority = "urgent";
          score += 40;
          signals.push("urgency keywords");
        } else if (fullText.includes("important") || fullText.includes("deadline") || fullText.includes("due")) {
          suggestedPriority = "high";
          score += 25;
          signals.push("importance keywords");
        } else if (fullText.includes("eventually") || fullText.includes("someday") || fullText.includes("nice to have")) {
          suggestedPriority = "low";
          score -= 20;
          signals.push("low-priority keywords");
        }

        // Due date
        if (task.dueDate) {
          if (task.dueDate < today) {
            suggestedPriority = "urgent";
            score += 50;
            signals.push("OVERDUE");
          } else if (task.dueDate === today) {
            if (suggestedPriority !== "urgent") suggestedPriority = "high";
            score += 30;
            signals.push("due today");
          }
        }

        // Context richness (more context = probably more thought through)
        if (task.context && task.context.length > 100) {
          score += 10;
          signals.push("detailed context");
        }

        // Age (older items might need attention)
        const age = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (age > 7) {
          score += 5;
          signals.push(`${Math.floor(age)} days old`);
        }

        return { task, suggestedPriority, score, signals };
      });

      prioritized.sort((a, b) => b.score - a.score);

      let output = `## Inbox Prioritization (${inboxTasks.length} items)\n\n`;
      output += `Items ranked by suggested importance:\n\n`;

      prioritized.forEach((item, index) => {
        output += `### ${index + 1}. ${item.task.name}\n`;
        output += `- **ID:** ${item.task.id}\n`;
        output += `- **Current Priority:** ${item.task.priority}\n`;
        output += `- **Suggested Priority:** ${item.suggestedPriority}\n`;
        if (item.signals.length > 0) {
          output += `- **Signals:** ${item.signals.join(", ")}\n`;
        }
        output += `\n`;
      });

      output += `---\n`;
      output += `### Summary\n`;
      const urgent = prioritized.filter(p => p.suggestedPriority === "urgent").length;
      const high = prioritized.filter(p => p.suggestedPriority === "high").length;
      const medium = prioritized.filter(p => p.suggestedPriority === "medium").length;
      const low = prioritized.filter(p => p.suggestedPriority === "low").length;

      output += `- Urgent: ${urgent}\n`;
      output += `- High: ${high}\n`;
      output += `- Medium: ${medium}\n`;
      output += `- Low: ${low}\n`;
      output += `\nUse \`update_task\` to apply suggested priorities.\n`;

      return { content: [{ type: "text", text: output }] };
    }

    default:
      return null;
  }
}
