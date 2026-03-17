import { useAppStore } from '../../store/useAppStore';
import type { EnvironmentMode } from '../../types';

const envConfig: Record<EnvironmentMode, { label: string; color: string; bg: string }> = {
  local: { label: 'LOCAL — Test Mode', color: 'var(--color-env-local)', bg: '#fff5f5' },
  development: { label: 'Development', color: 'var(--color-env-development)', bg: '#fff4e6' },
  production: { label: 'Production', color: 'var(--color-env-production)', bg: '#ebfbee' },
  staging: { label: 'Staging', color: 'var(--color-env-staging)', bg: '#e7f5ff' },
};

export function EnvironmentBadge() {
  const environment = useAppStore((s) => s.environment);
  const config = envConfig[environment];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full"
      style={{ color: config.color, backgroundColor: config.bg, border: `1px solid ${config.color}30` }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
