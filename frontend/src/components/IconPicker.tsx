import React, { useMemo, useState } from 'react';
import * as OutlineIcons from '@heroicons/react/24/outline';

// Convert exported Heroicon component name (e.g. AcademicCapIcon) to kebab key (academic-cap)
function pascalToKebab(name: string) {
  return name
    .replace(/Icon$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

export interface IconPickerProps {
  value?: string | null;
  onChange: (key: string) => void;
  onClose?: () => void;
}

// NOTE: Importing the entire icon set increases the bundle. Since this is admin-only UI,
// we accept the tradeoff. For future optimization: dynamic import, virtualized list, or subset.
export default function IconPicker({ value, onChange, onClose }: IconPickerProps) {
  const [query, setQuery] = useState('');

  const icons = useMemo(() => {
    return Object.entries(OutlineIcons)
      .filter(([name]) => /Icon$/.test(name))
      .map(([name, Comp]) => ({
        key: pascalToKebab(name),
        name,
        Component: Comp as React.ComponentType<React.SVGProps<SVGSVGElement>>,
      }));
  }, []);

  const filtered = icons.filter(i => {
    const q = query.toLowerCase();
    return !q || i.key.includes(q) || i.name.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold">Choose an Icon</h3>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-black">Close</button>
        </div>
        <div className="p-4 flex-1 min-h-0 overflow-y-auto">
          <div className="sticky top-0 bg-white pb-4">
            <input
              autoFocus
              placeholder="Search icons..."
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
            {filtered.map(icon => {
              const active = value === icon.key;
              return (
                <button
                  key={icon.key}
                  type="button"
                  onClick={() => onChange(icon.key)}
                  className={`group flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs transition ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}
                  title={icon.key}
                >
                  <icon.Component className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'}`} />
                  <span className="truncate w-full text-center" style={{ lineHeight: '1.1' }}>{icon.key}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-500">No icons match "{query}".</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
