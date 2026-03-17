import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import type { TaskNote } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface TaskNotesProps {
  taskId: string;
  notes: TaskNote[];
  onNotesChanged: () => void;
}

export function TaskNotes({ taskId, notes, onNotesChanged }: TaskNotesProps) {
  const { addNote, users } = useAppStore();
  const [newNote, setNewNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await addNote(taskId, newNote.trim());
    setNewNote('');
    onNotesChanged();
  };

  return (
    <div>
      <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide flex items-center gap-1.5">
        <MessageSquare size={13} />
        Activity
        {notes.length > 0 && <span>({notes.length})</span>}
      </span>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 text-sm px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-200)]"
        />
        <button
          type="submit"
          disabled={!newNote.trim()}
          className="px-3 py-2 text-white bg-[var(--color-brand-600)] rounded-lg hover:bg-[var(--color-brand-700)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={14} />
        </button>
      </form>

      {/* Notes list */}
      <div className="mt-3 space-y-2">
        {notes.map(note => {
          const author = users.find(u => u.id === note.authorId);
          const time = new Date(note.createdAt).toLocaleString('en-GB', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          });
          return (
            <div key={note.id} className={`text-sm rounded-lg px-3 py-2 ${note.isSystem ? 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)] italic' : 'bg-[var(--color-surface-secondary)]'}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {author?.displayName ?? 'Unknown'}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{time}</span>
              </div>
              <p className="text-[var(--color-text-primary)]">{note.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
