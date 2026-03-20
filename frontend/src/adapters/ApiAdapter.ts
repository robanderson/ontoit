import type { DataAdapter } from './DataAdapter';
import type { Task, TaskNote, TaskLink, Tag, User, CreateTaskInput, TaskFilters } from '../types';

const DEFAULT_BASE = 'http://localhost:3001';

/**
 * API adapter that talks to the backend through the journal-based REST API.
 * Every mutation follows the two-step RequestID protocol:
 *   1. POST /api/request → get a requestId
 *   2. POST /api/action → submit the action with that requestId
 * Read operations go directly to the materialised-state endpoints.
 */
export function createApiAdapter(baseUrl = DEFAULT_BASE): DataAdapter {
  const api = async (path: string, options?: RequestInit) => {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'user-1', // TODO: replace with real auth
        'X-Source': 'gui',
        ...options?.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `API error: ${res.status}`);
    }
    return res.json();
  };

  /** Two-step action: get request ID, then submit action. */
  const action = async (
    actionType: string,
    entityType: string,
    entityId: string | undefined,
    payload: Record<string, unknown>,
  ) => {
    const { requestId } = await api('/api/request', { method: 'POST' });
    return api('/api/action', {
      method: 'POST',
      body: JSON.stringify({
        requestId,
        action: actionType,
        entityType,
        entityId,
        payload,
      }),
    });
  };

  return {
    // --- Reads (from materialised state) ---

    async getTasks(filters?: TaskFilters): Promise<Task[]> {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status.join(','));
      if (filters?.assignedTo) params.set('assignedTo', filters.assignedTo);
      if (filters?.priority) params.set('priority', filters.priority.join(','));
      if (filters?.search) params.set('search', filters.search);
      if (filters?.parentTaskId) params.set('parentTaskId', filters.parentTaskId);
      const qs = params.toString();
      return api(`/api/tasks${qs ? `?${qs}` : ''}`);
    },

    async getTask(id: string): Promise<Task | null> {
      try {
        return await api(`/api/tasks/${id}`);
      } catch {
        return null;
      }
    },

    async getChildTasks(parentId: string): Promise<Task[]> {
      return api(`/api/tasks/${parentId}/children`);
    },

    async getNotes(taskId: string): Promise<TaskNote[]> {
      return api(`/api/tasks/${taskId}/notes`);
    },

    async getLinks(taskId: string): Promise<TaskLink[]> {
      return api(`/api/tasks/${taskId}/links`);
    },

    async getTags(): Promise<Tag[]> {
      return api('/api/tags');
    },

    async getCurrentUser(): Promise<User> {
      return api('/api/users/me');
    },

    async getUsers(): Promise<User[]> {
      return api('/api/users');
    },

    // --- Writes (through the journal) ---

    async createTask(input: CreateTaskInput): Promise<Task> {
      const res = await action('CreateTask', 'task', 'new', {
        title: input.title,
        description: input.description ?? '',
        priority: input.priority ?? 'medium',
        status: input.status ?? 'unassigned',
        parentTaskId: input.parentTaskId ?? null,
        dueDate: input.dueDate ?? null,
        tags: input.tags ?? [],
      });
      // Fetch the created task to return it with full shape
      const task = await this.getTask(res.entityId);
      if (!task) throw new Error('Created task not found');
      return task;
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
      await action('UpdateTask', 'task', id, updates as Record<string, unknown>);
      const task = await this.getTask(id);
      if (!task) throw new Error('Updated task not found');
      return task;
    },

    async deleteTask(id: string): Promise<void> {
      await action('DeleteTask', 'task', id, {});
    },

    async moveTask(id: string, status: Task['status'], sortOrder: number, assignedTo?: string | null): Promise<Task> {
      const payload: Record<string, unknown> = { status, sortOrder };
      if (assignedTo !== undefined) payload.assignedTo = assignedTo;
      await action('MoveTask', 'task', id, payload);
      const task = await this.getTask(id);
      if (!task) throw new Error('Moved task not found');
      return task;
    },

    async addNote(taskId: string, content: string, isSystem = false): Promise<TaskNote> {
      const res = await action('AddNote', 'note', 'new', { taskId, content, isSystem });
      // Return a minimal note shape
      return {
        id: res.entityId,
        taskId,
        authorId: 'user-1',
        content,
        isSystem,
        createdAt: new Date().toISOString(),
      };
    },

    async addLink(taskId: string, url: string, displayName: string, linkType: TaskLink['linkType']): Promise<TaskLink> {
      const res = await action('AddLink', 'link', 'new', { taskId, url, displayName, linkType });
      return {
        id: res.entityId,
        taskId,
        url,
        linkType,
        displayName,
        addedBy: 'user-1',
        createdAt: new Date().toISOString(),
      };
    },

    async removeLink(linkId: string): Promise<void> {
      await action('RemoveLink', 'link', linkId, {});
    },

    async createTag(name: string, colour: string): Promise<Tag> {
      const res = await action('CreateTag', 'tag', 'new', { name, colour });
      return { id: res.entityId, name, colour };
    },
  };
}

export const apiAdapter = createApiAdapter();
