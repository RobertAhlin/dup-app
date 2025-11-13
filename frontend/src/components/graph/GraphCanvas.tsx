import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Controls, ControlButton, ConnectionMode, MiniMap,
  useNodesState, useEdgesState
} from 'reactflow'
import type { Edge, Node, OnConnect, OnEdgesDelete, NodeDragHandler, ReactFlowInstance } from 'reactflow'
import { nodeTypes, edgeTypes } from './graphTypes'
import NodeModal from '../NodeModal'
import axios from '../../api/axios'
import { useAlert } from '../../contexts/useAlert'

// nodeTypes and edgeTypes are defined outside this module in graphTypes to ensure stable identity

export type HubData = { id: number; course_id: number; title: string; x: number; y: number; color?: string; radius?: number; is_start?: boolean }
export type TaskData = { id: number; hub_id: number; title: string; task_kind: 'content'|'quiz'|'assignment'|'reflection'; x: number|null; y: number|null; color?: string }
export type HubEdgeData = { id: number; course_id: number; from_hub_id: number; to_hub_id: number; color?: string|null }

type Props = {
  courseId: number
  initialHubs: HubData[]
  initialTasks: TaskData[]
  initialEdges: HubEdgeData[]
  canEdit: boolean
  // Progress
  initialTaskDoneIds?: number[]
  initialHubDoneIds?: number[]
  onSetTaskDone?: (taskId: number, done: boolean) => Promise<void> | void
  onSetHubDone?: (hubId: number, done: boolean) => Promise<void> | void
  onAddHub: (coords?: { x: number; y: number }) => Promise<void> | void
  onAddTask: (selectedHubId: number|null, coords?: { x: number; y: number }) => Promise<void> | void
  onAddEdge: (fromHubId: number, toHubId: number) => Promise<void> | void
  onUpdateHub: (hubId: number, updates: { title?: string; color?: string; is_start?: boolean }) => Promise<void> | void
  onDeleteHub: (hubId: number) => Promise<void> | void
  onUpdateTask: (taskId: number, updates: { title?: string; task_kind?: TaskData['task_kind'] }) => Promise<void> | void
  onDeleteTask: (taskId: number) => Promise<void> | void
  onMoveHub: (hubId: number, coords: { x: number; y: number }) => void
  onMoveTask: (taskId: number, coords: { x: number; y: number }) => void
  onDeleteEdge: (edgeId: number) => Promise<void> | void
  onUpdateEdgeColor: (edgeId: number, color: string) => Promise<void> | void
}

