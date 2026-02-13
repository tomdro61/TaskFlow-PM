import { generateId, getAllTasks } from "./data.js";

export function getToolDefinitions() {
  return [
    {
      name: "daily_recap",
      description: "Get a recap of what was accomplished today and learnings.",
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
      name: "weekly_review",
      description: "Get a comprehensive review of the past week - accomplishments, time spent, learnings, and patterns.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "plan_my_day",
      description: "Get a suggested plan for today based on due dates and priorities. Shows task goals and action plans.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "add_recap_entry",
      description: "Log an accomplishment, decision, or note to the recap journal. Use this to document important things as they happen.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["accomplishment", "decision", "note"],
            description: "Type of entry: accomplishment (something completed), decision (choice made), or note (observation/insight)",
          },
          content: {
            type: "string",
            description: "The content of the entry - what was accomplished, decided, or noted",
          },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format. Defaults to today.",
          },
          relatedTaskId: {
            type: "string",
            description: "Optional task ID this entry relates to",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Optional tags/categories for the entry",
          },
        },
        required: ["type", "content"],
      },
    },
    {
      name: "get_recap_log",
      description: "View logged recap entries (accomplishments, decisions, notes) for a date range.",
      inputSchema: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in YYYY-MM-DD format. Defaults to today.",
          },
          endDate: {
            type: "string",
            description: "End date in YYYY-MM-DD format. Defaults to startDate.",
          },
          type: {
            type: "string",
            enum: ["accomplishment", "decision", "note", "all"],
            description: "Filter by entry type. Defaults to 'all'.",
          },
        },
      },
    },
    {
      name: "save_recap",
      description: "Generate and save a recap document for a specific period. This creates a permanent record combining task data with logged entries.",
      inputSchema: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["daily", "weekly", "monthly"],
            description: "Period type for the recap",
          },
          date: {
            type: "string",
            description: "Reference date in YYYY-MM-DD format. For daily: that day. For weekly: week containing that date. For monthly: that month. Defaults to today.",
          },
          summary: {
            type: "string",
            description: "Optional executive summary or highlights to include",
          },
          highlights: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of key highlights to feature",
          },
        },
        required: ["period"],
      },
    },
    {
      name: "get_saved_recaps",
      description: "View previously saved recap documents.",
      inputSchema: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["daily", "weekly", "monthly", "all"],
            description: "Filter by period type. Defaults to 'all'.",
          },
          limit: {
            type: "number",
            description: "Max number of recaps to return. Defaults to 10.",
          },
        },
      },
    },
    {
      name: "get_recap_by_id",
      description: "View the full content of a saved recap document by its ID.",
      inputSchema: {
        type: "object",
        properties: {
          recapId: {
            type: "string",
            description: "ID of the saved recap to view",
          },
        },
        required: ["recapId"],
      },
    },
    {
      name: "delete_recap_entry",
      description: "Delete a recap log entry by ID.",
      inputSchema: {
        type: "object",
        properties: {
          entryId: {
            type: "string",
            description: "ID of the recap entry to delete",
          },
        },
        required: ["entryId"],
      },
    },
  ];
}

