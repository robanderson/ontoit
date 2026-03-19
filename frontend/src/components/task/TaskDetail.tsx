import { useState, useEffect, useCallback } from 'react';
import {
  X, Calendar, Tag, Trash2, GitBranch, ExternalLink,
  Plus, Link as LinkIcon, ChevronDown, ChevronRight,
} from 'lucide-react';
import type { Task, TaskNote, TaskLink, TaskPriority, TaskStatus } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { TaskNotes } from './TaskNotes';
import { SubTaskList } from './SubTaskList';
import { AddLinkForm } from './AddLinkForm';

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'var(--color-priority-urgent)' },
  { value: 'high', label: 'High', color: 'var(--color-priority-high)' },
  { value: 'medium', label: 'Medium', color: 'var(--color-priority-medium)' },
  { value: 'low', label: 'Low', color: 'var(--color-priority-low)' },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'backlog', label: 'My Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
];

export function TaskDetail() {
  const {
    selectedTaskId, tasks, tags: allTags, users, currentUser,
    closeTaskDetail, updateTask, deleteTask, moveTask,
    getNotes, getLinks, getChildTasks, addLink, removeLink,
    createTask,
  } = useAppStore();

  const task = tasks.find(t => t.id === selectedTaskId) ?? null;
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [children, setChildren] = useState<Task[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showSubTasks, setShowSubTasks] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const loadTaskData = useCallback(async () => {
    if (!task) return;
    const [n, l, c] = await Promise.all([
      getNotes(task.id),
      getLinks(task.id),
      getChildTasks(task.id),
    ]);
    setNotes(n);
    setLinks(l);
    setChildren(c);
    setTitle(task.title);
    setDescription(task.description);
  }, [task, getNotes, getLinks, getChildTasks]);

  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  // Sync title/description when task changes externally
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
    }
  }, [task]);

  if (!task) return null;

  const parentTask = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : null;
  const assignee = task.assignedTo ? users.find(u => u.id === task.assignedTo) : null;
  const childDone = children.filter(c => c.status === 'complete').length;

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() });
    }
  };

  const handleDescBlur = () => {
    if (description !== task.description) {
      updateTask(task.id, { description });
    }
  };

  const handleAddLink = async (url: string, displayName: string, linkType: TaskLink['linkType']) => {
    await addLink(task.id, url, displayName, linkType);
    const l = await getLinks(task.id);
    setLinks(l);
    setShowAddLink(false);
  };

  const handleRemoveLink = async (linkId: string) => {
    await removeLink(linkId);
    const l = await getLinks(task.id);
    setLinks(l);
  };

  const handleAddSubTask = async () => {
    await createTask({
      title: 'New sub-task',
      parentTaskId: task.id,
      priority: task.priority,
    });
    const c = await getChildTasks(task.id);
    setChildren(c);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={closeTaskDetail} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            {parentTask && (
              <>
                <GitBranch size={12} />
                <span>{parentTask.title}</span>
                <span>/</span>
              </>
            )}
            <select
              value={task.status}
              onChange={(e) => {
                const newStatus = e.target.value as TaskStatus;
                if (newStatus === 'unassigned') {
                  moveTask(task.id, 'unassigned', 0, null);
                } else if (task.status === 'unassigned' && currentUser) {
                  moveTask(task.id, newStatus, 0, currentUser.id);
                } else {
                  moveTask(task.id, newStatus, 0);
                }
              }}
              className="text-xs px-2 py-1 border border-[var(--color-border)] rounded-md bg-white uppercase font-medium"
            >
              {statusOptions.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => deleteTask(task.id)}
              className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-priority-urgent)] rounded transition-colors"
              title="Archive task"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={closeTaskDetail} className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">
            {/* Title */}
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                className="text-lg font-semibold text-[var(--color-text-primary)] w-full border-b-2 border-[var(--color-brand-500)] outline-none pb-1"
              />
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                className="text-lg font-semibold text-[var(--color-text-primary)] cursor-text hover:text-[var(--color-brand-600)] transition-colors"
              >
                {task.title}
              </h2>
            )}

            {/* Meta row: priority, due date, assignee */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={task.priority}
                onChange={(e) => updateTask(task.id, { priority: e.target.value as TaskPriority })}
                className="text-xs px-2 py-1 border border-[var(--color-border)] rounded-md bg-white"
              >
                {priorityOptions.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-[var(--color-text-tertiary)]" />
                <input
                  type="date"
                  value={task.dueDate ?? ''}
                  onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
                  className="text-xs px-2 py-1 border border-[var(--color-border)] rounded-md bg-white"
                />
              </div>

              {assignee && (
                <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-600)] flex items-center justify-center text-[9px] font-medium">
                    {assignee.displayName.charAt(0)}
                  </div>
                  {assignee.displayName}
                </span>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide flex items-center gap-1.5">
                <Tag size={13} />
                Categories
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {allTags.map(tag => {
                  const isActive = task.tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const newTags = isActive
                          ? task.tags.filter(id => id !== tag.id)
                          : [...task.tags, tag.id];
                        updateTask(task.id, { tags: newTags });
                      }}
                      className={`text-xs font-medium px-2 py-0.5 rounded border transition-all ${
                        isActive
                          ? 'border-transparent'
                          : 'border-dashed border-[var(--color-border)] opacity-40 hover:opacity-70'
                      }`}
                      style={{
                        color: tag.colour,
                        backgroundColor: isActive ? `${tag.colour}15` : 'transparent',
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Add a description..."
                rows={4}
                className="mt-1 w-full text-sm text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-200)] resize-y"
              />
            </div>

            {/* Sub-tasks */}
            <div>
              <button
                onClick={() => setShowSubTasks(!showSubTasks)}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide hover:text-[var(--color-text-secondary)]"
              >
                {showSubTasks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Sub-tasks
                {children.length > 0 && (
                  <span className="ml-1 text-[var(--color-text-tertiary)]">
                    ({childDone}/{children.length})
                  </span>
                )}
              </button>
              {showSubTasks && (
                <div className="mt-2">
                  <SubTaskList tasks={children} />
                  <button
                    onClick={handleAddSubTask}
                    className="flex items-center gap-1 mt-2 text-xs text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
                  >
                    <Plus size={13} />
                    Add sub-task
                  </button>
                </div>
              )}
            </div>

            {/* Links */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">Links</span>
                <button
                  onClick={() => setShowAddLink(!showAddLink)}
                  className="text-xs text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] flex items-center gap-1"
                >
                  <Plus size={12} /> Add Link
                </button>
              </div>
              {showAddLink && (
                <div className="mt-2">
                  <AddLinkForm onAdd={handleAddLink} onCancel={() => setShowAddLink(false)} />
                </div>
              )}
              {links.length > 0 && (
                <div className="mt-2 space-y-1">
                  {links.map(link => (
                    <div key={link.id} className="flex items-center justify-between group px-2 py-1.5 rounded hover:bg-[var(--color-surface-secondary)]">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--color-brand-600)] hover:underline truncate"
                      >
                        {link.linkType === 'google_drive' ? (
                          <LinkIcon size={13} className="shrink-0" />
                        ) : (
                          <ExternalLink size={13} className="shrink-0" />
                        )}
                        {link.displayName}
                      </a>
                      <button
                        onClick={() => handleRemoveLink(link.id)}
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-priority-urgent)] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diary / Notes */}
            <TaskNotes taskId={task.id} notes={notes} onNotesChanged={loadTaskData} />
          </div>
        </div>
      </div>
    </div>
  );
}
