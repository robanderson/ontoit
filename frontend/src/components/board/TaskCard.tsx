import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, GitBranch, Flag } from 'lucide-react';
import type { Task } from '../../types';
import { useAppStore } from '../../store/useAppStore';

const priorityColors: Record<string, string> = {
  urgent: 'var(--color-priority-urgent)',
  high: 'var(--color-priority-high)',
  medium: 'var(--color-priority-medium)',
  low: 'var(--color-priority-low)',
};

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { selectTask, tags: allTags, tasks, users } = useAppStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const taskTags = allTags.filter(t => task.tags.includes(t.id));
  const childCount = tasks.filter(t => t.parentTaskId === task.id && t.status !== 'archived').length;
  const childDone = tasks.filter(t => t.parentTaskId === task.id && t.status === 'complete').length;
  const parentTask = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : null;
  const assignee = task.assignedTo ? users.find(u => u.id === task.assignedTo) : null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'complete';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => selectTask(task.id)}
      className="bg-white rounded-lg border border-[var(--color-border)] p-3 cursor-grab active:cursor-grabbing hover:border-[var(--color-border-strong)] hover:shadow-sm transition-all group"
    >
      {/* Parent indicator */}
      {parentTask && (
        <div className="text-xs text-[var(--color-text-tertiary)] mb-1.5 flex items-center gap-1">
          <GitBranch size={10} />
          {parentTask.title}
        </div>
      )}

      {/* Priority + Title */}
      <div className="flex items-start gap-2">
        <Flag
          size={14}
          className="mt-0.5 shrink-0"
          style={{ color: priorityColors[task.priority] }}
          fill={task.priority === 'urgent' ? priorityColors[task.priority] : 'none'}
        />
        <span className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
          {task.title}
        </span>
      </div>

      {/* Tags */}
      {taskTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {taskTags.map(tag => (
            <span
              key={tag.id}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ color: tag.colour, backgroundColor: `${tag.colour}15` }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: due date, subtask count, assignee */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-[var(--color-priority-urgent)] font-medium' : 'text-[var(--color-text-tertiary)]'}`}>
              <Calendar size={11} />
              {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {childCount > 0 && (
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {childDone}/{childCount} sub-tasks
            </span>
          )}
        </div>
        {assignee && (
          <div
            className="w-5 h-5 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-600)] flex items-center justify-center text-[10px] font-medium"
            title={assignee.displayName}
          >
            {assignee.displayName.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
}
