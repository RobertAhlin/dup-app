import { useEffect, useRef } from 'react'

// Minimal shapes to avoid circular imports
export type HubPreview = { title: string; color?: string }
export type TaskPreview = { title: string; task_kind: string; color?: string }

type Props = {
  open: boolean
  type: 'hub' | 'task'
  hub?: HubPreview
  task?: TaskPreview
  onClose: () => void
}

export default function NodeModal({ open, type, hub, task, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    // Focus the close button initially
    closeBtnRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      // Basic focus trap within the dialog
      const container = dialogRef.current
      if (!container) return
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30" role="dialog" aria-modal="true">
      <div ref={dialogRef} className="bg-white rounded-xl shadow-xl w-[min(560px,90vw)] max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 id="node-modal-title" className="text-sm font-semibold text-slate-700">
            {type === 'hub' ? (hub?.title ?? 'Hub') : (task?.title ?? 'Task')} details
          </h3>
          <button ref={closeBtnRef} className="text-slate-500 hover:text-slate-700" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="p-4 text-sm text-slate-700">
          {type === 'hub' && hub && (
            <div className="space-y-2">
              <div><span className="font-medium">Title:</span> {hub.title}</div>
              
            </div>
          )}
          {type === 'task' && task && (
            <div className="space-y-2">
              <div><span className="font-medium">Task:</span> {task.title}</div>
              <div><span className="font-medium">Type:</span> {task.task_kind}</div>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
          <button className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
