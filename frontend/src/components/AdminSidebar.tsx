import React, { useState } from 'react';
import './CourseSidebar.css';

export type AdminTab = 'users' | 'courses';

interface AdminSidebarProps {
  active: AdminTab;
  onChange: (tab: AdminTab) => void;
}

const UsersIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
    <path d="M2 20c0-3.3137 2.6863-6 6-6" stroke="currentColor" strokeWidth="2" />
    <circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="2" />
    <path d="M14 20c0-2.2091 1.7909-4 4-4" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const CoursesIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M4 10h16" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const AdminSidebar: React.FC<AdminSidebarProps> = ({ active, onChange }) => {
  const [expanded, setExpanded] = useState<boolean>(true);

  const items: Array<{ key: AdminTab; label: string; icon: React.ReactNode }>= [
    { key: 'users', label: 'Users', icon: <UsersIcon /> },
    { key: 'courses', label: 'Courses', icon: <CoursesIcon /> },
  ];

  return (
    <aside className={`course-sidebar ${expanded ? 'expanded' : ''}`} aria-label="Admin Tabs">
      <button
        type="button"
        className="course-sidebar__toggle"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        title={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? '⟨' : '⟩'}
      </button>

      <nav className="course-sidebar__list">
        {items.map((it) => (
          <a
            key={it.key}
            className="course-sidebar__item"
            href="#"
            onClick={(e) => { e.preventDefault(); onChange(it.key); }}
            data-label={it.label}
            title={it.label}
            style={active === it.key ? { background: '#ecf2ff' } : undefined}
          >
            <span className="course-sidebar__icon" aria-hidden>
              {it.icon}
            </span>
            {expanded && (
              <span className="course-sidebar__label">{it.label}</span>
            )}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
