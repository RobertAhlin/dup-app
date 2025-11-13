import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'

type HubNodeData = {
  id: number
  title: string
  color?: string
  hubState?: 'locked' | 'unlocked' | 'completed'
  onSelect: (id: number) => void
  onOpen: (id: number) => void
  canEdit: boolean
  isSelected?: boolean
}

export default memo(function HubNode({ data }: NodeProps<HubNodeData>) {
  const isSelected = Boolean(data.isSelected)
  const isLocked = !data.canEdit && data.hubState === 'locked'
  // Derive display color: always use state mapping (edit mode follows student mode colors)
  const displayColor = (data.hubState === 'completed' ? '#a6f273' : data.hubState === 'unlocked' ? '#5cb0ff' : '#ababab')

  return (
      <div
        onClick={() => {
          if (data.canEdit) { data.onSelect(data.id); return }
          if (isLocked) return // block opening modal when locked
          data.onOpen(data.id)
        }}
        className={`relative rounded-full flex items-center justify-center ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} shadow-[8px_8px_8px_rgba(0,0,0,0.5),5px_0_5px_rgba(0,0,0,0.10)]`}
        style={{ width: 160, height: 160, background: displayColor, color: 'black', border: isSelected ? '3px solid rgba(239, 68, 68, 0.7)' : 'none' }}
      >
      <span className="px-3 text-base md:text-lg font-semibold text-center select-none leading-snug">
        {data.title}
      </span>
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
