import { v4 as uuidv4 } from 'uuid';
import type { DataAdapter } from './DataAdapter';
import type { Task, TaskNote, TaskLink, Tag, User, CreateTaskInput, TaskFilters } from '../types';
import { seedTasks, seedNotes, seedLinks, seedTags, seedUsers } from '../data/seedData';

const STORAGE_KEY = 'ontoit_local_data';

interface LocalStore {
  tasks: Task[];
  notes: TaskNote[];
  links: TaskLink[];
  tags: Tag[];
  users: User[];
}

function loadStore(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    tasks: [...seedTasks],
    notes: [...seedNotes],
    links: [...seedLinks],
    tags: [...seedTags],
    users: [...seedUsers],
  };
}

function saveStore(store: LocalStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

let store = loadStore();

export function resetLocalData() {
  store = {
    tasks: [...seedTasks],
    notes: [...seedNotes],
    links: [...seedLinks],
    tags: [...seedTags],
    users: [...seedUsers],
  };
  saveStore(store);
}

export const localAdapter: DataAdapter = {
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    let tasks = store.tasks.filter(t => t.status !== 'archived');
    if (filters?.status) {
      tasks = tasks.filter(t => filters.status!.includes(t.status));
    }
    if (filters?.assignedTo !== undefined) {
      tasks = tasks.filter(t => t.assignedTo === filters.assignedTo);
    }
    if (filters?.priority) {
      tasks = tasks.filter(t => filters.priority!.includes(t.priority));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    if (filters?.parentTaskId !== undefined) {
      tasks = tasks.filter(t => t.parentTaskId === filters.parentTaskId);
    }
    return tasks.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getTask(id: string): Promise<Task | null> {
    return store.tasks.find(t => t.id === id) ?? null;
  },

  async createTask(input: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const tasksInStatus = store.tasks.filter(t => t.status === (input.status ?? 'unassigned'));
    const task: Task = {
      id: uuidv4(),
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'unassigned',
      priority: input.priority ?? 'medium',
      assignedTo: null,
      createdBy: 'user-1',
      parentTaskId: input.parentTaskId ?? null,
      dueDate: input.dueDate ?? null,
      sortOrder: tasksInStatus.length,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    store.tasks.push(task);
    saveStore(store);
    return task;
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const idx = store.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    store.tasks[idx] = { ...store.tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    saveStore(store);
    return store.tasks[idx];
  },

  async deleteTask(id: string): Promise<void> {
    const idx = store.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      store.tasks[idx] = { ...store.tasks[idx], status: 'archived', updatedAt: new Date().toISOString() };
      saveStore(store);
    }
  },

  async moveTask(id: string, status: Task['status'], sortOrder: number, assignedTo?: string | null): Promise<Task> {
    const idx = store.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    const now = new Date().toISOString();
    const updates: Partial<Task> = { status, sortOrder, updatedAt: now };
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    store.tasks[idx] = { ...store.tasks[idx], ...updates };
    saveStore(store);
    return store.tasks[idx];
  },

  async getChildTasks(parentId: string): Promise<Task[]> {
    return store.tasks
      .filter(t => t.parentTaskId === parentId && t.status !== 'archived')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getNotes(taskId: string): Promise<TaskNote[]> {
    return store.notes
      .filter(n => n.taskId === taskId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async addNote(taskId: string, content: string, isSystem = false): Promise<TaskNote> {
    const note: TaskNote = {
      id: uuidv4(),
      taskId,
      authorId: 'user-1',
      content,
      isSystem,
      createdAt: new Date().toISOString(),
    };
    store.notes.push(note);
    saveStore(store);
    return note;
  },

  async getLinks(taskId: string): Promise<TaskLink[]> {
    return store.links.filter(l => l.taskId === taskId);
  },

  async addLink(taskId: string, url: string, displayName: string, linkType: TaskLink['linkType']): Promise<TaskLink> {
    const link: TaskLink = {
      id: uuidv4(),
      taskId,
      url,
      linkType,
      displayName,
      addedBy: 'user-1',
      createdAt: new Date().toISOString(),
    };
    store.links.push(link);
    saveStore(store);
    return link;
  },

  async removeLink(linkId: string): Promise<void> {
    store.links = store.links.filter(l => l.id !== linkId);
    saveStore(store);
  },

  async getTags(): Promise<Tag[]> {
    return store.tags;
  },

  async createTag(name: string, colour: string): Promise<Tag> {
    const tag: Tag = { id: uuidv4(), name, colour };
    store.tags.push(tag);
    saveStore(store);
    return tag;
  },

  async getCurrentUser(): Promise<User> {
    return store.users[0];
  },

  async getUsers(): Promise<User[]> {
    return store.users;
  },
};
