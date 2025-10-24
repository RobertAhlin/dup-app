import React, { useState } from "react";
import "./CourseSidebar.css";

export type CourseItem = {
  id: string;
  name: string;
  icon?: React.ReactNode;
};

const DefaultIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect
      x="3"
      y="4"
      width="18"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const BookIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path d="M8 4v15" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const BeakerIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 3h12" stroke="currentColor" strokeWidth="2" />
    <path
      d="M9 3v5l-4 9a3 3 0 0 0 2.7 4h8.6a3 3 0 0 0 2.7-4l-4-9V3"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);

const ChipIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect
      x="7"
      y="7"
      width="10"
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 1v4M12 19v4M1 12h4M19 12h4M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const LockIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect
      x="4"
      y="10"
      width="16"
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const defaultCourses: CourseItem[] = [
  { id: "c1", name: "Algorithms", icon: <ChipIcon /> },
  { id: "c2", name: "Databases", icon: <DefaultIcon /> },
  { id: "c3", name: "Networking", icon: <BeakerIcon /> },
  { id: "c4", name: "Security", icon: <LockIcon /> },
  { id: "c5", name: "Literature", icon: <BookIcon /> },
];

export type CourseSidebarProps = {
  items?: CourseItem[];
};

const CourseSidebar: React.FC<CourseSidebarProps> = ({ items }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const list = items && items.length > 0 ? items : defaultCourses;

  return (
    <aside
      className={`course-sidebar ${expanded ? "expanded" : ""}`}
      aria-label="Courses"
    >
      <button
        type="button"
        className="course-sidebar__toggle"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        title={expanded ? "Collapse" : "Expand"}
      >
        {expanded ? "⟨" : "⟩"}
      </button>

      <nav className="course-sidebar__list">
        {list.map((c) => (
          <a
            key={c.id}
            className="course-sidebar__item"
            href="#"
            onClick={(e) => e.preventDefault()}
            data-label={c.name}
            title={c.name}
          >
            <span className="course-sidebar__icon" aria-hidden>
              {c.icon || <DefaultIcon />}
            </span>
            {expanded && (
              <span className="course-sidebar__label">{c.name}</span>
            )}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default CourseSidebar;
