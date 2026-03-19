import { create } from 'zustand';
import type { Task, TaskNote, TaskLink, Tag, User, EnvironmentMode, CreateTaskInput, TaskStatus } from '../types';
import type { DataAdapter } from '../adapters/DataAdapter';
import { localAdapter } from '../adapters/LocalAdapter';

export type ColumnVisibility = Record<TaskStatus, boolean>;

const COLUMN_VISIBILITY_KEY = 'ontoit-column-visibility';

function loadColumnVisibility(): ColumnVisibility {
  try {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { unassigned: true, backlog: true, in_progress: true, complete: true, archived: false };
}

function saveColumnVisibility(v: ColumnVisibility) {
  localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(v));
}

interface AppState {
  // Environment
  environment: EnvironmentMode;
  adapter: DataAdapter;

  // Data
  tasks: Task[];
  tags: Tag[];
  users: User[];
  currentUser: User | null;

  // UI state
  selectedTaskId: string | null;
  isTaskDetailOpen: boolean;
  isCreatingTask: boolean;
  columnVisibility: ColumnVisibility;
  isSidebarOpen: boolean;

  // Actions
  loadData: () => Promise<void>;
  selectTask: (taskId: string | null) => void;
  closeTaskDetail: () => void;
  setCreatingTask: (creating: boolean) => void;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  moveTask: (id: string, status: Task['status'], sortOrder: number, assignedTo?: string | null) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addNote: (taskId: string, content: string, isSystem?: boolean) => Promise<TaskNote>;
  getNotes: (taskId: string) => Promise<TaskNote[]>;
  getLinks: (taskId: string) => Promise<TaskLink[]>;
  addLink: (taskId: string, url: string, displayName: string, linkType: TaskLink['linkType']) => Promise<TaskLink>;
  removeLink: (linkId: string) => Promise<void>;
  getChildTasks: (parentId: string) => Promise<Task[]>;
  toggleColumnVisibility: (status: TaskStatus) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  environment: 'local',
  adapter: localAdapter,
  tasks: [],
  tags: [],
  users: [],
  currentUser: null,
  selectedTaskId: null,
  isTaskDetailOpen: false,
  isCreatingTask: false,
  columnVisibility: loadColumnVisibility(),
  isSidebarOpen: false,

  loadData: async () => {
    const { adapter } = get();
    const [tasks, tags, users, currentUser] = await Promise.all([
      adapter.getTasks(),
      adapter.getTags(),
      adapter.getUsers(),
      adapter.getCurrentUser(),
    ]);
    set({ tasks, tags, users, currentUser });
  },

  selectTask: (taskId) => {
    set({ selectedTaskId: taskId, isTaskDetailOpen: taskId !== null });
  },

  closeTaskDetail: () => {
    set({ selectedTaskId: null, isTaskDetailOpen: false });
  },

  setCreatingTask: (creating) => {
    set({ isCreatingTask: creating });
  },

  createTask: async (input) => {
    const { adapter } = get();
    const task = await adapter.createTask(input);
    const tasks = await adapter.getTasks();
    set({ tasks, isCreatingTask: false });
    return task;
  },

  updateTask: async (id, updates) => {
    const { adapter } = get();
    await adapter.updateTask(id, updates);
    const tasks = await adapter.getTasks();
    set({ tasks });
  },

  moveTask: async (id, status, sortOrder, assignedTo) => {
    const { adapter } = get();
    await adapter.moveTask(id, status, sortOrder, assignedTo);
    const tasks = await adapter.getTasks();
    set({ tasks });
  },

  deleteTask: async (id) => {
    const { adapter } = get();
    await adapter.deleteTask(id);
    const tasks = await adapter.getTasks();
    set({ tasks, selectedTaskId: null, isTaskDetailOpen: false });
  },

  addNote: async (taskId, content, isSystem) => {
    const { adapter } = get();
    return adapter.addNote(taskId, content, isSystem);
  },

  getNotes: async (taskId) => {
    const { adapter } = get();
    return adapter.getNotes(taskId);
  },

  getLinks: async (taskId) => {
    const { adapter } = get();
    return adapter.getLinks(taskId);
  },

  addLink: async (taskId, url, displayName, linkType) => {
    const { adapter } = get();
    return adapter.addLink(taskId, url, displayName, linkType);
  },

  removeLink: async (linkId) => {
    const { adapter } = get();
    return adapter.removeLink(linkId);
  },

  getChildTasks: async (parentId) => {
    const { adapter } = get();
    return adapter.getChildTasks(parentId);
  },

  toggleColumnVisibility: (status) => {
    const { columnVisibility } = get();
    const updated = { ...columnVisibility, [status]: !columnVisibility[status] };
    saveColumnVisibility(updated);
    set({ columnVisibility: updated });
  },

  toggleSidebar: () => {
    set({ isSidebarOpen: !get().isSidebarOpen });
  },
}));
