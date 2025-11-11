import React, { useEffect, useState } from "react";
import "./CourseSidebar.css";
import { listCourses } from "../api/courses";

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

// Fallback icons to assign pseudo-randomly if needed
const fallbackIcons = [<ChipIcon key="i1" />, <DefaultIcon key="i2" />, <BeakerIcon key="i3" />, <LockIcon key="i4" />, <BookIcon key="i5" />];

export interface CourseSidebarProps {
  items?: CourseItem[]; // optional override
  onSelectCourse?: (id: number) => void;
}

const CourseSidebar: React.FC<CourseSidebarProps> = ({ items, onSelectCourse }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [courses, setCourses] = useState<CourseItem[]>(items ?? []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (items && items.length) {
      setCourses(items);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const list = await listCourses();
        // Map to CourseItem assigning an icon deterministically by id
        const mapped: CourseItem[] = list.map(c => ({
          id: String(c.id),
          name: c.title,
          icon: fallbackIcons[c.id % fallbackIcons.length],
        }));
        setCourses(mapped);
      } catch {
        setError("Failed to load courses");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [items]);

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
        {loading && <div className="course-sidebar__item" style={{justifyContent:'center'}}>Loading…</div>}
        {!loading && error && <div className="course-sidebar__item" style={{color:'#b00020'}}>{error}</div>}
        {!loading && !error && courses.map(c => (
          <a
            key={c.id}
            className="course-sidebar__item"
            href="#"
            onClick={(e) => { e.preventDefault(); onSelectCourse?.(Number(c.id)); }}
            data-label={c.name}
            title={c.name}
          >
            <span className="course-sidebar__icon" aria-hidden>
              {c.icon || <DefaultIcon />}
            </span>
            {expanded && <span className="course-sidebar__label">{c.name}</span>}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default CourseSidebar;
