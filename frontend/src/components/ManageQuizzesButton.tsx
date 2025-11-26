import { useState } from 'react'

type ManageQuizzesButtonProps = {
  onClick: () => void
}

export default function ManageQuizzesButton({ onClick }: ManageQuizzesButtonProps) {
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      className={`ml-auto px-4 py-3.5 text-xs border-3 border-gray-300 font-semibold uppercase tracking-wide rounded-full transition-all ${
        pressed ? 'bg-gray-200 cursor-pointer' : 'bg-white hover:bg-gray-100 cursor-pointer'
      } text-slate-900`}
      style={pressed ? { boxShadow: 'inset 3px 3px 0 rgba(0,0,0,0.1), inset 1px 1px 0 rgba(0,0,0,0.2)' } : undefined}
    >
      Manage Quizzes
    </button>
  )
}
