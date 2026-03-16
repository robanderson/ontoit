import type { Task, TaskNote, TaskLink, Tag, User, CreateTaskInput, TaskFilters } from '../types';

export interface DataAdapter {
  // Tasks
  getTasks(filters?: TaskFilters): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  moveTask(id: string, status: Task['status'], sortOrder: number, assignedTo?: string | null): Promise<Task>;
  getChildTasks(parentId: string): Promise<Task[]>;

  // Notes
  getNotes(taskId: string): Promise<TaskNote[]>;
  addNote(taskId: string, content: string, isSystem?: boolean): Promise<TaskNote>;

  // Links
  getLinks(taskId: string): Promise<TaskLink[]>;
  addLink(taskId: string, url: string, displayName: string, linkType: TaskLink['linkType']): Promise<TaskLink>;
  removeLink(linkId: string): Promise<void>;

  // Tags
  getTags(): Promise<Tag[]>;
  createTag(name: string, colour: string): Promise<Tag>;

  // Users
  getCurrentUser(): Promise<User>;
  getUsers(): Promise<User[]>;
}
