import { memo } from 'react'
import type { NodeProps } from 'reactflow'

type TaskNodeData = {
  id: number
  hub_id: number
  title: string
  task_kind: string
  canEdit: boolean
}

export default memo(function TaskNode({ data, selected }: NodeProps<TaskNodeData>) {
  return (
    <div
      className={`rounded-full shadow-md flex items-center justify-center ${selected ? 'ring-2 ring-indigo-600' : ''}`}
      style={{ width: 80, height: 80, background: '#4f86c6', color: 'white' }}
      title={`${data.title} (${data.task_kind})`}
    >
      <span className="px-2 text-sm">{data.title}</span>
    </div>
  )
})
