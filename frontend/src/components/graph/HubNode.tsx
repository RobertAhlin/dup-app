import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'

type HubNodeData = {
  id: number
  title: string
  color?: string
  onSelect: (id: number) => void
  canEdit: boolean
  isSelected?: boolean
}

export default memo(function HubNode({ data }: NodeProps<HubNodeData>) {
  const isSelected = Boolean(data.isSelected)
  return (
    <div
      onClick={() => { if (data.canEdit) data.onSelect(data.id) }}
      className={`rounded-full shadow-xl flex items-center justify-center ${data.canEdit ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ width: 160, height: 160, background: data.color ?? '#9AE6B4', border: isSelected ? '3px solid #1e40af' : '3px solid rgba(0,0,0,0.1)' }}
    >
      <div className="text-center px-2 font-semibold">{data.title}</div>
      {/* Source handles at cardinal points for dynamic closest-point hub->task edges */}
      <Handle id="hub-right" type="source" position={Position.Right} isConnectable={data.canEdit} />
      <Handle id="hub-left" type="source" position={Position.Left} isConnectable={data.canEdit} />
      <Handle id="hub-top" type="source" position={Position.Top} isConnectable={data.canEdit} />
      <Handle id="hub-bottom" type="source" position={Position.Bottom} isConnectable={data.canEdit} />
      {/* Keep a target handle for hub<->hub connections (use left as conventional entry) */}
      <Handle id="hub-target-left" type="target" position={Position.Left} isConnectable={data.canEdit} />
    </div>
  )
})
