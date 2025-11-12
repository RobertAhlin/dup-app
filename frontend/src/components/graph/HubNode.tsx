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
        className={`rounded-full flex items-center justify-center ${data.canEdit ? 'cursor-pointer' : 'cursor-default'} shadow-[8px_8px_8px_rgba(0,0,0,0.5),5px_0_5px_rgba(0,0,0,0.10)]`}
        style={{ width: 160, height: 160, background: data.color ?? '#9AE6B4', border: isSelected ? '3px solid rgba(239, 68, 68, 0.7)' : 'none' }}
      >
      <div className="text-center px-2 font-semibold">{data.title}</div>
  {/* Source handles at cardinal points (hidden) */}
  <Handle id="hub-right" type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="hub-left" type="source" position={Position.Left} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="hub-top" type="source" position={Position.Top} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="hub-bottom" type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  {/* Target handles at cardinal points (hidden) */}
  <Handle id="hub-target-right" type="target" position={Position.Right} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="hub-target-left" type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="hub-target-top" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
  <Handle id="hub-target-bottom" type="target" position={Position.Bottom} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
    </div>
  )
})
