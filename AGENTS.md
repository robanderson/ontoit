# OnToIt — Agent Integration Guide

> **IMPORTANT:** This document must be kept up to date. Any changes to the REST API,
> journal protocol, action types, or agent configuration that affect how an agent
> interacts with the system **must** be reflected here. See PROJECT_PLAN.md §9 for
> the maintenance requirement.

---

## Overview

OnToIt exposes a REST API that AI agents can use to create, update, move, and
delete tasks (and other entities) programmatically. All mutations flow through an
**append-only journal** using a **two-step RequestID protocol**, ensuring every
change is auditable and reversible.

Agents are treated as first-class users with their own user IDs. An administrator
can configure each agent to either auto-apply changes or require human approval
before changes take effect.

---

## Base URL

```
http://<host>:3001
```

Default local development: `http://localhost:3001`

---

## Authentication

Every request must include the agent's user ID in the `X-User-Id` header and
declare itself as an agent via the `X-Source` header:

```
X-User-Id: agent-email-monitor
X-Source: agent
```

---

## The Two-Step RequestID Protocol

Every mutation requires two API calls:

### Step 1 — Request an ID

```
POST /api/request
Content-Type: application/json

{}
```

Response:

```json
{
  "requestId": 1262
}
```

### Step 2 — Submit the action

```
POST /api/action
Content-Type: application/json
X-User-Id: agent-email-monitor
X-Source: agent

{
  "requestId": 1262,
  "action": "CreateTask",
  "entityType": "task",
  "entityId": "new",
  "payload": {
    "title": "File Tax Return",
    "description": "Tax return due by end of month",
    "priority": "high",
    "assignedTo": "user-rob",
    "tags": ["tag-3"],
    "subTasks": ["Reconcile Xero", "File Return"]
  }
}
```

Response (success):

```json
{
  "requestId": 1262,
  "returnCode": "completed",
  "entityId": "a1b2c3d4-..."
}
```

Response (requires approval):

```json
{
  "requestId": 1262,
  "returnCode": "pending_approval",
  "entityId": "a1b2c3d4-..."
}
```

Response (error):

```json
{
  "requestId": 1262,
  "returnCode": "failed",
  "error": "Request ID 1262 has already been used"
}
```

Both the request and the response are recorded in the journal.

---

## Action Types

### Task Actions

| Action | entityType | entityId | Payload Fields |
|--------|-----------|----------|----------------|
| `CreateTask` | `task` | `"new"` | `title` (required), `description`, `priority`, `status`, `assignedTo`, `parentTaskId`, `dueDate`, `tags[]`, `subTasks[]` (string array of sub-task titles) |
| `UpdateTask` | `task` | task ID | Any combination of: `title`, `description`, `priority`, `status`, `assignedTo`, `dueDate`, `tags[]`, `sortOrder`, `parentTaskId` |
| `MoveTask` | `task` | task ID | `status` (required), `sortOrder`, `assignedTo` |
| `DeleteTask` | `task` | task ID | `{}` (archives the task) |

### Tag Actions

| Action | entityType | entityId | Payload Fields |
|--------|-----------|----------|----------------|
| `CreateTag` | `tag` | `"new"` | `name`, `colour` (hex) |
| `UpdateTag` | `tag` | tag ID | `name`, `colour` |
| `DeleteTag` | `tag` | tag ID | `{}` |

### Note Actions

| Action | entityType | entityId | Payload Fields |
|--------|-----------|----------|----------------|
| `AddNote` | `note` | `"new"` | `taskId` (required), `content` (required), `isSystem` (boolean, default false) |

### Link Actions

| Action | entityType | entityId | Payload Fields |
|--------|-----------|----------|----------------|
| `AddLink` | `link` | `"new"` | `taskId` (required), `url` (required), `displayName`, `linkType` (`"google_drive"` \| `"external"` \| `"other"`) |
| `RemoveLink` | `link` | link ID | `{}` |

### User Actions

