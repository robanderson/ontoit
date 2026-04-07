# OnToIt Task Management — Claude Skill

You are connected to **OnToIt**, a self-hosted task management system with a
Kanban board, journal-based event sourcing, and AI agent support.

## How to interact

Use the `ontoit_*` MCP tools to read and modify tasks. All mutations go through
a two-step RequestID protocol (handled automatically by the tools).

## Available tools

| Tool | Purpose |
|------|---------|
| `ontoit_list_tasks` | List/filter tasks by status, assignee, priority, keyword |
| `ontoit_get_task` | Get a single task by ID |
| `ontoit_create_task` | Create a new task |
| `ontoit_update_task` | Update task fields |
| `ontoit_move_task` | Move a task to a different status column |
| `ontoit_delete_task` | Archive (soft-delete) a task |
| `ontoit_search_tasks` | Search tasks by keyword |
| `ontoit_get_notes` | Get notes/activity for a task |
| `ontoit_add_note` | Add a note to a task |
| `ontoit_get_links` | Get links attached to a task |
| `ontoit_add_link` | Add a link to a task |
| `ontoit_list_tags` | List all tags |
| `ontoit_list_users` | List all users |
| `ontoit_get_children` | Get sub-tasks of a parent task |

## Task statuses

- `unassigned` — No owner, sitting in the Unassigned column
- `backlog` — Assigned to someone, in their backlog
- `in_progress` — Actively being worked on
- `complete` — Done
- `archived` — Soft-deleted (hidden from board)

## Task priorities

`urgent` > `high` > `medium` (default) > `low`

## Common workflows

### List all tasks assigned to a user
```
ontoit_list_tasks(assignedTo: "user-1")
```

### Find tasks by keyword
```
ontoit_search_tasks(query: "ferment")
```

### Create a task with sub-tasks
```
ontoit_create_task(
  title: "Quarterly review",
  description: "Prepare Q1 review materials",
  priority: "high",
  status: "unassigned",
  tags: ["tag-4"],
  subTasks: ["Gather metrics", "Draft slides", "Schedule meeting"]
)
```

### Move a task to in-progress and assign it
```
ontoit_move_task(taskId: "task-abc123", status: "in_progress", assignedTo: "user-1")
```

### Add a note to a task
```
ontoit_add_note(taskId: "task-abc123", content: "Discussed in standup — pushing to next sprint")
```

## Important notes

- When creating tasks from external sources (email, chat), include the source
  context in the description for traceability.
- Use `isSystem: true` for auto-generated notes (this is the default for agents).
- Before creating a task, search first to avoid duplicates.
- If your action returns `pending_approval`, it means a human must approve it
  before it takes effect. Do not retry — just inform the user.
- Tag IDs are like `tag-1`, `tag-2`, etc. Use `ontoit_list_tags` to discover
  available tags and their IDs.
- User IDs are like `user-1`, `user-2`, etc. Use `ontoit_list_users` to find them.
