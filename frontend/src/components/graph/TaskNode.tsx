import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'

type TaskNodeData = {
  id: number
  hub_id: number
  title: string
  task_kind: string
  color?: string
  parentHubState?: 'locked' | 'unlocked' | 'completed'
  isDone?: boolean
  canEdit: boolean
  onSelect: (taskId: number, hubId: number) => void
  onOpen: (taskId: number) => void
  isSelected?: boolean
}

export default memo(function TaskNode({ data }: NodeProps<TaskNodeData>) {
  const isSelected = Boolean(data.isSelected)
  const isLocked = !data.canEdit && data.parentHubState === 'locked'
  // Always use student-mode color rules even in edit mode
  const displayColor = isLocked ? '#ababab' : (data.isDone ? '#a6f273' : '#5cb0ff')

  return (
    <div
      onClick={() => {
        if (data.canEdit) { data.onSelect(data.id, data.hub_id); return }
        if (isLocked) return
        data.onOpen(data.id)
      }}
      className={`relative rounded-full flex items-center justify-center ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} shadow-[8px_8px_8px_rgba(0,0,0,0.5),5px_0_5px_rgba(0,0,0,0.10)]`}
      style={{ width: 80, height: 80, background: displayColor, color: 'black', border: isSelected ? '3px solid rgba(239, 68, 68, 0.7)' : 'none' }}
      title={`${data.title} (${data.task_kind})`}
    >
      <span className="px-2 text-sm select-none">{data.title}</span>
      {data.canEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onOpen(data.id) }}
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 bg-white text-slate-700 border rounded-full w-6 h-5 flex items-center justify-center text-[16px] shadow hover:bg-slate-50 focus:outline-none opacity-80"
          aria-label="Edit task"
        >
          ✎
        </button>
      )}
  {/* Target handles (hidden) to keep compatibility while not showing dots */}
  <Handle id="task-left" type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="task-right" type="target" position={Position.Right} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="task-top" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="task-bottom" type="target" position={Position.Bottom} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
    </div>
  )
})
