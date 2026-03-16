import { useState } from 'react';
import type { TaskLink } from '../../types';

interface AddLinkFormProps {
  onAdd: (url: string, displayName: string, linkType: TaskLink['linkType']) => void;
  onCancel: () => void;
}

export function AddLinkForm({ onAdd, onCancel }: AddLinkFormProps) {
  const [url, setUrl] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const linkType: TaskLink['linkType'] = url.includes('drive.google.com') ? 'google_drive' : 'external';
    onAdd(url.trim(), displayName.trim() || url.trim(), linkType);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="w-full text-sm px-2.5 py-1.5 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-200)]"
      />
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name (optional)"
        className="w-full text-sm px-2.5 py-1.5 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-200)]"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-xs px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          Cancel
        </button>
        <button type="submit" disabled={!url.trim()} className="text-xs px-3 py-1.5 bg-[var(--color-brand-600)] text-white rounded-md hover:bg-[var(--color-brand-700)] disabled:opacity-40">
          Add Link
        </button>
      </div>
    </form>
  );
}
