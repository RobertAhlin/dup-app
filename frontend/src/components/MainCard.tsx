import CourseSidebar from "./CourseSidebar";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { useAlert } from "../contexts/useAlert";
import MainCardHeader from "./MainCardHeader";

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
    headerElement?: ReactNode;
}

export default function MainCard({ name, role, children, title, chip, hideSidebar = false, sidebar, onSelectCourse, headerElement }: MainCardProps) {
  const navigate = useNavigate();
  // Props are destructured above; remove unused variables
  const handleSelectCourse = useCallback((id: number) => {
    if (onSelectCourse) {
      onSelectCourse(id);
      return;
    }
    navigate(`/courses/${id}`);
  }, [navigate, onSelectCourse]);

  const { showAlert } = useAlert();

  useEffect(() => {
    // Check the non-HttpOnly socketToken cookie (JWT) for expiry and show an info alert
    // when there is <= 1 hour remaining. We store a sessionStorage key per-exp to avoid
    // spamming the user repeatedly.
    const checkExpiry = () => {
      try {
        const cookie = document.cookie
          .split('; ')
          .find((c) => c.startsWith('socketToken='));
        if (!cookie) return;
        const token = cookie.split('=')[1];
        if (!token) return;

        const parts = token.split('.');
        if (parts.length < 2) return;
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4;
        const padded = b64 + (pad ? '='.repeat(4 - pad) : '');
        // atob may throw for malformed data
        const json = decodeURIComponent(escape(window.atob(padded)));
        const payload = JSON.parse(json);
        const exp = payload?.exp;
        if (!exp) return;
        const remainingMs = exp * 1000 - Date.now();
        const oneHourMs = 60 * 60 * 1000;
        if (remainingMs > 0 && remainingMs <= oneHourMs) {
          const key = `session-expiry-warning:${exp}`;
          if (!sessionStorage.getItem(key)) {
            showAlert(
              'info',
              'Your session will expire in less than 1 hour. Save your work or re-login.',
              false
            );
            sessionStorage.setItem(key, String(Date.now()));
          }
        }
      } catch {
        // silent
      }
    };

    checkExpiry();
    const id = window.setInterval(checkExpiry, 60 * 1000);
    return () => window.clearInterval(id);
  }, [showAlert]);
  return (
  <div className="bg-white rounded-2xl shadow-2xl w-[calc(100vw-1.5rem)] min-h-[calc(100vh-1.5rem)] font-sans p-3 m-3">
  <div className="bg-linear-to-br from-[#01105a] to-[#313135] mb-3 md:p-8 p-3 text-white rounded-xl">
        <div className="flex flex-col gap-5">
            <MainCardHeader
              name={name}
              role={role}
              title={title}
              chip={chip}
              headerElement={headerElement}
            />
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
