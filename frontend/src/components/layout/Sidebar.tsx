import { PanelLeftClose, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { TaskStatus } from '../../types';

const sidebarItems: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'unassigned', label: 'Unassigned', color: 'var(--color-text-tertiary)' },
  { status: 'backlog', label: 'My Backlog', color: 'var(--color-brand-500)' },
  { status: 'in_progress', label: 'In Progress', color: 'var(--color-env-development)' },
  { status: 'complete', label: 'Complete', color: 'var(--color-env-production)' },
];

export function Sidebar() {
  const { columnVisibility, toggleColumnVisibility, toggleSidebar, tasks, currentUser } = useAppStore();

  const getCount = (status: TaskStatus) => {
    const filtered = tasks.filter(t => t.status === status);
    if (status === 'unassigned') return filtered.length;
    if (!currentUser) return filtered.length;
    return filtered.filter(t => t.assignedTo === currentUser.id).length;
  };

  return (
    <aside className="w-56 bg-white border-r border-[var(--color-border)] flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Columns
        </span>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          title="Close sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <nav className="flex-1 py-2">
        {sidebarItems.map(({ status, label, color }) => {
          const visible = columnVisibility[status];
          const count = getCount(status);

          return (
            <button
              key={status}
              onClick={() => toggleColumnVisibility(status)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-[var(--color-surface-tertiary)] ${
                visible ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${!visible ? 'opacity-30' : ''}`}
                style={{ backgroundColor: color }}
              />
              <span className="flex-1 text-left">{label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                visible
                  ? 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)]'
                  : 'bg-transparent text-[var(--color-text-tertiary)]'
              }`}>
                {count}
              </span>
              {visible
                ? <Eye size={14} className="text-[var(--color-text-tertiary)] shrink-0" />
                : <EyeOff size={14} className="text-[var(--color-text-tertiary)] opacity-50 shrink-0" />
              }
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