| Action | entityType | entityId | Payload Fields |
|--------|-----------|----------|----------------|
| `CreateUser` | `user` | `"new"` or specific ID | `username`, `displayName`, `email`, `role`, `isAgent`, `requiresApproval`, `approverUserId` |
| `UpdateUser` | `user` | user ID | `displayName`, `email`, `role`, `requiresApproval`, `approverUserId` |

---

## Reading Data

These endpoints return the current materialised state (the result of replaying
the journal). No RequestID needed for reads.

| Endpoint | Description |
|----------|-------------|
| `GET /api/tasks` | All non-archived top-level tasks. Filters: `?status=backlog,in_progress`, `?assignedTo=user-1`, `?priority=high,urgent`, `?search=keyword`, `?parentTaskId=task-1` |
| `GET /api/tasks/:id` | Single task by ID |
| `GET /api/tasks/:id/notes` | Notes for a task (sorted chronologically) |
| `GET /api/tasks/:id/links` | Links for a task |
| `GET /api/tasks/:id/children` | Sub-tasks (excluding archived) |
| `GET /api/tags` | All tags |
| `GET /api/users` | All users (sensitive fields stripped) |
| `GET /api/users/me` | Current user (based on `X-User-Id` header) |
| `GET /api/health` | Health check |

---

## Task Statuses

| Status | Meaning |
|--------|---------|
| `unassigned` | No owner yet — sitting in the Unassigned column |
| `backlog` | Assigned to someone, in their backlog |
| `in_progress` | Actively being worked on |
| `complete` | Done |
| `archived` | Soft-deleted (hidden from board) |

---

## Task Priorities

| Priority | Meaning |
|----------|---------|
| `urgent` | Needs immediate attention |
| `high` | Important, do soon |
| `medium` | Normal priority (default) |
| `low` | Nice to have, do when free |

---

## Agent Approval Flow

Agents can be configured to require human approval before their changes take
effect. This is set per-agent via the `requiresApproval` and `approverUserId`
fields on the agent's user record.

- If `requiresApproval` is `true`, the action is written to the journal with
  `status: "pending"` and `returnCode: "pending_approval"`.
- The change does **not** affect the live task board until approved.
- A human approver reviews pending entries in the Journal Viewer UI and clicks
  Approve or Reject.
- Approved entries are applied; rejected entries get a compensating `reverted`
  entry in the journal.

If `requiresApproval` is `false` (or the user is not an agent), changes are
applied immediately.

---

## Journal Browsing

Agents can also read the journal for audit/sync purposes:

```
GET /api/journal?limit=100&offset=0
GET /api/journal?userId=agent-email-monitor
GET /api/journal?entityId=task-123
GET /api/journal?requestId=1262
GET /api/journal?dateFrom=2026-03-01&dateTo=2026-03-20
```

Response:

```json
{
  "entries": [ ... ],
  "total": 847
}
```

---

## Complete Agent Workflow Example

An email-monitoring agent that creates tasks from incoming emails:

```
1. Agent receives an email: "Please order 50 cases of Pinot Noir corks"

2. Agent requests an ID:
   POST /api/request → { "requestId": 2001 }

3. Agent submits the task creation:
   POST /api/action
   {
     "requestId": 2001,
     "action": "CreateTask",
     "entityType": "task",
     "entityId": "new",
     "payload": {
       "title": "Order 50 cases Pinot Noir corks",
       "description": "From email: supplier@corks.com on 2026-03-20.\nOriginal: 'Please order 50 cases of Pinot Noir corks'",
       "priority": "medium",
       "status": "unassigned",
       "tags": []
     }
   }

4. API responds:
   { "requestId": 2001, "returnCode": "completed", "entityId": "task-abc123" }

5. Agent optionally adds a note linking to the source email:
   POST /api/request → { "requestId": 2002 }
   POST /api/action
   {
     "requestId": 2002,
     "action": "AddNote",
     "entityType": "note",
     "entityId": "new",
     "payload": {
       "taskId": "task-abc123",
       "content": "Created from email received 2026-03-20 from supplier@corks.com",
       "isSystem": true
     }
   }
```

