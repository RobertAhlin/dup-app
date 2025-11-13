import CourseSidebar from "./CourseSidebar";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import type { ReactNode } from "react";

interface MainCardProps {
  name: string;
  email: string;
  role: string;
  children?: ReactNode;
  // Optional overrides
  title?: string; // Prefix before the name, e.g., "Admin:" (default: "Welcome,")
  chip?: { label: string; to: string } | null; // When set, renders a chip button with label that navigates to 'to'
  hideSidebar?: boolean; // When true, hide the CourseSidebar and use single-column layout
  sidebar?: ReactNode; // Optional custom sidebar content to render instead of CourseSidebar
  onSelectCourse?: (id: number) => void;
}

export default function MainCard({ name, role, children, title, chip, hideSidebar = false, sidebar, onSelectCourse }: MainCardProps) {
  const navigate = useNavigate();
  const isAdmin = (role || '').toLowerCase() === 'admin';
  const headingPrefix = title ?? 'Welcome,';
  const handleSelectCourse = useCallback((id: number) => {
    if (onSelectCourse) {
      onSelectCourse(id);
      return;
    }
    navigate(`/courses/${id}`);
  }, [navigate, onSelectCourse]);
  return (
  <div className="bg-white rounded-2xl shadow-2xl w-[calc(100vw-1.5rem)] min-h-[calc(100vh-1.5rem)] font-sans p-3 m-3">
  <div className="bg-linear-to-br from-[#01105a] to-[#313135] mb-3 md:p-8 p-3 text-white rounded-xl">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3">
            <h1 className="inline text-2xl font-bold text-white leading-tight">
              {headingPrefix} {name}
            </h1>
            <div className="ms-auto flex items-center gap-2">
              {chip ? (
                <button
                  type="button"
                  onClick={() => navigate(chip.to)}
                  className="bg-white/20 py-1 px-3 rounded-full text-sm capitalize backdrop-blur-md hover:bg-white/30 transition-colors cursor-pointer"
                  title={chip.label}
                >
                  {chip.label}
                </button>
              ) : isAdmin ? (
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="bg-white/20 py-1 px-3 rounded-full text-sm capitalize backdrop-blur-md hover:bg-white/30 transition-colors cursor-pointer"
                  title="Go to Admin Dashboard"
                >
                  {role}
                </button>
              ) : (
                <span className="bg-white/20 py-1 px-3 rounded-full text-sm capitalize backdrop-blur-md">
                  {role}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
  <div className={`p-4 md:p-4 min-h-[200px] grid ${hideSidebar ? 'grid-cols-1' : 'grid-cols-[auto_1fr]'} gap-4 overflow-auto`}>
        {!hideSidebar && (sidebar ?? <CourseSidebar onSelectCourse={handleSelectCourse} />)}
        <div className="bg-white rounded-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
