import { useEffect, useRef, useState, useMemo } from 'react'

// Minimal shapes to avoid circular imports
export type HubPreview = { id: number; title: string; color?: string; is_start?: boolean }
export type TaskPreview = { id: number; title: string; task_kind: string; color?: string }

type Props = {
  open: boolean
  type: 'hub' | 'task'
  hub?: HubPreview
  task?: TaskPreview
  onClose: () => void
  canEdit: boolean
  // Edit callbacks
  onUpdateHub?: (hubId: number, updates: { title?: string; color?: string; is_start?: boolean }) => Promise<void> | void
  onDeleteHub?: (hubId: number) => Promise<void> | void
  onUpdateTask?: (taskId: number, updates: { title?: string; task_kind?: 'content'|'quiz'|'assignment'|'reflection' }) => Promise<void> | void
  onDeleteTask?: (taskId: number) => Promise<void> | void
  // Student progress callbacks/state
  taskDone?: boolean
  onToggleTaskDone?: (taskId: number, checked: boolean) => void
  hubDone?: boolean
  allHubTasksDone?: boolean
  onToggleHubDone?: (hubId: number, checked: boolean) => void
}

export default function NodeModal(props: Props) {
  const { open, type, hub, task, onClose, canEdit } = props
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const [hubTitle, setHubTitle] = useState(hub?.title ?? '')
  const [taskTitle, setTaskTitle] = useState(task?.title ?? '')
  const [taskKind, setTaskKind] = useState<'content'|'quiz'|'assignment'|'reflection'>(
    (task?.task_kind as 'content'|'quiz'|'assignment'|'reflection') ?? 'content'
  )

  useEffect(() => {
    if (!open) return
    closeBtnRef.current?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      const container = dialogRef.current
      if (!container) return
      const focusables = Array.from(container.querySelectorAll<HTMLElement>('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) { e.preventDefault(); last.focus() }
      } else {
        if (active === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Reset form state when entity changes
  useEffect(() => { setHubTitle(hub?.title ?? '') }, [hub?.id, hub?.title])
  useEffect(() => {
    setTaskTitle(task?.title ?? '')
    setTaskKind((task?.task_kind as 'content'|'quiz'|'assignment'|'reflection') ?? 'content')
  }, [task?.id, task?.title, task?.task_kind])

  const canShowHubCheckbox = useMemo(() => !canEdit && type === 'hub' && !!props.allHubTasksDone, [canEdit, type, props.allHubTasksDone])

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
            canEdit ? (
              <form
                className="space-y-3"
                onSubmit={async (e) => { e.preventDefault(); await props.onUpdateHub?.(hub.id, { title: hubTitle.trim() || hub.title }) }}
              >
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Title
                  <input value={hubTitle} onChange={(e) => setHubTitle(e.target.value)} className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/50" />
                </label>
                {/* Hub color editing removed: edit mode uses student-mode colors */}
                <div className="flex items-center justify-between">
                  <button type="submit" className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs">Save hub</button>
                  <button type="button" onClick={() => props.onDeleteHub?.(hub.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div><span className="font-medium">Title:</span> {hub.title}</div>
                {canShowHubCheckbox ? (
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={!!props.hubDone} onChange={(e) => props.onToggleHubDone?.(hub.id, e.target.checked)} />
                    Mark hub as done
                  </label>
                ) : (
                  <div className="text-xs text-slate-400">Complete all tasks to mark this hub as done.</div>
                )}
              </div>
            )
          )}
          {type === 'task' && task && (
            canEdit ? (
              <form
                className="space-y-3"
                onSubmit={async (e) => { e.preventDefault(); await props.onUpdateTask?.(task.id, { title: taskTitle.trim() || task.title, task_kind: taskKind }) }}
              >
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Title
                  <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/50" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Type
                  <select value={taskKind} onChange={(e) => setTaskKind(e.target.value as 'content'|'quiz'|'assignment'|'reflection')} className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/50">
                    <option value="content">Content</option>
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                    <option value="reflection">Reflection</option>
                  </select>
                </label>
                <div className="flex items-center justify-between">
                  <button type="submit" className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs">Save task</button>
                  <button type="button" onClick={() => props.onDeleteTask?.(task.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div><span className="font-medium">Title:</span> {task.title}</div>
                <div><span className="font-medium">Type:</span> {task.task_kind}</div>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={!!props.taskDone} onChange={(e) => props.onToggleTaskDone?.(task.id, e.target.checked)} />
                  Mark task as done
                </label>
              </div>
            )
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
          <button className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
