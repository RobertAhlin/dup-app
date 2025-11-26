type ModeSwitcherProps = {
  mode: 'student' | 'edit'
  onChange: (mode: 'student' | 'edit') => void
}

export default function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className="ml-2" aria-label="Switch view mode" role="group">
      <div className="flex rounded-full border border-slate-300 bg-linear-to-br from-slate-200 via-slate-100 to-white shadow-inner p-0.5">
        <button
          type="button"
          onClick={() => onChange('student')}
          className={`flex-1 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all ${
            mode === 'student'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 cursor-pointer'
          }`}
        >
          Student view
        </button>
        <button
          type="button"
          onClick={() => onChange('edit')}
          className={`flex-1 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all ${
            mode === 'edit'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 cursor-pointer'
          }`}
        >
          Edit mode
        </button>
      </div>
    </div>
  )
}
