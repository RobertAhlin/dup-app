import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'

type TaskNodeData = {
  id: number
  hub_id: number
  title: string
  task_kind: string
  color?: string
  canEdit: boolean
  onSelect: (taskId: number, hubId: number) => void
  isSelected?: boolean
}

export default memo(function TaskNode({ data }: NodeProps<TaskNodeData>) {
  const isSelected = Boolean(data.isSelected)
  return (
    <div
      onClick={() => { if (data.canEdit) data.onSelect(data.id, data.hub_id) }}
      className={`rounded-full flex items-center justify-center ${data.canEdit ? 'cursor-pointer' : 'cursor-default'} shadow-[8px_8px_8px_rgba(0,0,0,0.5),5px_0_5px_rgba(0,0,0,0.10)]`}
  style={{ width: 80, height: 80, background: data.color ?? '#4f86c6', color: 'white', border: isSelected ? '3px solid rgba(239, 68, 68, 0.7)' : 'none' }}
      title={`${data.title} (${data.task_kind})`}
    >
      <span className="px-2 text-sm">{data.title}</span>
  {/* Target handles (hidden) to keep compatibility while not showing dots */}
  <Handle id="task-left" type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="task-right" type="target" position={Position.Right} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="task-top" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="task-bottom" type="target" position={Position.Bottom} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
    </div>
  )
})
