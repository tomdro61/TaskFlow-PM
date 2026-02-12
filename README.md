# TaskFlow PM

AI-powered task management desktop app built with Electron. Designed as a command center where Claude acts as a tireless execution partner — you capture raw thoughts, and Claude helps process, organize, prioritize, and execute tasks.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later (includes npm)
- [Git](https://git-scm.com/) (to clone the repo)

## Setup

```bash
# Clone the repo
git clone https://github.com/vincenzo-sys/TaskFlow-PM.git
cd TaskFlow-PM

# Install dependencies
npm install

# Launch the app
npm start
```

## MCP Server (Optional — Claude Integration)

TaskFlow includes an MCP server that lets Claude Desktop or Claude Code read and manage your tasks directly. To set it up:

```bash
# Install MCP server dependencies
cd mcp-server
npm install
cd ..
```

Then add this to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "taskflow": {
      "command": "node",
      "args": ["C:/path/to/TaskFlow-PM/mcp-server/index.js"]
    }
  }
}
```

Replace the path with wherever you cloned the repo.

## Features

- **Today View** — Focused task queue with active tasks, priority sorting, and brain dumps
- **Projects** — Organize tasks into projects with list, board, and timeline views
- **Focus Mode** — Pomodoro-style timer with task queue and floating pill widget
- **Quick Capture** — Global shortcut (Ctrl+Alt+Q) to capture thoughts instantly
- **Notion Sync** — Bidirectional sync with a Notion database
- **MCP Integration** — 35+ tools for Claude to manage your tasks, suggest priorities, plan your day, and more

## Tech Stack

- **Electron 28** — Desktop framework
- **Vanilla JS/CSS/HTML** — No frontend framework
- **Local JSON storage** — Data stored in your user data directory
- **MCP SDK** — Claude integration via Model Context Protocol

## License

MIT
