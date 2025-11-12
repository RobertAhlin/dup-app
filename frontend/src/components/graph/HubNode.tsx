import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'

type HubNodeData = {
  id: number
  title: string
  color?: string
  onSelect: (id: number) => void
  onOpen: (id: number) => void
  canEdit: boolean
  isSelected?: boolean
}

export default memo(function HubNode({ data }: NodeProps<HubNodeData>) {
  const isSelected = Boolean(data.isSelected)
  return (
      <div
        onClick={() => { if (!data.canEdit) data.onOpen(data.id); else data.onSelect(data.id) }}
        className={`relative rounded-full flex items-center justify-center ${data.canEdit ? 'cursor-pointer' : 'cursor-pointer'} shadow-[8px_8px_8px_rgba(0,0,0,0.5),5px_0_5px_rgba(0,0,0,0.10)]`}
        style={{ width: 160, height: 160, background: data.color ?? '#9AE6B4', border: isSelected ? '3px solid rgba(239, 68, 68, 0.7)' : 'none' }}
      >
      <div className="text-center px-2 font-semibold select-none">{data.title}</div>
      {data.canEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onOpen(data.id) }}
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 bg-white text-slate-700 border rounded-full w-7 h-7 flex items-center justify-center text-[18px] shadow hover:bg-slate-50 focus:outline-none opacity-80"
          aria-label="Edit hub"
        >
          ✎
        </button>
      )}
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
