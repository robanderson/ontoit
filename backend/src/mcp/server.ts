#!/usr/bin/env node

/**
 * OnToIt MCP Server
 *
 * Exposes the OnToIt task management API as Model Context Protocol tools
 * so Claude (and other MCP-compatible clients) can interact with tasks,
 * tags, notes, and links programmatically.
 *
 * Communicates with the OnToIt backend via its REST API using the
 * two-step RequestID protocol for all mutations.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE = process.env.ONTOIT_API_URL ?? 'http://localhost:3001';
const AGENT_USER_ID = process.env.ONTOIT_USER_ID ?? 'agent-claude';

// ── helpers ──────────────────────────────────────────────────────────

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'X-User-Id': AGENT_USER_ID,
      'X-Source': 'agent',
    },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiAction(
  action: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  // Step 1: request an ID
  const reqRes = await fetch(`${API_BASE}/api/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': AGENT_USER_ID,
      'X-Source': 'agent',
    },
    body: '{}',
  });
  if (!reqRes.ok) throw new Error(`POST /api/request → ${reqRes.status}`);
  const { requestId } = (await reqRes.json()) as { requestId: number };

  // Step 2: submit the action
  const actRes = await fetch(`${API_BASE}/api/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': AGENT_USER_ID,
      'X-Source': 'agent',
    },
    body: JSON.stringify({ requestId, action, entityType, entityId, payload }),
  });
  if (!actRes.ok) throw new Error(`POST /api/action → ${actRes.status} ${await actRes.text()}`);
  return actRes.json();
}

// ── tool definitions ─────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'ontoit_list_tasks',
    description:
      'List tasks from the OnToIt board. Returns non-archived top-level tasks. Supports filtering by status, assignedTo, priority, and keyword search.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          description: 'Comma-separated statuses to filter: unassigned, backlog, in_progress, complete',
        },
        assignedTo: {
          type: 'string',
          description: 'User ID to filter by assignment (e.g. "user-1")',
        },
        priority: {
          type: 'string',
          description: 'Comma-separated priorities: urgent, high, medium, low',
        },
        search: {
          type: 'string',
          description: 'Keyword search across task title and description',
        },
        parentTaskId: {
          type: 'string',
          description: 'If set, return child tasks of this parent task',
        },
      },
    },
  },
  {
    name: 'ontoit_get_task',
    description: 'Get a single task by its ID, including all fields.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID (e.g. "task-abc123")' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'ontoit_create_task',
    description:
      'Create a new task on the OnToIt board. Returns the new task ID. Uses the two-step RequestID protocol.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Task title (required)' },
        description: { type: 'string', description: 'Task description' },
        priority: {
          type: 'string',
          enum: ['urgent', 'high', 'medium', 'low'],
          description: 'Priority level (default: medium)',
        },
        status: {
          type: 'string',
          enum: ['unassigned', 'backlog', 'in_progress'],
          description: 'Initial status (default: unassigned)',
        },
        assignedTo: { type: 'string', description: 'User ID to assign to' },
        dueDate: { type: 'string', description: 'Due date in ISO format (YYYY-MM-DD)' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tag IDs to attach',
        },
        subTasks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of sub-task title strings to create inline',
        },
        parentTaskId: { type: 'string', description: 'Parent task ID for nesting' },
      },
      required: ['title'],
    },
  },
  {
    name: 'ontoit_update_task',
    description: 'Update fields on an existing task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID to update' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
        status: { type: 'string', enum: ['unassigned', 'backlog', 'in_progress', 'complete'] },
        assignedTo: { type: 'string' },
        dueDate: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'ontoit_move_task',
    description:
      'Move a task to a different status column. Optionally reassign at the same time.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID to move' },
        status: {
          type: 'string',
          enum: ['unassigned', 'backlog', 'in_progress', 'complete'],
          description: 'Target status column',
        },
        assignedTo: { type: 'string', description: 'Optionally reassign' },
        sortOrder: { type: 'number', description: 'Position within column' },
      },
      required: ['taskId', 'status'],
    },
  },
  {
    name: 'ontoit_delete_task',
    description: 'Archive (soft-delete) a task. The task is hidden from the board but remains in the journal.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID to archive' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'ontoit_search_tasks',
    description:
      'Search tasks by keyword. A convenience wrapper around ontoit_list_tasks with the search parameter.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search keyword' },
      },
      required: ['query'],
    },
  },
  {
    name: 'ontoit_get_notes',
    description: 'Get notes/activity for a task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'ontoit_add_note',
    description: 'Add a note to a task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
        content: { type: 'string', description: 'Note content' },
        isSystem: {
          type: 'boolean',
          description: 'True for auto-generated notes (default: true for agents)',
        },
      },
      required: ['taskId', 'content'],
    },
  },
  {
    name: 'ontoit_get_links',
    description: 'Get links attached to a task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'ontoit_add_link',
    description: 'Add a link to a task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
        url: { type: 'string', description: 'The URL' },
        displayName: { type: 'string', description: 'Display label for the link' },
        linkType: {
          type: 'string',
          enum: ['google_drive', 'external', 'other'],
          description: 'Link type (default: external)',
        },
      },
      required: ['taskId', 'url'],
    },
  },
  {
    name: 'ontoit_list_tags',
    description: 'List all available tags.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'ontoit_list_users',
    description: 'List all users (humans and agents).',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'ontoit_get_children',
    description: 'Get child/sub-tasks of a parent task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The parent task ID' },
      },
      required: ['taskId'],
    },
  },
];

// ── tool handlers ────────────────────────────────────────────────────

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'ontoit_list_tasks': {
      const params = new URLSearchParams();
      if (args.status) params.set('status', args.status as string);
      if (args.assignedTo) params.set('assignedTo', args.assignedTo as string);
      if (args.priority) params.set('priority', args.priority as string);
      if (args.search) params.set('search', args.search as string);
      if (args.parentTaskId) params.set('parentTaskId', args.parentTaskId as string);
      const qs = params.toString();
      const data = await apiGet(`/api/tasks${qs ? `?${qs}` : ''}`);
      return JSON.stringify(data, null, 2);
    }

    case 'ontoit_get_task': {
      const data = await apiGet(`/api/tasks/${args.taskId}`);
      return JSON.stringify(data, null, 2);
    }

    case 'ontoit_create_task': {
      const { title, description, priority, status, assignedTo, dueDate, tags, subTasks, parentTaskId } = args;
      const payload: Record<string, unknown> = { title };
      if (description !== undefined) payload.description = description;
      if (priority !== undefined) payload.priority = priority;
      if (status !== undefined) payload.status = status;
      if (assignedTo !== undefined) payload.assignedTo = assignedTo;
      if (dueDate !== undefined) payload.dueDate = dueDate;
      if (tags !== undefined) payload.tags = tags;
      if (subTasks !== undefined) payload.subTasks = subTasks;
      if (parentTaskId !== undefined) payload.parentTaskId = parentTaskId;
      const result = await apiAction('CreateTask', 'task', 'new', payload);
      return JSON.stringify(result, null, 2);
    }

    case 'ontoit_update_task': {
      const { taskId, ...rest } = args;
      const result = await apiAction('UpdateTask', 'task', taskId as string, rest);
      return JSON.stringify(result, null, 2);
    }

    case 'ontoit_move_task': {
      const { taskId, status, assignedTo, sortOrder } = args;
      const payload: Record<string, unknown> = { status };
      if (assignedTo !== undefined) payload.assignedTo = assignedTo;
      if (sortOrder !== undefined) payload.sortOrder = sortOrder;
      const result = await apiAction('MoveTask', 'task', taskId as string, payload);
      return JSON.stringify(result, null, 2);
    }

    case 'ontoit_delete_task': {
      const result = await apiAction('DeleteTask', 'task', args.taskId as string, {});
      return JSON.stringify(result, null, 2);
    }

    case 'ontoit_search_tasks': {
      const data = await apiGet(`/api/tasks?search=${encodeURIComponent(args.query as string)}`);
      return JSON.stringify(data, null, 2);
    }

    case 'ontoit_get_notes': {
      const data = await apiGet(`/api/tasks/${args.taskId}/notes`);
      return JSON.stringify(data, null, 2);
    }

    case 'ontoit_add_note': {
      const payload: Record<string, unknown> = {
        taskId: args.taskId,
        content: args.content,
        isSystem: args.isSystem ?? true,
      };
      const result = await apiAction('AddNote', 'note', 'new', payload);
      return JSON.stringify(result, null, 2);
    }

    case 'ontoit_get_links': {
      const data = await apiGet(`/api/tasks/${args.taskId}/links`);
      return JSON.stringify(data, null, 2);
    }

    case 'ontoit_add_link': {
      const payload: Record<string, unknown> = {
        taskId: args.taskId,
        url: args.url,
        displayName: args.displayName,
        linkType: args.linkType ?? 'external',
      };
      const result = await apiAction('AddLink', 'link', 'new', payload);
      return JSON.stringify(result, null, 2);
    }

    case 'ontoit_list_tags': {
      const data = await apiGet('/api/tags');
      return JSON.stringify(data, null, 2);
    }

    case 'ontoit_list_users': {
      const data = await apiGet('/api/users');
      return JSON.stringify(data, null, 2);
    }

    case 'ontoit_get_children': {
      const data = await apiGet(`/api/tasks/${args.taskId}/children`);
      return JSON.stringify(data, null, 2);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  const server = new Server(
    { name: 'ontoit', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await handleTool(name, (args ?? {}) as Record<string, unknown>);
      return { content: [{ type: 'text', text: result }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed:', err);
  process.exit(1);
});
