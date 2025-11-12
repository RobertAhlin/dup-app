import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background, Controls, ConnectionMode, MiniMap,
  useNodesState, useEdgesState, MarkerType
} from 'reactflow'
import type { Edge, Node, OnConnect, OnEdgesDelete, NodeDragHandler } from 'reactflow'
import { nodeTypes, edgeTypes } from './graphTypes'
import axios from '../../api/axios'

// nodeTypes and edgeTypes are defined outside this module in graphTypes to ensure stable identity

export type HubData = { id: number; course_id: number; title: string; x: number; y: number; color?: string; radius?: number }
export type TaskData = { id: number; hub_id: number; title: string; task_kind: 'content'|'quiz'|'assignment'|'reflection'; x: number|null; y: number|null; color?: string }
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
  onUpdateHub: (hubId: number, updates: { title?: string; color?: string }) => Promise<void> | void
  onDeleteHub: (hubId: number) => Promise<void> | void
  onUpdateTask: (taskId: number, updates: { title?: string; task_kind?: TaskData['task_kind'] }) => Promise<void> | void
  onDeleteTask: (taskId: number) => Promise<void> | void
  onMoveHub: (hubId: number, coords: { x: number; y: number }) => void
  onMoveTask: (taskId: number, coords: { x: number; y: number }) => void
}

