import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Task, TaskStatus } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface AssignDialogProps {
  task: Task;
  targetStatus: TaskStatus;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}

export function AssignDialog({ task, targetStatus, onConfirm, onCancel }: AssignDialogProps) {
  const [note, setNote] = useState('');
  const currentUser = useAppStore((s) => s.currentUser);

  const targetLabel = targetStatus === 'backlog' ? 'My Backlog' : 'In Progress';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Assign Task</h3>
          <button onClick={onCancel} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-[var(--color-brand-50)] rounded-lg">
            <AlertTriangle size={18} className="text-[var(--color-brand-600)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                "{task.title}"
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                This task will be assigned to <strong>{currentUser?.displayName}</strong> and moved to <strong>{targetLabel}</strong>.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Add a note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="E.g., I'll start on this after the sprint meeting..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-200)] focus:border-[var(--color-brand-500)] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-brand-600)] rounded-lg hover:bg-[var(--color-brand-700)] transition-colors"
          >
            Assign to Me
          </button>
        </div>
      </div>
    </div>
  );
}
