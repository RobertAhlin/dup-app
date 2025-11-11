import React, { useEffect, useState } from "react";
import "./CourseSidebar.css";
import { listCourses } from "../api/courses";
import * as OutlineIcons from "@heroicons/react/24/outline";

export type CourseItem = {
  id: string;
  name: string;
  icon?: React.ReactNode;
  description?: string;
};

// Icon sizing
const iconClass = "h-5 w-5";

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
        // Map to CourseItem using icon from DB when available (dynamic mapping of any outline icon)
        const IconsMap = OutlineIcons as unknown as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>;
        const iconFromString = (key?: string | null): React.ReactNode => {
          const kebab = (key || '').toLowerCase();
          const pascal = kebab
            .split('-')
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join('') + 'Icon';
          const Fallback = IconsMap['ExclamationTriangleIcon'];
          const Comp = IconsMap[pascal] || Fallback;
          return <Comp className={iconClass} />;
        };
        const mapped: CourseItem[] = list.map(c => ({
          id: String(c.id),
          name: c.title,
          icon: iconFromString(c.icon ?? null),
          description: c.description ?? '',
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
            data-label={expanded ? (c.description || c.name) : c.name}
          >
            <span className="course-sidebar__icon" aria-hidden>
              {c.icon}
            </span>
            {expanded && <span className="course-sidebar__label">{c.name}</span>}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default CourseSidebar;
