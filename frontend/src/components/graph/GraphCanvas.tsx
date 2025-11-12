import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background, Controls, ConnectionMode, MiniMap,
  useNodesState, useEdgesState, MarkerType
} from 'reactflow'
import type { Edge, Node, OnConnect, OnEdgesDelete, NodeDragHandler } from 'reactflow'
import HubNode from './HubNode.tsx'
import TaskNode from './TaskNode.tsx'
import axios from '../../api/axios'

export type HubData = { id: number; course_id: number; title: string; x: number; y: number; color?: string; radius?: number }
export type TaskData = { id: number; hub_id: number; title: string; task_kind: 'content'|'quiz'|'assignment'|'reflection'; x: number|null; y: number|null }
export type HubEdgeData = { id: number; course_id: number; from_hub_id: number; to_hub_id: number }

type Props = {
  courseId: number
  initialHubs: HubData[]
  initialTasks: TaskData[]
  initialEdges: HubEdgeData[]
  canEdit: boolean
  onAddHub: () => Promise<void> | void
  onAddTask: (selectedHubId: number|null) => Promise<void> | void
  onAddEdge: (fromHubId: number, toHubId: number) => Promise<void> | void
}

const nodeTypes = { hubNode: HubNode, taskNode: TaskNode }

export default function GraphCanvas(props: Props) {
  const { initialHubs, initialTasks, initialEdges, canEdit, onAddHub, onAddTask, onAddEdge } = props
  const [connectMode, setConnectMode] = useState(false)
  const [selectedHubId, setSelectedHubId] = useState<number|null>(null)

  // Build RF nodes
  const rfNodes: Node[] = useMemo(() => {
    const hubs = initialHubs.map<Node>(h => ({
      id: `hub-${h.id}`,
      type: 'hubNode',
      position: { x: h.x, y: h.y },
      data: { ...h, selectedHubId, setSelectedHubId, canEdit }
    }))
    const tasks = initialTasks.map<Node>(t => {
      // default relative task position near hub if null
      return {
        id: `task-${t.id}`,
        type: 'taskNode',
        position: { x: t.x ?? 0, y: t.y ?? 0 }, // TaskNode positions are absolute in canvas for RF
        data: { ...t, canEdit }
      }
    })
    return [...hubs, ...tasks]
  }, [initialHubs, initialTasks, selectedHubId, canEdit])

  // Build edges: 1) hub→hub from DB  2) hub→task (readonly)
  const rfEdges: Edge[] = useMemo(() => {
    const hubHub: Edge[] = initialEdges.map(e => ({
      id: `edge-h2h-${e.id}`,
      source: `hub-${e.from_hub_id}`,
      target: `hub-${e.to_hub_id}`,
      selectable: canEdit,
      style: { strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed }
    }))

    const hubTask: Edge[] = initialTasks.map(t => ({
      id: `edge-h2t-${t.id}`,
      source: `hub-${t.hub_id}`,
      target: `task-${t.id}`,
      animated: false,
      selectable: false,
      style: { strokeDasharray: '6 4', opacity: 0.6 }
    }))

    return [...hubHub, ...hubTask]
  }, [initialEdges, initialTasks, canEdit])

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges)

  useEffect(() => {
    setNodes(rfNodes)
  }, [rfNodes, setNodes])

  useEffect(() => {
    setEdges(rfEdges)
  }, [rfEdges, setEdges])

  // Connect hubs in connect mode
  const onConnect: OnConnect = useCallback(async (connection) => {
    if (!connectMode) return
    const fromId = Number((connection.source ?? '').replace('hub-', ''))
    const toId   = Number((connection.target ?? '').replace('hub-', ''))
    if (!fromId || !toId || fromId === toId) return
    await onAddEdge(fromId, toId)
  }, [connectMode, onAddEdge])

  // Prevent deleting hub→task edges
  const onEdgesDelete: OnEdgesDelete = useCallback((eds) => {
    const hasHT = eds.some(e => e.id.startsWith('edge-h2t-'))
    if (hasHT) {
      setEdges(prev => [...prev]) // no-op to revert
    }
  }, [setEdges])

  // Drag end → persist positions
  const onNodeDragStop = useCallback<NodeDragHandler>(async (_event, node: Node) => {
    if (!canEdit) return
    const { id, position } = node
    if (id.startsWith('hub-')) {
      const hubId = Number(id.replace('hub-', ''))
      await axios.patch(`/api/hubs/${hubId}`, { x: position.x, y: position.y })
    } else if (id.startsWith('task-')) {
      const taskId = Number(id.replace('task-', ''))
      await axios.patch(`/api/tasks/${taskId}`, { x: position.x, y: position.y })
    }
  }, [canEdit])

  return (
    <div className="h-full border rounded-lg overflow-hidden relative">
      {canEdit && (
        <div className="absolute z-10 left-3 top-3 bg-white/90 rounded-xl shadow px-3 py-2 flex items-center gap-2">
          <button className="border rounded px-2 py-1" onClick={() => onAddHub()}>+ Hub</button>
          <button className="border rounded px-2 py-1" onClick={() => onAddTask(selectedHubId)}>+ Task</button>
          <button
            className={`border rounded px-2 py-1 ${connectMode ? 'bg-amber-200' : ''}`}
            onClick={() => setConnectMode(v => !v)}
            title="Connect hubs"
          >
            ↔ Connect
          </button>
          <span className="text-xs text-gray-500 ml-2">{selectedHubId ? `Selected hub: ${selectedHubId}` : 'Click a hub to select'}</span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        connectionMode={ConnectionMode.Loose}
        fitView
        elementsSelectable
        nodesDraggable
  nodesConnectable={canEdit && connectMode}
  deleteKeyCode={canEdit ? 'Delete' : undefined}
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  )
}