export default function GraphCanvas(props: Props) {
  const {
    initialHubs,
    initialTasks,
    initialEdges,
    canEdit,
    initialTaskDoneIds,
    initialHubDoneIds,
    onSetTaskDone,
    onSetHubDone,
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
  const [connectSourceHubId, setConnectSourceHubId] = useState<number|null>(null)
  const [selectedHubId, setSelectedHubId] = useState<number|null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number|null>(null)
  const [hubTitle, setHubTitle] = useState('')
  const [hubIsStart, setHubIsStart] = useState(false)
  const startHubId = useMemo(() => initialHubs.find(h => h.is_start)?.id ?? null, [initialHubs])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskKind, setTaskKind] = useState<TaskData['task_kind']>('content')
  const [selectedEdgeId, setSelectedEdgeId] = useState<number|null>(null)
  const [edgeColor, setEdgeColor] = useState<string>('#64748b')
  const [showMinimap, setShowMinimap] = useState(false)
  const { showAlert } = useAlert()
  const rfInstance = useRef<ReactFlowInstance | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Modal state
  const [modal, setModal] = useState<
    | { type: 'hub'; hub: HubData }
    | { type: 'task'; task: TaskData }
    | null
  >(null)

  // Student progress state (in-memory for now)
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<number>>(new Set())
  const [completedHubIds, setCompletedHubIds] = useState<Set<number>>(new Set())

  // Initialize from props
  useEffect(() => {
    if (initialTaskDoneIds) setCompletedTaskIds(new Set(initialTaskDoneIds))
  }, [initialTaskDoneIds])
  useEffect(() => {
    if (initialHubDoneIds) setCompletedHubIds(new Set(initialHubDoneIds))
  }, [initialHubDoneIds])

  const toggleTaskDone = useCallback(async (taskId: number, checked: boolean) => {
    setCompletedTaskIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(taskId); else next.delete(taskId)
      return next
    })
    try {
      await onSetTaskDone?.(taskId, checked)
    } catch (err) {
      console.error('Failed to update task progress', err)
      showAlert('error', 'Failed to update task progress')
      // revert
      setCompletedTaskIds(prev => {
        const next = new Set(prev)
        if (checked) next.delete(taskId); else next.add(taskId)
        return next
      })
    }
  }, [onSetTaskDone, showAlert])

  const toggleHubDone = useCallback(async (hubId: number, checked: boolean) => {
    setCompletedHubIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(hubId); else next.delete(hubId)
      return next
    })
    try {
      await onSetHubDone?.(hubId, checked)
    } catch (err) {
      console.error('Failed to update hub progress', err)
      showAlert('error', 'Failed to update hub progress')
      // revert
      setCompletedHubIds(prev => {
        const next = new Set(prev)
        if (checked) next.delete(hubId); else next.add(hubId)
        return next
      })
    }
  }, [onSetHubDone, showAlert])

  const getViewportCenter = useCallback((): { x: number; y: number } => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    const clientX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const clientY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const projected = rfInstance.current?.screenToFlowPosition({ x: clientX, y: clientY })
    if (projected) {
      return { x: Math.round(projected.x), y: Math.round(projected.y) }
    }
    // Fallback if instance not ready yet
    return { x: 0, y: 0 }
  }, [])

  useEffect(() => {
    if (!canEdit) {
      setConnectMode(false)
      setConnectSourceHubId(null)
      setSelectedHubId(null)
      setSelectedTaskId(null)
    }
  }, [canEdit])

  const openHubModal = useCallback((id: number) => {
    const hub = initialHubs.find(h => h.id === id)
    if (hub) setModal({ type: 'hub', hub })
  }, [initialHubs])

  const openTaskModal = useCallback((taskId: number) => {
    const task = initialTasks.find(t => t.id === taskId)
    if (task) setModal({ type: 'task', task })
  }, [initialTasks])

  const handleSelectHub = useCallback((id: number) => {
    if (!canEdit) return
    if (connectMode) {
      // Click-to-connect flow: first click selects source, second click creates edge
      setSelectedTaskId(null)
      if (connectSourceHubId == null) {
        setConnectSourceHubId(id)
        setSelectedHubId(id)
      } else if (connectSourceHubId !== id) {
        // Prevent duplicate connections and inform user
        const alreadyExists = initialEdges.some(e => e.from_hub_id === connectSourceHubId && e.to_hub_id === id)
        if (alreadyExists) {
          showAlert('error', 'These hubs are already connected.')
          // Keep connect mode active so the user can pick another target
          return
        }
        onAddEdge(connectSourceHubId, id)
        setConnectSourceHubId(null)
        setSelectedHubId(null)
      }
      return
    }
    // Normal selection (opens settings)
    setSelectedHubId(id)
    setSelectedTaskId(null)
    setSelectedEdgeId(null)
  }, [canEdit, connectMode, connectSourceHubId, initialEdges, onAddEdge, showAlert])

  const handleSelectTask = useCallback((taskId: number) => {
    if (!canEdit) return
    setSelectedTaskId(taskId)
    setSelectedHubId(null)
    setSelectedEdgeId(null)
  }, [canEdit])

  const selectedHub = useMemo(() => initialHubs.find(h => h.id === selectedHubId) ?? null, [initialHubs, selectedHubId])
  const selectedTask = useMemo(() => initialTasks.find(t => t.id === selectedTaskId) ?? null, [initialTasks, selectedTaskId])
  const selectedEdge = useMemo(() => initialEdges.find(e => e.id === selectedEdgeId) ?? null, [initialEdges, selectedEdgeId])

  useEffect(() => {
    if (!selectedHub) {
      setHubTitle('')
      setHubIsStart(false)
      return
    }
    setHubTitle(selectedHub.title)
    setHubIsStart(!!selectedHub.is_start)
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

  useEffect(() => {
    if (!selectedEdge) {
      setEdgeColor('#64748b')
      return
    }
    setEdgeColor(selectedEdge.color ?? '#64748b')
  }, [selectedEdge])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  // Lock node/edge types for the lifetime of this component instance to avoid React Flow #002 warnings
  const nodeTypesRef = useRef(nodeTypes)
  const edgeTypesRef = useRef(edgeTypes)

  useEffect(() => {
    // Compute hub state (locked/unlocked/completed)
    const completedSet = new Set(completedHubIds)
    const prereqMap = new Map<number, number[]>()
    initialEdges.forEach(e => {
      const arr = prereqMap.get(e.to_hub_id) ?? []
      arr.push(e.from_hub_id)
      prereqMap.set(e.to_hub_id, arr)
    })
    const hubState: Record<number, 'locked' | 'unlocked' | 'completed'> = {}
    initialHubs.forEach(h => {
      if (completedSet.has(h.id)) {
        hubState[h.id] = 'completed'
        return
      }
      // Start hub is always active (never locked) unless completed
      if (h.is_start) {
        hubState[h.id] = 'unlocked'
        return
      }
      const prereqs = prereqMap.get(h.id) || []
      if (prereqs.length === 0) {
        hubState[h.id] = 'locked'
        return
      }
      const allDone = prereqs.every(pid => completedSet.has(pid))
      hubState[h.id] = allDone ? 'unlocked' : 'locked'
    })

    // Coloring now handled inside HubNode / TaskNode components

    const hubNodes: Node[] = initialHubs.map(h => ({
      id: `hub-${h.id}`,
      type: 'hubNode',
      position: { x: h.x, y: h.y },
      data: {
        ...h,
        onSelect: handleSelectHub,
        onOpen: openHubModal,
        canEdit,
        isSelected: canEdit && ((selectedHubId === h.id) || (connectMode && connectSourceHubId === h.id)),
        hubState: hubState[h.id],
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
        onOpen: openTaskModal,
        canEdit,
        isSelected: canEdit && selectedTaskId === t.id,
        parentHubState: hubState[t.hub_id],
        isDone: completedTaskIds.has(t.id),
      },
      draggable: canEdit,
    }))

    setNodes([...hubNodes, ...taskNodes])
  }, [initialHubs, initialTasks, initialEdges, completedHubIds, completedTaskIds, canEdit, handleSelectHub, handleSelectTask, openHubModal, openTaskModal, selectedHubId, selectedTaskId, connectMode, connectSourceHubId, setNodes])

  useEffect(() => {
    // Dedupe hub->hub edges by id to avoid duplicate React keys if upstream pushed duplicates
    const uniqueInitialEdges = Array.from(new Map(initialEdges.map(e => [e.id, e])).values())
    // Recompute hub state (must mirror logic used for nodes) so we can color edges dynamically
    const completedSet = new Set(completedHubIds)
    const prereqMap = new Map<number, number[]>()
    initialEdges.forEach(e => {
      const arr = prereqMap.get(e.to_hub_id) ?? []
      arr.push(e.from_hub_id)
      prereqMap.set(e.to_hub_id, arr)
    })
    const hubState: Record<number, 'locked' | 'unlocked' | 'completed'> = {}
    initialHubs.forEach(h => {
      if (completedSet.has(h.id)) { hubState[h.id] = 'completed'; return }
      if (h.is_start) { hubState[h.id] = 'unlocked'; return }
      const prereqs = prereqMap.get(h.id) || []
      if (prereqs.length === 0) { hubState[h.id] = 'locked'; return }
      const allDone = prereqs.every(pid => completedSet.has(pid))
      hubState[h.id] = allDone ? 'unlocked' : 'locked'
    })

    // Helper to decide edge color based on source hub state and destination state/completion
    const GREEN = '#a6f273'
    const BLUE = '#5cb0ff'
    const GREY = '#ababab'

    let hubHub: Edge[] = []
    const edgeShadow = 'drop-shadow(4px 4px 4px rgba(0,0,0,0.5)) drop-shadow(2px 0 2px rgba(0,0,0,0.10))'
    if (canEdit) {
      hubHub = uniqueInitialEdges.map(e => ({
        id: `edge-h2h-${e.id}`,
        source: `hub-${e.from_hub_id}`,
        target: `hub-${e.to_hub_id}`,
        type: 'floatingHubHub',
        selectable: canEdit,
        style: { strokeWidth: 6, stroke: BLUE, filter: edgeShadow },
      }))
    } else {
      hubHub = uniqueInitialEdges.map(e => {
      const fromState = hubState[e.from_hub_id]
      const toState = hubState[e.to_hub_id]
      let stroke: string
      if (fromState === 'completed') stroke = GREEN
      else if (fromState === 'locked') stroke = GREY
      else { // from unlocked (blue)
        if (toState === 'completed') stroke = GREEN
        else if (toState === 'unlocked') stroke = BLUE
        else stroke = GREY
      }
        return {
          id: `edge-h2h-${e.id}`,
          source: `hub-${e.from_hub_id}`,
          target: `hub-${e.to_hub_id}`,
          type: 'floatingHubHub',
          selectable: canEdit,
          style: { strokeWidth: 6, stroke, filter: edgeShadow },
        }
      })
    }

    const taskDoneSet = completedTaskIds // Set<number>
    const hubTask: Edge[] = initialTasks.map(t => {
      const fromState = hubState[t.hub_id]
      const taskDone = taskDoneSet.has(t.id)
      let stroke: string
      if (canEdit) {
        stroke = BLUE
      } else if (fromState === 'completed') stroke = GREEN
      else if (fromState === 'locked') stroke = GREY
      else { // from unlocked
        stroke = taskDone ? GREEN : BLUE
      }
      return {
        id: `edge-h2t-${t.id}`,
        source: `hub-${t.hub_id}`,
        target: `task-${t.id}`,
        type: 'floatingHubTask',
        animated: false,
        selectable: false,
        style: { strokeWidth: 3, stroke, filter: edgeShadow },
      }
    })

    setEdges([...hubHub, ...hubTask])
  }, [initialEdges, initialTasks, initialHubs, completedHubIds, completedTaskIds, canEdit, setEdges])

  // Connect hubs in connect mode
  const onConnect: OnConnect = useCallback(async (connection) => {
    if (!canEdit || !connectMode) return
    const fromId = Number((connection.source ?? '').replace('hub-', ''))
    const toId   = Number((connection.target ?? '').replace('hub-', ''))
    if (!fromId || !toId || fromId === toId) return
    // Prevent duplicate connections and inform user
    const alreadyExists = initialEdges.some(e => e.from_hub_id === fromId && e.to_hub_id === toId)
    if (alreadyExists) {
      showAlert('error', 'These hubs are already connected.')
      return
    }
    await onAddEdge(fromId, toId)
  }, [canEdit, connectMode, initialEdges, onAddEdge, showAlert])

  // Prevent deleting hub→task edges
  const onEdgesDelete: OnEdgesDelete = useCallback((eds) => {
    const hasHT = eds.some(e => e.id.startsWith('edge-h2t-'))
    if (hasHT) {
      setEdges(prev => [...prev]) // prevent deleting hub->task
      return
    }
    // Delete hub->hub edges in backend
    eds.forEach(e => {
      if (e.id.startsWith('edge-h2h-')) {
        const edgeId = Number(e.id.replace('edge-h2h-', ''))
        props.onDeleteEdge(edgeId)
      }
    })
  }, [setEdges, props])

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
        showAlert('error', 'Failed to save hub position. Changes were reverted.')
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
        showAlert('error', 'Failed to save task position. Changes were reverted.')
        if (previous) {
          const fallbackX = Math.round(previous.x ?? 0)
          const fallbackY = Math.round(previous.y ?? 0)
          onMoveTask(taskId, { x: fallbackX, y: fallbackY })
          setNodes(prev => prev.map(n => (n.id === id ? { ...n, position: { x: fallbackX, y: fallbackY } } : n)))
        }
      }
    }
  }, [canEdit, onMoveHub, onMoveTask, initialHubs, initialTasks, setNodes, showAlert])

  const handleHubSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedHub) return
    try {
      await onUpdateHub(selectedHub.id, { title: hubTitle.trim() || selectedHub.title, is_start: hubIsStart })
    } catch (err) {
      console.error('Failed to update hub', err)
      showAlert('error', 'Failed to update hub')
    }
  }, [hubTitle, hubIsStart, onUpdateHub, selectedHub, showAlert])

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
      showAlert('error', 'Failed to delete hub')
    }
  }, [onDeleteHub, selectedHub, showAlert])

  const handleTaskSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTask) return
    try {
      await onUpdateTask(selectedTask.id, { title: taskTitle.trim() || selectedTask.title, task_kind: taskKind })
    } catch (err) {
      console.error('Failed to update task', err)
      showAlert('error', 'Failed to update task')
    }
  }, [onUpdateTask, selectedTask, taskKind, taskTitle, showAlert])

  const handleTaskDelete = useCallback(async () => {
    if (!selectedTask) return
    const confirmed = window.confirm('Delete this task?')
    if (!confirmed) return
    try {
      await onDeleteTask(selectedTask.id)
      setSelectedTaskId(null)
    } catch (err) {
      console.error('Failed to delete task', err)
      showAlert('error', 'Failed to delete task')
    }
  }, [onDeleteTask, selectedTask, showAlert])

  const handleEdgeSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedEdge) return
    try {
      await props.onUpdateEdgeColor(selectedEdge.id, edgeColor)
    } catch (err) {
      console.error('Failed to update edge color', err)
      showAlert('error', 'Failed to update connection color')
    }
  }, [edgeColor, props, selectedEdge, showAlert])

  const handleEdgeDelete = useCallback(async () => {
    if (!selectedEdge) return
    const confirmed = window.confirm('Delete this connection between hubs?')
    if (!confirmed) return
    try {
      await props.onDeleteEdge(selectedEdge.id)
      setSelectedEdgeId(null)
    } catch (err) {
      console.error('Failed to delete edge', err)
      showAlert('error', 'Failed to delete connection')
    }
  }, [props, selectedEdge, showAlert])

  // Deselect when clicking on empty canvas background
  const handlePaneClick = useCallback(() => {
    setSelectedHubId(null)
    setSelectedTaskId(null)
    setSelectedEdgeId(null)
    setConnectSourceHubId(null)
    setModal(null)
  }, [])

  return (
  <div ref={wrapperRef} className={`h-full rounded-2xl overflow-hidden relative ${canEdit ? 'border-4 border-red-700' : 'border-0'}` }>
      {canEdit && (
        <div className="absolute z-10 left-3 top-3 bg-white/90 rounded-xl shadow px-3 py-2 flex items-center gap-2">
          <button
            className="border rounded px-2 py-1"
            onClick={() => {
              const c = getViewportCenter()
              onAddHub(c)
            }}
          >
            + Hub
          </button>
          <button
            className="border rounded px-2 py-1"
            onClick={() => {
              const c = getViewportCenter()
              onAddTask(selectedHubId ?? (selectedTask ? selectedTask.hub_id : null), c)
            }}
          >
            + Task
          </button>
          <button
            className={`border rounded px-2 py-1 ${connectMode ? 'bg-amber-200' : ''}`}
            onClick={() => setConnectMode(v => !v)}
            title="Connect hubs"
          >
            ↔ Connect
          </button>
          {connectMode && (
            <span className="text-xs text-gray-500 ml-2">
              {connectSourceHubId
                ? `Connecting from hub ${connectSourceHubId}: click another hub to link`
                : 'Click a hub to start linking, then another hub to finish'}
            </span>
          )}
        </div>
      )}

      {canEdit && !modal && (selectedHub || selectedTask || selectedEdge) && (
        <div className="absolute z-10 right-3 top-3 w-64 max-w-[calc(100%-3rem)] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow px-4 py-3 space-y-4">
          {selectedHub && (
            <form onSubmit={handleHubSubmit} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Hub settings</h3>
                <button type="button" onClick={handleHubDelete} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
              {(!startHubId || (selectedHub && startHubId === selectedHub.id)) && (
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" checked={hubIsStart} onChange={(e) => setHubIsStart(e.target.checked)} />
                  Starting hub
                </label>
              )}
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Title
                <input
                  value={hubTitle}
                  onChange={(e) => setHubTitle(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/50"
                />
              </label>
              {/* Color editing removed: editing follows student-mode colors */}
              <button
                type="submit"
                className="w-full bg-slate-900 text-white text-xs font-semibold uppercase tracking-wide rounded-full py-2"
              >
                Save hub
              </button>
            </form>
          )}
          {selectedTask && (
            <form onSubmit={handleTaskSubmit} className="space-y-2 pt-3">
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
          {selectedEdge && (
            <form onSubmit={handleEdgeSubmit} className="space-y-2 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Connection settings</h3>
                <button type="button" onClick={handleEdgeDelete} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Color
                <input
                  type="color"
                  value={edgeColor}
                  onChange={(e) => setEdgeColor(e.target.value)}
                  className="h-8 w-full rounded border border-slate-300"
                />
              </label>
              <button
                type="submit"
                className="w-full bg-slate-900 text-white text-xs font-semibold uppercase tracking-wide rounded-full py-2"
              >
                Save connection
              </button>
            </form>
          )}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
  nodeTypes={nodeTypesRef.current}
  edgeTypes={edgeTypesRef.current}
    onInit={(instance) => { rfInstance.current = instance }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
  onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={handlePaneClick}
        onNodeClick={(_, node) => {
          if (canEdit) return
          if (node.type === 'hubNode') {
            const data = node.data as HubData & { hubState?: string }
            if (data.hubState === 'locked') return
            openHubModal(data.id)
            return
          }
          if (node.type === 'taskNode') {
            const data = node.data as TaskData & { parentHubState?: string }
            if (data.parentHubState === 'locked') return
            openTaskModal(data.id)
          }
        }}
        onEdgeClick={(_, edge) => {
          if (!canEdit) return
          if (edge.id.startsWith('edge-h2h-')) {
            const id = Number(edge.id.replace('edge-h2h-', ''))
            setSelectedEdgeId(id)
            setSelectedHubId(null)
            setSelectedTaskId(null)
          }
        }}
        connectionMode={ConnectionMode.Loose}
        fitView
    elementsSelectable={canEdit}
    nodesDraggable={canEdit}
    panOnDrag
  nodesConnectable={false}
  deleteKeyCode={canEdit ? 'Delete' : undefined}
          proOptions={{ hideAttribution: true }}
    className="rounded-lg shadow-[inset_0_10px_10px_rgba(0,0,0,0.3),inset_10px_0_10px_rgba(0,0,0,0.14)]"
        style={{ background: '#b7c89d' }}
      >
        {showMinimap && (
          <MiniMap
            nodeBorderRadius={999}
            nodeStrokeWidth={1.5}
            nodeStrokeColor={() => '#00000033'}
            nodeColor={(n: Node) => {
              if (canEdit) return '#5cb0ff'
              if (n.type === 'hubNode') {
                const d = n.data as (HubData & { hubState?: 'locked'|'unlocked'|'completed' })
                const state = d?.hubState
                if (state === 'completed') return '#a6f273'
                if (state === 'unlocked') return '#5cb0ff'
                return '#ababab'
              }
              if (n.type === 'taskNode') {
                const d = n.data as (TaskData & { parentHubState?: 'locked'|'unlocked'|'completed'; isDone?: boolean })
                if (d?.parentHubState === 'locked') return '#ababab'
                return d?.isDone ? '#a6f273' : '#5cb0ff'
              }
              return '#999999'
            }}
          />
        )}
        <Controls showInteractive={false}>
          <ControlButton title="Toggle minimap" onClick={() => setShowMinimap(v => !v)} aria-pressed={showMinimap}>
            🗺
          </ControlButton>
        </Controls>
      </ReactFlow>
      {modal && (
        <NodeModal
          open={!!modal}
          type={modal.type}
          canEdit={canEdit}
          hub={modal.type === 'hub' ? { id: modal.hub.id, title: modal.hub.title, color: modal.hub.color } : undefined}
          task={modal.type === 'task' ? { id: modal.task.id, title: modal.task.title, task_kind: modal.task.task_kind, color: modal.task.color } : undefined}
          onClose={() => setModal(null)}
          // Edit callbacks
          onUpdateHub={onUpdateHub}
          onDeleteHub={onDeleteHub}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          // Student progress
          taskDone={modal.type === 'task' ? completedTaskIds.has(modal.task.id) : undefined}
          onToggleTaskDone={toggleTaskDone}
          hubDone={modal.type === 'hub' ? completedHubIds.has(modal.hub.id) : undefined}
          allHubTasksDone={modal.type === 'hub' ? initialTasks.filter(t => t.hub_id === modal.hub.id).every(t => completedTaskIds.has(t.id)) : undefined}
          onToggleHubDone={toggleHubDone}
        />
      )}
    </div>
  )
}
