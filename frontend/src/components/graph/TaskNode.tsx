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
      className={`rounded-full shadow-md flex items-center justify-center ${data.canEdit ? 'cursor-pointer' : 'cursor-default'} ${isSelected ? 'ring-2 ring-indigo-600' : ''}`}
  style={{ width: 80, height: 80, background: data.color ?? '#4f86c6', color: 'white' }}
      title={`${data.title} (${data.task_kind})`}
    >
      <span className="px-2 text-sm">{data.title}</span>
      {/* Target handles at cardinal points for dynamic closest-point hub->task edges */}
      <Handle id="task-left" type="target" position={Position.Left} isConnectable={false} />
      <Handle id="task-right" type="target" position={Position.Right} isConnectable={false} />
      <Handle id="task-top" type="target" position={Position.Top} isConnectable={false} />
      <Handle id="task-bottom" type="target" position={Position.Bottom} isConnectable={false} />
    </div>
  )
})
