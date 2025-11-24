import React from "react";
import { useNavigate } from "react-router-dom";

interface MainCardHeaderProps {
  name: string;
  role: string;
  title?: string;
  chip?: { label: string; to: string } | null;
  headerElement?: React.ReactNode;
}

export default function MainCardHeader({ name, role, title, chip, headerElement }: MainCardHeaderProps) {
  const navigate = useNavigate();
  const isAdmin = (role || '').toLowerCase() === 'admin';
  const headingPrefix = title ?? 'Welcome,';

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3">
      {headerElement}
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
  );
}
