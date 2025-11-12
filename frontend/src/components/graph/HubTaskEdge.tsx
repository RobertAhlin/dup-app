import { memo, useMemo } from 'react'
import { BaseEdge, useStore } from 'reactflow'
import type { EdgeProps } from 'reactflow'

// Compute the two closest points along the line between centers, assuming circular nodes
function computeCircleBorderPoints(
  source: { cx: number; cy: number; r: number },
  target: { cx: number; cy: number; r: number }
) {
  const dx = target.cx - source.cx
  const dy = target.cy - source.cy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const sx = source.cx + ux * source.r
  const sy = source.cy + uy * source.r
  const tx = target.cx - ux * target.r
  const ty = target.cy - uy * target.r
  return { sx, sy, tx, ty }
}

export default memo(function HubTaskEdge(props: EdgeProps) {
  const { id, source, target, style, markerEnd, markerStart } = props

  const sourceNode = useStore((s) => s.nodeInternals.get(source))
  const targetNode = useStore((s) => s.nodeInternals.get(target))

  const path = useMemo(() => {
    if (!sourceNode || !targetNode || !sourceNode.width || !sourceNode.height || !targetNode.width || !targetNode.height) {
      return ''
    }
    const src = {
      cx: (sourceNode.positionAbsolute?.x ?? 0) + (sourceNode.width ?? 0) / 2,
      cy: (sourceNode.positionAbsolute?.y ?? 0) + (sourceNode.height ?? 0) / 2,
      r: Math.min(sourceNode.width ?? 0, sourceNode.height ?? 0) / 2,
    }
    const tgt = {
      cx: (targetNode.positionAbsolute?.x ?? 0) + (targetNode.width ?? 0) / 2,
      cy: (targetNode.positionAbsolute?.y ?? 0) + (targetNode.height ?? 0) / 2,
      r: Math.min(targetNode.width ?? 0, targetNode.height ?? 0) / 2,
    }
    const { sx, sy, tx, ty } = computeCircleBorderPoints(src, tgt)
    return `M ${sx},${sy} L ${tx},${ty}`
  }, [sourceNode, targetNode])

  if (!path) return null

  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} markerStart={markerStart} />
})