export default function GraphCanvas(props: Props) {
  const {
    initialHubs,
    initialTasks,
    initialEdges,
    canEdit,
    onAddHub,
    onAddTask,
    onAddEdge,
    onUpdateHub,
    onDeleteHub,
    onUpdateTask,
    onDeleteTask,
    onMoveHub,
    onMoveTask,
  } = props
  const [connectMode, setConnectMode] = useState(false)
  const [selectedHubId, setSelectedHubId] = useState<number|null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number|null>(null)
  const [hubTitle, setHubTitle] = useState('')
  const [hubColor, setHubColor] = useState('#9AE6B4')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskKind, setTaskKind] = useState<TaskData['task_kind']>('content')

  useEffect(() => {
    if (!canEdit) {
      setConnectMode(false)
      setSelectedHubId(null)
      setSelectedTaskId(null)
    }
  }, [canEdit])

  const handleSelectHub = useCallback((id: number) => {
    if (!canEdit) return
    setSelectedHubId(id)
    setSelectedTaskId(null)
  }, [canEdit])

  const handleSelectTask = useCallback((taskId: number, hubId: number) => {
    if (!canEdit) return
    setSelectedTaskId(taskId)
    setSelectedHubId(hubId)
  }, [canEdit])

  const selectedHub = useMemo(() => initialHubs.find(h => h.id === selectedHubId) ?? null, [initialHubs, selectedHubId])
  const selectedTask = useMemo(() => initialTasks.find(t => t.id === selectedTaskId) ?? null, [initialTasks, selectedTaskId])

  useEffect(() => {
    if (!selectedHub) {
      setHubTitle('')
      setHubColor('#9AE6B4')
      return
    }
    setHubTitle(selectedHub.title)
    setHubColor(selectedHub.color ?? '#9AE6B4')
  }, [selectedHub])

  useEffect(() => {
    if (!selectedTask) {
      setTaskTitle('')
      setTaskKind('content')
      return
    }
    setTaskTitle(selectedTask.title)
    setTaskKind(selectedTask.task_kind)
  }, [selectedTask])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  // Use stable maps from graphTypes (no need to memoize again)

  useEffect(() => {
    const hubNodes: Node[] = initialHubs.map(h => ({
      id: `hub-${h.id}`,
      type: 'hubNode',
      position: { x: h.x, y: h.y },
      data: {
        ...h,
        onSelect: handleSelectHub,
        canEdit,
        isSelected: canEdit && selectedHubId === h.id,
      },
      draggable: canEdit,
    }))

    const taskNodes: Node[] = initialTasks.map(t => ({
      id: `task-${t.id}`,
      type: 'taskNode',
      position: { x: t.x ?? 0, y: t.y ?? 0 },
      data: {
        ...t,
        onSelect: handleSelectTask,
        canEdit,
        isSelected: canEdit && selectedTaskId === t.id,
      },
      draggable: canEdit,
    }))

    setNodes([...hubNodes, ...taskNodes])
  }, [initialHubs, initialTasks, canEdit, handleSelectHub, handleSelectTask, selectedHubId, selectedTaskId, setNodes])

  useEffect(() => {
    const hubHub: Edge[] = initialEdges.map(e => ({
      id: `edge-h2h-${e.id}`,
      source: `hub-${e.from_hub_id}`,
      target: `hub-${e.to_hub_id}`,
      selectable: canEdit,
      style: { strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed },
    }))

    const hubTask: Edge[] = initialTasks.map(t => ({
      id: `edge-h2t-${t.id}`,
      source: `hub-${t.hub_id}`,
      target: `task-${t.id}`,
      type: 'floatingHubTask',
      animated: false,
      selectable: false,
      style: { strokeWidth: 3, stroke: t.color ?? '#4f86c6' },
    }))

    setEdges([...hubHub, ...hubTask])
  }, [initialEdges, initialTasks, initialHubs, canEdit, setEdges])

  // Connect hubs in connect mode
  const onConnect: OnConnect = useCallback(async (connection) => {
    if (!canEdit || !connectMode) return
    const fromId = Number((connection.source ?? '').replace('hub-', ''))
    const toId   = Number((connection.target ?? '').replace('hub-', ''))
    if (!fromId || !toId || fromId === toId) return
    await onAddEdge(fromId, toId)
  }, [canEdit, connectMode, onAddEdge])

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
    const x = Math.round(position.x)
    const y = Math.round(position.y)
    setNodes(prev => prev.map(n => (n.id === id ? { ...n, position: { x, y } } : n)))
    if (id.startsWith('hub-')) {
      const hubId = Number(id.replace('hub-', ''))
      const previous = initialHubs.find(h => h.id === hubId)
      onMoveHub(hubId, { x, y })
      try {
        await axios.patch(`/api/hubs/${hubId}`, { x, y })
      } catch (err) {
        console.error('Failed to persist hub position', err)
        if (previous) {
          const fallbackX = Math.round(previous.x)
          const fallbackY = Math.round(previous.y)
          onMoveHub(hubId, { x: fallbackX, y: fallbackY })
          setNodes(prev => prev.map(n => (n.id === id ? { ...n, position: { x: fallbackX, y: fallbackY } } : n)))
        }
      }
    } else if (id.startsWith('task-')) {
      const taskId = Number(id.replace('task-', ''))
      const previous = initialTasks.find(t => t.id === taskId)
      onMoveTask(taskId, { x, y })
      try {
        await axios.patch(`/api/tasks/${taskId}`, { x, y })
      } catch (err) {
        console.error('Failed to persist task position', err)
        if (previous) {
          const fallbackX = Math.round(previous.x ?? 0)
          const fallbackY = Math.round(previous.y ?? 0)
          onMoveTask(taskId, { x: fallbackX, y: fallbackY })
          setNodes(prev => prev.map(n => (n.id === id ? { ...n, position: { x: fallbackX, y: fallbackY } } : n)))
        }
      }
    }
  }, [canEdit, onMoveHub, onMoveTask, initialHubs, initialTasks, setNodes])

  const handleHubSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedHub) return
    try {
      await onUpdateHub(selectedHub.id, { title: hubTitle.trim() || selectedHub.title, color: hubColor })
    } catch (err) {
      console.error('Failed to update hub', err)
    }
  }, [hubColor, hubTitle, onUpdateHub, selectedHub])

  const handleHubDelete = useCallback(async () => {
    if (!selectedHub) return
    const confirmed = window.confirm('Delete this hub? Tasks and connections will also be removed.')
    if (!confirmed) return
    try {
      await onDeleteHub(selectedHub.id)
      setSelectedHubId(null)
      setSelectedTaskId(null)
    } catch (err) {
      console.error('Failed to delete hub', err)
    }
  }, [onDeleteHub, selectedHub])

  const handleTaskSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTask) return
    try {
      await onUpdateTask(selectedTask.id, { title: taskTitle.trim() || selectedTask.title, task_kind: taskKind })
    } catch (err) {
      console.error('Failed to update task', err)
    }
  }, [onUpdateTask, selectedTask, taskKind, taskTitle])

  const handleTaskDelete = useCallback(async () => {
    if (!selectedTask) return
    const confirmed = window.confirm('Delete this task?')
    if (!confirmed) return
    try {
      await onDeleteTask(selectedTask.id)
      setSelectedTaskId(null)
    } catch (err) {
      console.error('Failed to delete task', err)
    }
  }, [onDeleteTask, selectedTask])

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

      {canEdit && (selectedHub || selectedTask) && (
        <div className="absolute z-10 right-3 top-3 w-64 max-w-[calc(100%-3rem)] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow px-4 py-3 space-y-4">
          {selectedHub && (
            <form onSubmit={handleHubSubmit} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Hub settings</h3>
                <button type="button" onClick={handleHubDelete} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Title
                <input
                  value={hubTitle}
                  onChange={(e) => setHubTitle(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/50"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Color
                <input
                  type="color"
                  value={hubColor}
                  onChange={(e) => setHubColor(e.target.value)}
                  className="h-8 w-full rounded border border-slate-300"
                />
              </label>
              <button
                type="submit"
                className="w-full bg-slate-900 text-white text-xs font-semibold uppercase tracking-wide rounded-full py-2"
              >
                Save hub
              </button>
            </form>
          )}
          {selectedTask && (
            <form onSubmit={handleTaskSubmit} className="space-y-2 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Task settings</h3>
                <button type="button" onClick={handleTaskDelete} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Title
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/50"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Type
                <select
                  value={taskKind}
                  onChange={(e) => setTaskKind(e.target.value as TaskData['task_kind'])}
                  className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/50"
                >
                  <option value="content">Content</option>
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="reflection">Reflection</option>
                </select>
              </label>
              <button
                type="submit"
                className="w-full bg-slate-900 text-white text-xs font-semibold uppercase tracking-wide rounded-full py-2"
              >
                Save task
              </button>
            </form>
          )}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        connectionMode={ConnectionMode.Loose}
        fitView
    elementsSelectable={canEdit}
    nodesDraggable={canEdit}
    panOnDrag={!canEdit}
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
