type CourseLockToggleProps = {
  isLocked: boolean
  onToggle: () => void
  loading?: boolean
}

export default function CourseLockToggle({ isLocked, onToggle, loading = false }: CourseLockToggleProps) {
  return (
    <div className="ml-auto" aria-label="Lock course" role="group">
      <span className="pl-13 text-xs font-semibold uppercase">Course</span>
      <div
        className="relative flex items-center w-30 h-7 rounded-full border border-slate-300 bg-linear-to-br from-slate-200 via-slate-100 to-white shadow-inner p-0.5"
        style={{ minWidth: '148px' }}
      >
        {/* Animated slider background */}
        <div
          className="absolute top-0 left-0 h-full w-full rounded-full pointer-events-none"
          style={{
            transition: 'background 0.4s',
            background: isLocked
              ? 'linear-gradient(90deg, #f87171 60%, #f87171 100%)'
              : 'linear-gradient(90deg, #a3e635 60%, #a3e635 100%)',
            opacity: 0.25,
          }}
        />
        {/* Slider knob */}
        <div
          className="absolute top-0.8 left-1 h-6 rounded-full bg-white shadow transition-all duration-400"
          style={{
            width: isLocked ? '64px' : '80px',
            transform: isLocked ? 'translateX(-2px)' : 'translateX(60px)',
            transition: 'transform 0.4s cubic-bezier(.4,0,.2,1), width 0.4s cubic-bezier(.4,0,.2,1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        />
        {/* Buttons (labels) */}
        <button
          type="button"
          onClick={onToggle}
          disabled={loading}
          className={`flex-1 px-2 text-xs font-semibold uppercase tracking-wide rounded-full transition-all duration-400 ${
            isLocked
              ? 'text-slate-900'
              : 'text-slate-500 hover:text-blue-500 cursor-pointer'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            color: isLocked ? '#b91c1c' : undefined,
            transition: 'color 0.4s',
            zIndex: 2,
            fontWeight: 600,
          }}
        >
          Locked
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={loading}
          className={`flex-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all duration-400 ${
            !isLocked
              ? 'text-slate-900'
              : 'text-slate-500 hover:text-blue-500 cursor-pointer'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            color: !isLocked ? '#65a30d' : undefined,
            transition: 'color 0.4s',
            zIndex: 2,
            fontWeight: 600,
          }}
        >
          Unlocked
        </button>
      </div>
    </div>
  )
}
