import React, { useEffect, useState } from "react";
import "./CourseSidebar.css";
import { listCourses } from "../api/courses";
import {
  BookOpenIcon,
  BeakerIcon,
  CpuChipIcon,
  LockClosedIcon,
  RectangleGroupIcon,
  GlobeAltIcon,
  ServerIcon,
  CubeIcon,
  WindowIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

export type CourseItem = {
  id: string;
  name: string;
  icon?: React.ReactNode;
};

// Fallback icons from Heroicons to assign deterministically
const iconClass = "h-5 w-5";
const fallbackIcons = [
  <CpuChipIcon key="i1" className={iconClass} />,
  <BookOpenIcon key="i2" className={iconClass} />,
  <BeakerIcon key="i3" className={iconClass} />,
  <LockClosedIcon key="i4" className={iconClass} />,
  <RectangleGroupIcon key="i5" className={iconClass} />,
];

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
        // Map to CourseItem using icon from DB when available
        const iconFromString = (key?: string | null): React.ReactNode => {
          switch ((key || '').toLowerCase()) {
            case 'globe-alt':
              return <GlobeAltIcon className={iconClass} />;
            case 'server':
              return <ServerIcon className={iconClass} />;
            case 'cube':
              return <CubeIcon className={iconClass} />;
            case 'window':
              return <WindowIcon className={iconClass} />;
            case 'rocket-launch':
              return <RocketLaunchIcon className={iconClass} />;
            default:
              return fallbackIcons[0];
          }
        };
        const mapped: CourseItem[] = list.map(c => ({
          id: String(c.id),
          name: c.title,
          icon: iconFromString(c.icon ?? null),
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
              {c.icon || <BookOpenIcon className={iconClass} />}
            </span>
            {expanded && <span className="course-sidebar__label">{c.name}</span>}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default CourseSidebar;
