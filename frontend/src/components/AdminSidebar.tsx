import React, { useState } from 'react';
import './CourseSidebar.css';
import { UserGroupIcon, AcademicCapIcon, UserPlusIcon } from '@heroicons/react/24/outline';

export type AdminTab = 'users' | 'courses' | 'enrollments';

interface AdminSidebarProps {
  active?: AdminTab;
  onChange?: (tab: AdminTab) => void;
}

const iconClass = 'h-5 w-5';
const UsersIcon: React.FC = () => <UserGroupIcon className={iconClass} />;
const CoursesIcon: React.FC = () => <AcademicCapIcon className={iconClass} />;
const EnrollmentsIcon: React.FC = () => <UserPlusIcon className={iconClass} />;

const AdminSidebar: React.FC<AdminSidebarProps> = ({ active, onChange }) => {
  const [expanded, setExpanded] = useState<boolean>(true);

  const items: Array<{ key: AdminTab; label: string; icon: React.ReactNode }>= [
    { key: 'users', label: 'Users', icon: <UsersIcon /> },
    { key: 'courses', label: 'Courses', icon: <CoursesIcon /> },
    { key: 'enrollments', label: 'Enrollments', icon: <EnrollmentsIcon /> },
  ];

  const handleClick = (item: typeof items[0]) => {
    if (onChange) {
      onChange(item.key);
    }
  };

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
            onClick={(e) => { e.preventDefault(); handleClick(it); }}
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
