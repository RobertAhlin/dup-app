import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'

type HubNodeData = {
  id: number
  title: string
  color?: string
  selectedHubId: number|null
  setSelectedHubId: (id:number)=>void
  canEdit: boolean
}

export default memo(function HubNode({ data }: NodeProps<HubNodeData>) {
  const isSelected = data.selectedHubId === data.id
  return (
    <div
      onClick={() => data.setSelectedHubId(data.id)}
      className={`rounded-full shadow-xl flex items-center justify-center cursor-pointer`}
      style={{ width: 160, height: 160, background: data.color ?? '#9AE6B4', border: isSelected ? '3px solid #1e40af' : '3px solid rgba(0,0,0,0.1)' }}
    >
      <div className="text-center px-2 font-semibold">{data.title}</div>
      {/* Connection handles for hub<->hub */}
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
})
