import { getAllTasks } from "./data.js";

export function getToolDefinitions() {
  return [
    {
      name: "get_productivity_stats",
      description: "Get productivity statistics for a date range.",
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
    {
      name: "get_productivity_insights",
      description: "Get AI-ready insights about productivity patterns for Claude to analyze.",
      inputSchema: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["week", "month", "quarter"],
            description: "Time period to analyze. Default: week",
          },
        },
      },
    },
    {
      name: "get_work_context",
      description: "Get rich work context for coaching: recent completions with energy ratings, snoozed/deferred tasks, blocker patterns, project velocity, and daily notes. Use this before giving productivity advice.",
      inputSchema: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Number of days of history to include. Default: 14",
          },
        },
      },
    },
    {
      name: "get_project_analytics",
      description: "Get analytics breakdown by project.",
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
    case "get_productivity_stats": {
      const data = loadData();
      const today = new Date();
      const startDate = args?.startDate || new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const endDate = args?.endDate || today.toISOString().split("T")[0];

      const tasks = getAllTasks(data);
      const completed = tasks.filter(t => {
        if (t.status !== "done" || !t.completedAt) return false;
        const completedDate = t.completedAt.split("T")[0];
        return completedDate >= startDate && completedDate <= endDate;
      });

      // Daily breakdown
      const dailyStats = {};
      completed.forEach(t => {
        const date = t.completedAt.split("T")[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { count: 0, minutes: 0 };
        }
        dailyStats[date].count++;
        dailyStats[date].minutes += t.estimatedMinutes || 30;
      });

      // Project breakdown
      const projectStats = {};
      completed.forEach(t => {
        const project = data.projects.find(p => p.tasks.some(pt => pt.id === t.id));
        const projectName = project?.name || "Inbox";
        if (!projectStats[projectName]) {
          projectStats[projectName] = { count: 0, minutes: 0 };
        }
        projectStats[projectName].count++;
        projectStats[projectName].minutes += t.estimatedMinutes || 30;
      });

      const totalMinutes = completed.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);

      let output = `## Productivity Stats: ${startDate} to ${endDate}\n\n`;
      output += `### Overview\n`;
      output += `- **Tasks Completed:** ${completed.length}\n`;
      output += `- **Total Time:** ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m\n`;
      output += `- **Daily Average:** ${(completed.length / Object.keys(dailyStats).length || 0).toFixed(1)} tasks\n\n`;

      output += `### Daily Breakdown\n`;
      Object.keys(dailyStats).sort().forEach(date => {
        const stats = dailyStats[date];
        output += `- ${date}: ${stats.count} tasks (${Math.floor(stats.minutes / 60)}h ${stats.minutes % 60}m)\n`;
      });

      output += `\n### By Project\n`;
      Object.entries(projectStats)
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([projectName, stats]) => {
          output += `- ${projectName}: ${stats.count} tasks (${Math.floor(stats.minutes / 60)}h ${stats.minutes % 60}m)\n`;
        });

      return { content: [{ type: "text", text: output }] };
    }

    case "get_productivity_insights": {
      const data = loadData();
      const period = args?.period || "week";
      const periodDays = period === "week" ? 7 : period === "month" ? 30 : 90;

      const today = new Date();
      const startDate = new Date(today.getTime() - periodDays * 24 * 60 * 60 * 1000);

      const tasks = getAllTasks(data);
      const completed = tasks.filter(t => {
        if (t.status !== "done" || !t.completedAt) return false;
        return new Date(t.completedAt) >= startDate;
      });

      // Analyze patterns
      const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
      const byHour = Array(24).fill(0);

      completed.forEach(t => {
        const date = new Date(t.completedAt);
        byDayOfWeek[date.getDay()]++;
        byHour[date.getHours()]++;
      });

      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const mostProductiveDay = dayNames[byDayOfWeek.indexOf(Math.max(...byDayOfWeek))];
      const leastProductiveDay = dayNames[byDayOfWeek.indexOf(Math.min(...byDayOfWeek))];

      const peakHour = byHour.indexOf(Math.max(...byHour));

      // Priority distribution
      const byPriority = { urgent: 0, high: 0, medium: 0, low: 0, none: 0 };
      completed.forEach(t => {
        byPriority[t.priority || "none"]++;
      });

      let output = `## Productivity Insights (${period})\n\n`;
      output += `### Patterns\n`;
      output += `- **Most Productive Day:** ${mostProductiveDay} (${Math.max(...byDayOfWeek)} tasks)\n`;
      output += `- **Least Productive Day:** ${leastProductiveDay} (${Math.min(...byDayOfWeek)} tasks)\n`;
      output += `- **Peak Hour:** ${peakHour}:00 (${byHour[peakHour]} tasks completed)\n\n`;

      output += `### Priority Distribution\n`;
      output += `- Urgent: ${byPriority.urgent} (${Math.round(byPriority.urgent / completed.length * 100 || 0)}%)\n`;
      output += `- High: ${byPriority.high} (${Math.round(byPriority.high / completed.length * 100 || 0)}%)\n`;
      output += `- Medium: ${byPriority.medium} (${Math.round(byPriority.medium / completed.length * 100 || 0)}%)\n`;
      output += `- Low: ${byPriority.low} (${Math.round(byPriority.low / completed.length * 100 || 0)}%)\n`;

      output += `\n### Raw Data for Analysis\n`;
      output += "```json\n" + JSON.stringify({
        period,
        totalCompleted: completed.length,
        byDayOfWeek: dayNames.map((d, i) => ({ day: d, count: byDayOfWeek[i] })),
        peakHour,
        byPriority
      }, null, 2) + "\n```";

      return { content: [{ type: "text", text: output }] };
    }

    case "get_work_context": {
      const data = loadData();
      const days = args?.days || 14;
      const today = new Date();
      const cutoff = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
      const todayStr = today.toISOString().split("T")[0];

      const tasks = getAllTasks(data);

      // Recent completions with energy ratings
      const completed = tasks
        .filter(t => t.status === "done" && t.completedAt && new Date(t.completedAt) >= cutoff)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      // Frequently snoozed tasks
      const snoozed = tasks
        .filter(t => t.status !== "done" && (t.snoozeCount || 0) > 0)
        .sort((a, b) => (b.snoozeCount || 0) - (a.snoozeCount || 0));

      // Tasks waiting with blocker reasons
      const waiting = tasks.filter(t => t.status === "waiting");

      // Blocker pattern analysis
      const blockerCounts = {};
      waiting.forEach(t => {
        const reason = t.waitingReason || "unspecified";
        blockerCounts[reason] = (blockerCounts[reason] || 0) + 1;
      });

      // Energy pattern analysis
      const energyTasks = completed.filter(t => t.energyRating);
      const energyByRating = { 1: [], 2: [], 3: [] };
      energyTasks.forEach(t => {
        if (energyByRating[t.energyRating]) {
          energyByRating[t.energyRating].push(t.name);
        }
      });
      const avgEnergy = energyTasks.length > 0
        ? (energyTasks.reduce((sum, t) => sum + t.energyRating, 0) / energyTasks.length).toFixed(1)
        : "N/A";

      // Project velocity
      const projectVelocity = {};
      data.projects.forEach(p => {
        const done = p.tasks.filter(t => t.status === "done" && t.completedAt && new Date(t.completedAt) >= cutoff).length;
        const active = p.tasks.filter(t => t.status !== "done").length;
        if (done > 0 || active > 0) {
          projectVelocity[p.name] = { completed: done, active, total: p.tasks.length };
        }
      });

      // Recap entries (daily notes, accomplishments)
      const recentRecaps = (data.recapLog || [])
        .filter(r => new Date(r.createdAt) >= cutoff)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 30);

      // Daily notes
      const dailyNotes = data.dailyNotes || {};

      // Task age analysis (oldest active tasks)
      const oldestActive = tasks
        .filter(t => t.status !== "done" && t.createdAt)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(0, 10);

      // Build output
      let output = `# Work Context (Last ${days} Days)\n\n`;

      output += `## Summary\n`;
      output += `- **Tasks completed:** ${completed.length}\n`;
      output += `- **Currently active:** ${tasks.filter(t => t.status !== "done").length}\n`;
      output += `- **Waiting/blocked:** ${waiting.length}\n`;
      output += `- **Average energy rating:** ${avgEnergy} (1=drained, 3=energized)\n`;
      output += `- **Tasks snoozed at least once:** ${snoozed.length}\n\n`;

      if (completed.length > 0) {
        output += `## Recent Completions\n`;
        completed.slice(0, 15).forEach(t => {
          const energy = t.energyRating ? [" ", "😩", "😐", "💪"][t.energyRating] : "";
          const summary = t.completionSummary ? ` — ${t.completionSummary.slice(0, 100)}` : "";
          output += `- ${t.name}${energy}${summary} (${t.completedAt.split("T")[0]})\n`;
        });
        output += "\n";
      }

      if (energyTasks.length > 0) {
        output += `## Energy Patterns\n`;
        if (energyByRating[3].length > 0) output += `- **Energizing tasks:** ${energyByRating[3].join(", ")}\n`;
        if (energyByRating[1].length > 0) output += `- **Draining tasks:** ${energyByRating[1].join(", ")}\n`;
        if (energyByRating[2].length > 0) output += `- **Neutral tasks:** ${energyByRating[2].join(", ")}\n`;
        output += "\n";
      }

      if (snoozed.length > 0) {
        output += `## Frequently Deferred Tasks\n`;
        snoozed.slice(0, 10).forEach(t => {
          output += `- **${t.name}** — snoozed ${t.snoozeCount}x (priority: ${t.priority || "none"})\n`;
        });
        output += "\n";
      }

      if (waiting.length > 0) {
        output += `## Blocker Analysis\n`;
        output += `Blocker reasons: ${JSON.stringify(blockerCounts)}\n`;
        waiting.forEach(t => {
          output += `- **${t.name}** — ${t.waitingReason || "no reason given"}\n`;
        });
        output += "\n";
      }

      if (Object.keys(projectVelocity).length > 0) {
        output += `## Project Velocity (${days}d)\n`;
        for (const [projectName, v] of Object.entries(projectVelocity)) {
          output += `- **${projectName}:** ${v.completed} completed, ${v.active} active\n`;
        }
        output += "\n";
      }

      if (oldestActive.length > 0) {
        output += `## Oldest Active Tasks\n`;
        oldestActive.forEach(t => {
          const age = Math.floor((today - new Date(t.createdAt)) / (24 * 60 * 60 * 1000));
          output += `- **${t.name}** — ${age} days old (priority: ${t.priority || "none"}, snoozed: ${t.snoozeCount || 0}x)\n`;
        });
        output += "\n";
      }

      if (recentRecaps.length > 0) {
        output += `## Recent Notes & Recap Entries\n`;
        recentRecaps.forEach(r => {
          output += `- [${r.date}] ${r.type}: ${r.content.slice(0, 150)}\n`;
        });
        output += "\n";
      }

      return { content: [{ type: "text", text: output }] };
    }

    case "get_project_analytics": {
      const data = loadData();
      const today = new Date();
      const startDate = args?.startDate || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const endDate = args?.endDate || today.toISOString().split("T")[0];

      const projectAnalytics = data.projects.map(project => {
        const completed = project.tasks.filter(t => {
          if (t.status !== "done" || !t.completedAt) return false;
          const date = t.completedAt.split("T")[0];
          return date >= startDate && date <= endDate;
        });

        const active = project.tasks.filter(t => t.status !== "done");
        const blocked = project.tasks.filter(t => t.status === "waiting");
        const totalMinutes = completed.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);

        return {
          name: project.name,
          color: project.color,
          isInbox: project.isInbox,
          completed: completed.length,
          active: active.length,
          blocked: blocked.length,
          totalMinutes,
          completionRate: project.tasks.length > 0
            ? Math.round(completed.length / project.tasks.length * 100)
            : 0
        };
      });

      let output = `## Project Analytics: ${startDate} to ${endDate}\n\n`;

      projectAnalytics
        .filter(p => !p.isInbox)
        .sort((a, b) => b.completed - a.completed)
        .forEach(p => {
          output += `### ${p.name}\n`;
          output += `- Completed: ${p.completed} tasks\n`;
          output += `- Active: ${p.active} tasks\n`;
          output += `- Blocked: ${p.blocked} tasks\n`;
          output += `- Time: ${Math.floor(p.totalMinutes / 60)}h ${p.totalMinutes % 60}m\n`;
          output += `- Completion Rate: ${p.completionRate}%\n\n`;
        });

      return { content: [{ type: "text", text: output }] };
    }

    default:
      return null;
  }
}