---

## Error Handling

- Always check `returnCode` in the response.
- `"completed"` — action applied successfully.
- `"pending_approval"` — action recorded but awaiting human approval.
- `"failed"` — action rejected. Check the `error` field for details.
- If `returnCode` is `"failed"`, do **not** reuse the same `requestId`. Request
  a new one and retry with corrected data.
- HTTP 400 = bad request (missing fields, duplicate requestId).
- HTTP 404 = entity not found.
- HTTP 500 = server error (retry with exponential backoff).

---

## Best Practices for Agents

1. **Always use the two-step protocol.** Never skip the RequestID step.
2. **Set `X-Source: agent`** so journal entries are clearly attributed.
3. **Use `isSystem: true`** for notes that are auto-generated (not human-written).
4. **Be descriptive.** Include source context in descriptions (e.g. "From email:
   sender@example.com on 2026-03-20").
5. **Check before creating duplicates.** Use `GET /api/tasks?search=keyword` to
   see if a similar task already exists before creating a new one.
6. **Respect the approval flow.** If your action returns `pending_approval`,
   do not retry — wait for human approval.
7. **Handle errors gracefully.** Log failures and retry with backoff for 500
   errors. Do not retry 400 errors without fixing the request.

---

## MCP Server (Model Context Protocol)

OnToIt includes an MCP server that exposes the full task API as Claude-callable
tools. This allows Claude (and other MCP-compatible clients) to interact with
tasks natively via tool use, without hand-crafting HTTP requests.

### Setup

Add to your Claude Code MCP configuration (e.g. `~/.claude/mcp.json` or
project `.mcp.json`):

```json
{
  "mcpServers": {
    "ontoit": {
      "command": "npx",
      "args": ["tsx", "<path-to-ontoit>/backend/src/mcp/server.ts"],
      "env": {
        "ONTOIT_API_URL": "http://localhost:3001",
        "ONTOIT_USER_ID": "agent-claude"
      }
    }
  }
}
```

Or run directly:

```bash
cd backend
ONTOIT_API_URL=http://localhost:3001 ONTOIT_USER_ID=agent-claude npm run mcp
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ONTOIT_API_URL` | `http://localhost:3001` | Base URL of the OnToIt backend |
| `ONTOIT_USER_ID` | `agent-claude` | User ID the MCP server authenticates as |

### Available Tools

| Tool | Description |
|------|-------------|
| `ontoit_list_tasks` | List/filter tasks (status, assignedTo, priority, search, parentTaskId) |
| `ontoit_get_task` | Get a single task by ID |
| `ontoit_create_task` | Create a new task (supports inline sub-tasks) |
| `ontoit_update_task` | Update task fields |
| `ontoit_move_task` | Move task to a different status column |
| `ontoit_delete_task` | Archive (soft-delete) a task |
| `ontoit_search_tasks` | Keyword search across tasks |
| `ontoit_get_notes` | Get notes/activity for a task |
| `ontoit_add_note` | Add a note to a task |
| `ontoit_get_links` | Get links for a task |
| `ontoit_add_link` | Add a link to a task |
| `ontoit_list_tags` | List all tags |
| `ontoit_list_users` | List all users |
| `ontoit_get_children` | Get child/sub-tasks of a parent task |

All mutation tools automatically handle the two-step RequestID protocol
internally — the caller just provides the payload.

### Important

- The MCP server agent user (default `agent-claude`) must exist in the system.
  Create it via the Agent Management UI or through the API.
- If the agent user has `requiresApproval: true`, mutations will return
  `pending_approval` and require human sign-off before taking effect.

---

## Claude Skill File

A Claude Skill file (`ontoit-skill.md`) is provided in the project root. This
gives Claude human-readable guidance on how to use the OnToIt MCP tools,
including common workflows and conventions.

To use it, reference it in your Claude Code project configuration or include it
as context when interacting with the system.