export function handleTool(name, args, { loadData, saveData }) {
  switch (name) {
    case "daily_recap": {
      const data = loadData();
      const targetDate = args?.date || new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data);

      // Tasks completed on this date
      const completedToday = tasks.filter((t) => {
        if (!t.completedAt) return false;
        return t.completedAt.split("T")[0] === targetDate;
      });

      // Time logged on this date
      let totalMinutesLogged = 0;
      const timeEntries = [];
      tasks.forEach((t) => {
        if (t.timeLog) {
          t.timeLog.forEach((entry) => {
            if (entry.loggedAt.split("T")[0] === targetDate) {
              totalMinutesLogged += entry.minutes;
              timeEntries.push({ task: t.name, ...entry });
            }
          });
        }
      });

      // Learnings from today
      const todaysLearnings = [];
      tasks.forEach((t) => {
        if (t.learnings) {
          t.learnings.forEach((l) => {
            if (l.addedAt.split("T")[0] === targetDate) {
              todaysLearnings.push({ task: t.name, learning: l.text });
            }
          });
        }
      });

      const hours = Math.floor(totalMinutesLogged / 60);
      const mins = totalMinutesLogged % 60;

      let output = `## Daily Recap: ${targetDate}\n\n`;

      output += `### Accomplished (${completedToday.length} tasks)\n`;
      if (completedToday.length > 0) {
        completedToday.forEach((t) => {
          output += `- ✓ ${t.name}`;
          if (t.goal) output += `\n  Goal: ${t.goal}`;
          output += `\n`;
        });
      } else {
        output += `No tasks completed.\n`;
      }

      output += `\n### Time Invested: ${hours}h ${mins}m\n`;
      if (timeEntries.length > 0) {
        timeEntries.forEach((e) => {
          output += `- ${e.task}: ${e.minutes} min`;
          if (e.notes) output += ` - ${e.notes}`;
          output += `\n`;
        });
      }

      output += `\n### What We Learned\n`;
      if (todaysLearnings.length > 0) {
        todaysLearnings.forEach((l) => {
          output += `- ${l.learning} (from: ${l.task})\n`;
        });
      } else {
        output += `No learnings recorded today.\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "weekly_review": {
      const data = loadData();
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const todayStr = today.toISOString().split("T")[0];
      const weekAgoStr = weekAgo.toISOString().split("T")[0];

      const tasks = getAllTasks(data);

      // Completed this week
      const completedThisWeek = tasks.filter((t) => {
        if (!t.completedAt) return false;
        const completed = t.completedAt.split("T")[0];
        return completed >= weekAgoStr && completed <= todayStr;
      });

      // Time logged this week
      let totalMinutes = 0;
      const projectTime = {};
      tasks.forEach((t) => {
        if (t.timeLog) {
          const project = data.projects.find((p) => p.id === t.projectId);
          const projectName = project?.name || "Inbox";

          t.timeLog.forEach((entry) => {
            const logDate = entry.loggedAt.split("T")[0];
            if (logDate >= weekAgoStr && logDate <= todayStr) {
              totalMinutes += entry.minutes;
              projectTime[projectName] = (projectTime[projectName] || 0) + entry.minutes;
            }
          });
        }
      });

      // All learnings this week
      const weekLearnings = [];
      tasks.forEach((t) => {
        if (t.learnings) {
          t.learnings.forEach((l) => {
            const learnDate = l.addedAt.split("T")[0];
            if (learnDate >= weekAgoStr && learnDate <= todayStr) {
              weekLearnings.push({ task: t.name, learning: l.text });
            }
          });
        }
      });

      // Still active tasks
      const activeTasks = tasks.filter((t) => t.status !== "done");
      const overdue = activeTasks.filter((t) => t.dueDate && t.dueDate < todayStr);

      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      let output = `## Weekly Review (${weekAgoStr} to ${todayStr})\n\n`;

      output += `### Summary\n`;
      output += `- **Tasks Completed:** ${completedThisWeek.length}\n`;
      output += `- **Time Invested:** ${hours}h ${mins}m\n`;
      output += `- **Active Tasks:** ${activeTasks.length}\n`;
      output += `- **Overdue:** ${overdue.length}\n\n`;

      output += `### Accomplishments\n`;
      if (completedThisWeek.length > 0) {
        completedThisWeek.forEach((t) => {
          const project = data.projects.find((p) => p.id === t.projectId);
          output += `- ✓ ${t.name}`;
          if (project && !project.isInbox) output += ` [${project.name}]`;
          output += `\n`;
        });
      } else {
        output += `No tasks completed this week.\n`;
      }

      output += `\n### Time by Project\n`;
      if (Object.keys(projectTime).length > 0) {
        Object.entries(projectTime)
          .sort((a, b) => b[1] - a[1])
          .forEach(([project, minutes]) => {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            output += `- ${project}: ${h}h ${m}m\n`;
          });
      } else {
        output += `No time logged this week.\n`;
      }

      output += `\n### What We Learned Together\n`;
      if (weekLearnings.length > 0) {
        weekLearnings.forEach((l) => {
          output += `- ${l.learning}\n`;
        });
      } else {
        output += `No learnings recorded this week.\n`;
      }

      if (overdue.length > 0) {
        output += `\n### Needs Attention (Overdue)\n`;
        overdue.forEach((t) => {
          output += `- ${t.name} (was due ${t.dueDate})\n`;
        });
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "plan_my_day": {
      const data = loadData();
      const today = new Date().toISOString().split("T")[0];
      const tasks = getAllTasks(data).filter((t) => t.status !== "done");

      const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today);
      const dueToday = tasks.filter((t) => t.dueDate === today);
      const highPriority = tasks.filter(
        (t) => (t.priority === "urgent" || t.priority === "high") && !dueToday.includes(t) && !overdue.includes(t)
      );
      const inProgress = tasks.filter(
        (t) => t.status === "in-progress" && !dueToday.includes(t) && !overdue.includes(t) && !highPriority.includes(t)
      );

      // Get scheduled tasks for today
      const scheduledToday = tasks.filter(t => t.scheduledDate === today && t.scheduledTime)
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

      // Helper to format a task with goal and action plan
      const formatTaskWithDetails = (t) => {
        let str = `**${t.name}**`;
        if (t.priority !== "none") str += ` !${t.priority}`;
        str += `\n`;
        str += `  ID: ${t.id}\n`;

        // Add scheduling info
        if (t.scheduledTime) {
          str += `  Scheduled: ${t.scheduledTime}`;
          if (t.estimatedMinutes) str += ` (${t.estimatedMinutes}m)`;
          str += `\n`;
        } else if (t.estimatedMinutes) {
          str += `  Estimated: ${t.estimatedMinutes}m\n`;
        }

        if (t.goal) {
          str += `  Goal: ${t.goal}\n`;
        }

        if (t.subtasks && t.subtasks.length > 0) {
          str += `  Action Plan:\n`;
          t.subtasks.forEach((st) => {
            str += `    ${st.status === "done" ? "✓" : "○"} ${st.name}\n`;
          });
        }

        if (t.timeLog && t.timeLog.length > 0) {
          const totalMins = t.timeLog.reduce((sum, e) => sum + e.minutes, 0);
          str += `  Time invested: ${Math.floor(totalMins / 60)}h ${totalMins % 60}m\n`;
        }

        return str;
      };

      let output = `## Your Day Plan\n\n`;

      // Show scheduled tasks first as a time-blocked schedule
      if (scheduledToday.length > 0) {
        output += `### ⏰ Today's Schedule\n\n`;
        let totalScheduledMins = 0;
        scheduledToday.forEach((t) => {
          const duration = t.estimatedMinutes || 30;
          totalScheduledMins += duration;
          const [h, m] = t.scheduledTime.split(":").map(Number);
          const endMins = h * 60 + m + duration;
          const endH = Math.floor(endMins / 60) % 24;
          const endM = endMins % 60;
          const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

          output += `**${t.scheduledTime} - ${endTime}** ${t.name}`;
          if (t.priority !== "none") output += ` !${t.priority}`;
          output += `\n`;
          output += `  ID: ${t.id}\n\n`;
        });
        const schedH = Math.floor(totalScheduledMins / 60);
        const schedM = totalScheduledMins % 60;
        output += `Total scheduled: ${schedH}h ${schedM}m\n\n`;
      }

      if (overdue.length > 0) {
        output += `### 🔴 Overdue - Handle First\n\n`;
        overdue.forEach((t) => {
          output += formatTaskWithDetails(t);
          output += `  Was due: ${t.dueDate}\n\n`;
        });
      }

      // Filter out already-scheduled tasks from due today
      const unscheduledDueToday = dueToday.filter(t => !t.scheduledTime);
      if (unscheduledDueToday.length > 0) {
        output += `### 🟡 Due Today (Unscheduled)\n\n`;
        unscheduledDueToday.forEach((t) => {
          output += formatTaskWithDetails(t) + `\n`;
        });
      }

      if (highPriority.length > 0) {
        output += `### 🟠 High Priority\n\n`;
        highPriority.slice(0, 3).forEach((t) => {
          output += formatTaskWithDetails(t) + `\n`;
        });
      }

      if (inProgress.length > 0) {
        output += `### 🔵 Continue Working On\n\n`;
        inProgress.slice(0, 3).forEach((t) => {
          output += formatTaskWithDetails(t) + `\n`;
        });
      }

      const totalForToday = overdue.length + dueToday.length + Math.min(highPriority.length, 3);
      output += `---\n`;
      output += `**Suggested focus:** ${totalForToday} tasks for today\n`;

      // Calculate total estimated time
      const allDayTasks = [...overdue, ...dueToday, ...highPriority.slice(0, 3)];
      const totalEstMins = allDayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
      const estH = Math.floor(totalEstMins / 60);
      const estM = totalEstMins % 60;
      output += `**Estimated time:** ~${estH}h ${estM}m\n`;

      if (totalForToday === 0) {
        output += `\nNo urgent tasks! Consider:\n`;
        output += `- Working on upcoming deadlines\n`;
        output += `- Tackling low-priority items\n`;
        output += `- Planning future projects\n`;
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "add_recap_entry": {
      const data = loadData();
      if (!args?.type || !args?.content) {
        return { content: [{ type: "text", text: "Error: type and content are required" }] };
      }

      // Initialize recapLog if it doesn't exist
      if (!data.recapLog) {
        data.recapLog = [];
      }

      const entry = {
        id: generateId(),
        type: args.type,
        content: args.content,
        date: args.date || new Date().toISOString().split("T")[0],
        relatedTaskId: args.relatedTaskId || null,
        tags: args.tags || [],
        createdAt: new Date().toISOString(),
      };

      data.recapLog.push(entry);
      saveData(data);

      const typeEmoji = {
        accomplishment: "✓",
        decision: "⚖",
        note: "📝",
      };

      return {
        content: [{
          type: "text",
          text: `${typeEmoji[entry.type]} Logged ${entry.type}: "${entry.content}"\n\nEntry ID: ${entry.id}\nDate: ${entry.date}`,
        }],
      };
    }

    case "get_recap_log": {
      const data = loadData();
      const today = new Date().toISOString().split("T")[0];
      const startDate = args?.startDate || today;
      const endDate = args?.endDate || startDate;
      const filterType = args?.type || "all";

      if (!data.recapLog || data.recapLog.length === 0) {
        return { content: [{ type: "text", text: "No recap entries logged yet. Use add_recap_entry to start logging accomplishments and decisions." }] };
      }

      const entries = data.recapLog.filter((entry) => {
        const dateMatch = entry.date >= startDate && entry.date <= endDate;
        const typeMatch = filterType === "all" || entry.type === filterType;
        return dateMatch && typeMatch;
      });

      if (entries.length === 0) {
        return { content: [{ type: "text", text: `No entries found for ${startDate} to ${endDate}${filterType !== "all" ? ` (type: ${filterType})` : ""}` }] };
      }

      // Group by date
      const byDate = {};
      entries.forEach((entry) => {
        if (!byDate[entry.date]) byDate[entry.date] = [];
        byDate[entry.date].push(entry);
      });

      const typeEmoji = {
        accomplishment: "✓",
        decision: "⚖",
        note: "📝",
      };

      let output = `## Recap Log: ${startDate}${startDate !== endDate ? ` to ${endDate}` : ""}\n\n`;

      Object.keys(byDate)
        .sort()
        .reverse()
        .forEach((date) => {
          const dayName = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
          output += `### ${date} (${dayName})\n`;

          byDate[date].forEach((entry) => {
            output += `- ${typeEmoji[entry.type]} **${entry.type}:** ${entry.content}`;
            if (entry.tags && entry.tags.length > 0) {
              output += ` [${entry.tags.join(", ")}]`;
            }
            output += `\n  ID: ${entry.id}\n`;
          });
          output += `\n`;
        });

      const counts = {
        accomplishment: entries.filter((e) => e.type === "accomplishment").length,
        decision: entries.filter((e) => e.type === "decision").length,
        note: entries.filter((e) => e.type === "note").length,
      };

      output += `---\n**Summary:** ${counts.accomplishment} accomplishments, ${counts.decision} decisions, ${counts.note} notes\n`;

      return { content: [{ type: "text", text: output }] };
    }

    case "save_recap": {
      const data = loadData();
      if (!args?.period) {
        return { content: [{ type: "text", text: "Error: period is required (daily, weekly, or monthly)" }] };
      }

      const today = new Date();
      const refDate = args.date ? new Date(args.date + "T12:00:00") : today;
      let startDate, endDate, periodLabel;

      if (args.period === "daily") {
        startDate = refDate.toISOString().split("T")[0];
        endDate = startDate;
        periodLabel = startDate;
      } else if (args.period === "weekly") {
        // Get week start (Sunday) and end (Saturday)
        const dayOfWeek = refDate.getDay();
        const weekStart = new Date(refDate);
        weekStart.setDate(refDate.getDate() - dayOfWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        startDate = weekStart.toISOString().split("T")[0];
        endDate = weekEnd.toISOString().split("T")[0];
        periodLabel = `Week of ${startDate}`;
      } else if (args.period === "monthly") {
        startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1).toISOString().split("T")[0];
        endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).toISOString().split("T")[0];
        const monthName = refDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        periodLabel = monthName;
      }

      // Initialize savedRecaps if needed
      if (!data.savedRecaps) {
        data.savedRecaps = [];
      }

      // Gather tasks completed in this period
      const tasks = getAllTasks(data);
      const completedTasks = tasks.filter((t) => {
        if (!t.completedAt) return false;
        const completed = t.completedAt.split("T")[0];
        return completed >= startDate && completed <= endDate;
      });

      // Gather recap log entries
      const logEntries = (data.recapLog || []).filter((entry) => {
        return entry.date >= startDate && entry.date <= endDate;
      });

      const accomplishments = logEntries.filter((e) => e.type === "accomplishment");
      const decisions = logEntries.filter((e) => e.type === "decision");
      const notes = logEntries.filter((e) => e.type === "note");

      // Calculate time invested
      let totalMinutes = 0;
      tasks.forEach((t) => {
        if (t.timeLog) {
          t.timeLog.forEach((entry) => {
            const logDate = entry.loggedAt.split("T")[0];
            if (logDate >= startDate && logDate <= endDate) {
              totalMinutes += entry.minutes;
            }
          });
        }
      });
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      // Build the recap document
      let content = `# ${args.period.charAt(0).toUpperCase() + args.period.slice(1)} Recap: ${periodLabel}\n\n`;
      content += `*Generated: ${new Date().toISOString()}*\n\n`;

      if (args.summary) {
        content += `## Executive Summary\n${args.summary}\n\n`;
      }

      if (args.highlights && args.highlights.length > 0) {
        content += `## Key Highlights\n`;
        args.highlights.forEach((h) => {
          content += `- ${h}\n`;
        });
        content += `\n`;
      }

      content += `## Overview\n`;
      content += `- **Period:** ${startDate} to ${endDate}\n`;
      content += `- **Tasks Completed:** ${completedTasks.length}\n`;
      content += `- **Time Invested:** ${hours}h ${mins}m\n`;
      content += `- **Accomplishments Logged:** ${accomplishments.length}\n`;
      content += `- **Decisions Made:** ${decisions.length}\n\n`;

      if (completedTasks.length > 0) {
        content += `## Completed Tasks\n`;
        completedTasks.forEach((t) => {
          const project = data.projects.find((p) => p.id === t.projectId);
          content += `- ✓ ${t.name}`;
          if (project && !project.isInbox) content += ` [${project.name}]`;
          content += `\n`;
        });
        content += `\n`;
      }

      if (accomplishments.length > 0) {
        content += `## Accomplishments\n`;
        accomplishments.forEach((a) => {
          content += `- ${a.content}`;
          if (a.tags && a.tags.length > 0) content += ` [${a.tags.join(", ")}]`;
          content += `\n`;
        });
        content += `\n`;
      }

      if (decisions.length > 0) {
        content += `## Decisions Made\n`;
        decisions.forEach((d) => {
          content += `- ⚖ ${d.content}`;
          if (d.tags && d.tags.length > 0) content += ` [${d.tags.join(", ")}]`;
          content += `\n`;
        });
        content += `\n`;
      }

      if (notes.length > 0) {
        content += `## Notes & Insights\n`;
        notes.forEach((n) => {
          content += `- ${n.content}\n`;
        });
        content += `\n`;
      }

      // Gather learnings from tasks
      const learnings = [];
      tasks.forEach((t) => {
        if (t.learnings) {
          t.learnings.forEach((l) => {
            const learnDate = l.addedAt.split("T")[0];
            if (learnDate >= startDate && learnDate <= endDate) {
              learnings.push({ task: t.name, learning: l.text });
            }
          });
        }
      });

      if (learnings.length > 0) {
        content += `## What We Learned\n`;
        learnings.forEach((l) => {
          content += `- ${l.learning}\n`;
        });
        content += `\n`;
      }

      // Save the recap
      const savedRecap = {
        id: generateId(),
        period: args.period,
        periodLabel,
        startDate,
        endDate,
        content,
        stats: {
          tasksCompleted: completedTasks.length,
          timeMinutes: totalMinutes,
          accomplishments: accomplishments.length,
          decisions: decisions.length,
          notes: notes.length,
          learnings: learnings.length,
        },
        savedAt: new Date().toISOString(),
      };

      data.savedRecaps.push(savedRecap);
      saveData(data);

      return {
        content: [{
          type: "text",
          text: `## Recap Saved!\n\n**ID:** ${savedRecap.id}\n**Period:** ${periodLabel}\n\n---\n\n${content}`,
        }],
      };
    }

    case "get_saved_recaps": {
      const data = loadData();
      if (!data.savedRecaps || data.savedRecaps.length === 0) {
        return { content: [{ type: "text", text: "No saved recaps yet. Use save_recap to create one." }] };
      }

      const filterPeriod = args?.period || "all";
      const limit = args?.limit || 10;

      let recaps = [...data.savedRecaps];

      if (filterPeriod !== "all") {
        recaps = recaps.filter((r) => r.period === filterPeriod);
      }

      recaps.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      recaps = recaps.slice(0, limit);

      if (recaps.length === 0) {
        return { content: [{ type: "text", text: `No ${filterPeriod} recaps found.` }] };
      }

      let output = `## Saved Recaps${filterPeriod !== "all" ? ` (${filterPeriod})` : ""}\n\n`;

      recaps.forEach((recap) => {
        output += `### ${recap.periodLabel}\n`;
        output += `- **ID:** ${recap.id}\n`;
        output += `- **Period:** ${recap.period} (${recap.startDate} to ${recap.endDate})\n`;
        output += `- **Saved:** ${recap.savedAt.split("T")[0]}\n`;
        output += `- **Stats:** ${recap.stats.tasksCompleted} tasks, ${recap.stats.accomplishments} accomplishments, ${recap.stats.decisions} decisions\n`;
        output += `\n`;
      });

      output += `---\n`;
      output += `To view full recap content, the documents are stored in the data file.\n`;
      output += `Total saved recaps: ${data.savedRecaps.length}\n`;

      return { content: [{ type: "text", text: output }] };
    }

    case "get_recap_by_id": {
      const data = loadData();
      if (!args?.recapId) {
        return { content: [{ type: "text", text: "Error: recapId is required" }] };
      }

      if (!data.savedRecaps || data.savedRecaps.length === 0) {
        return { content: [{ type: "text", text: "No saved recaps exist." }] };
      }

      const recap = data.savedRecaps.find((r) => r.id === args.recapId);
      if (!recap) {
        return { content: [{ type: "text", text: `Recap ${args.recapId} not found.` }] };
      }

      return { content: [{ type: "text", text: recap.content }] };
    }

    case "delete_recap_entry": {
      const data = loadData();
      if (!args?.entryId) {
        return { content: [{ type: "text", text: "Error: entryId is required" }] };
      }

      if (!data.recapLog || data.recapLog.length === 0) {
        return { content: [{ type: "text", text: "No recap entries exist." }] };
      }

      const entryIndex = data.recapLog.findIndex((e) => e.id === args.entryId);
      if (entryIndex === -1) {
        return { content: [{ type: "text", text: `Entry ${args.entryId} not found.` }] };
      }

      const deleted = data.recapLog.splice(entryIndex, 1)[0];
      saveData(data);

      return {
        content: [{
          type: "text",
          text: `Deleted ${deleted.type} entry: "${deleted.content}" (${deleted.date})`,
        }],
      };
    }

    default:
      return null;
  }
}
