import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from '../api/axios'
import GraphCanvas from '../components/graph/GraphCanvas'
import type { HubData, TaskData, HubEdgeData } from '../components/graph/GraphCanvas'
import MainCard from '../components/MainCard'
import { useAuth } from '../hooks/useAuth'
import { getCourse } from '../api/courses'
import type { Course } from '../types/course'

type GraphResponse = {
  hubs: HubData[]
  tasks: TaskData[]
  edges: HubEdgeData[]
}

type AxiosLikeError = {
  response?: {
    status?: number
    data?: { error?: string }
  }
}

export default function CourseBuilderPage() {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const courseId = Number(courseIdParam)
  const [course, setCourse] = useState<Course | null>(null)
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [mode, setMode] = useState<'student' | 'edit'>('student')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialModeSet = useRef(false)

  const isTeacher = useMemo(() => {
    const role = (user?.role ?? '').toLowerCase()
    return role === 'teacher' || role === 'admin'
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!initialModeSet.current) {
      setMode(isTeacher ? 'edit' : 'student')
      initialModeSet.current = true
      return
    }
    if (!isTeacher) {
      setMode('student')
    }
  }, [isTeacher])

  useEffect(() => {
    if (!Number.isInteger(courseId) || Number.isNaN(courseId)) {
      setError('Invalid course id')
      setLoading(false)
      return
    }

    let isCancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      axios.get<{ graph: GraphResponse }>(`/api/courses/${courseId}/graph`),
      getCourse(courseId),
    ])
      .then(([graphRes, courseData]) => {
        if (isCancelled) return
        setGraph(graphRes.data.graph)
        setCourse(courseData)
      })
      .catch((err: unknown) => {
        if (isCancelled) return
        console.error('Failed to load course graph', err)
        const axiosErr = err as AxiosLikeError
        const status = axiosErr.response?.status
        if (status === 403) {
          setError('You do not have access to this course.')
          setTimeout(() => navigate('/dashboard'), 2000)
          return
        }
        if (status === 404) {
          setError('Course not found.')
          return
        }
        if (status === 401) {
          setError('Please sign in to view this course.')
          setTimeout(() => navigate('/login'), 2000)
          return
        }
        const message = axiosErr.response?.data?.error ?? 'Failed to load course graph'
        setError(message)
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [courseId, navigate])

  const handleAddHub = useCallback(async () => {
    if (!graph) return
    try {
      setError(null)
      const payload = { courseId, title: 'New hub', x: 200, y: 200 }
      const res = await axios.post<{ hub: HubData }>(`/api/hubs`, payload)
      setGraph(current => current ? { ...current, hubs: [...current.hubs, res.data.hub] } : current)
    } catch (err) {
      console.error('Failed to add hub', err)
      setError('Failed to add hub')
    }
  }, [courseId, graph])

  const handleAddTask = useCallback(async (selectedHubId: number | null) => {
    if (!graph) return
    if (!selectedHubId) {
      setError('Select a hub before adding a task')
      return
    }
    try {
      setError(null)
      const payload = { hubId: selectedHubId, title: 'New task', task_kind: 'content', x: 70, y: 0 }
      const res = await axios.post<{ task: TaskData }>(`/api/tasks`, payload)
      setGraph(current => current ? { ...current, tasks: [...current.tasks, res.data.task] } : current)
    } catch (err) {
      console.error('Failed to add task', err)
      setError('Failed to add task')
    }
  }, [graph])

  const handleAddEdge = useCallback(async (fromHubId: number, toHubId: number) => {
    if (!graph) return
    try {
      setError(null)
      const res = await axios.post<{ edge: HubEdgeData }>(`/api/edges`, {
        courseId,
        from_hub_id: fromHubId,
        to_hub_id: toHubId,
        rule: 'all_tasks_complete',
        rule_value: {},
      })
      setGraph(current => current ? { ...current, edges: [...current.edges, res.data.edge] } : current)
    } catch (err) {
      console.error('Failed to add edge', err)
      setError('Failed to add edge')
    }
  }, [courseId, graph])

  const handleUpdateHub = useCallback(async (hubId: number, updates: { title?: string; color?: string }) => {
    try {
      setError(null)
      const res = await axios.patch<{ hub: HubData }>(`/api/hubs/${hubId}`, updates)
      setGraph(current => {
        if (!current) return current
        return {
          ...current,
          hubs: current.hubs.map(h => (h.id === hubId ? res.data.hub : h)),
        }
      })
    } catch (err) {
      console.error('Failed to update hub', err)
      setError('Failed to update hub')
      throw err
    }
  }, [])

  const handleDeleteHub = useCallback(async (hubId: number) => {
    try {
      setError(null)
      await axios.delete(`/api/hubs/${hubId}`)
      setGraph(current => {
        if (!current) return current
        const remainingTasks = current.tasks.filter(t => t.hub_id !== hubId)
        const remainingEdges = current.edges.filter(e => e.from_hub_id !== hubId && e.to_hub_id !== hubId)
        return {
          hubs: current.hubs.filter(h => h.id !== hubId),
          tasks: remainingTasks,
          edges: remainingEdges,
        }
      })
    } catch (err) {
      console.error('Failed to delete hub', err)
      setError('Failed to delete hub')
      throw err
    }
  }, [])

  const handleUpdateTask = useCallback(async (taskId: number, updates: { title?: string; task_kind?: TaskData['task_kind'] }) => {
    try {
      setError(null)
      const res = await axios.patch<{ task: TaskData }>(`/api/tasks/${taskId}`, updates)
      setGraph(current => {
        if (!current) return current
        return {
          ...current,
          tasks: current.tasks.map(t => (t.id === taskId ? res.data.task : t)),
        }
      })
    } catch (err) {
      console.error('Failed to update task', err)
      setError('Failed to update task')
      throw err
    }
  }, [])

  const handleDeleteTask = useCallback(async (taskId: number) => {
    try {
      setError(null)
      await axios.delete(`/api/tasks/${taskId}`)
      setGraph(current => {
        if (!current) return current
        return {
          ...current,
          tasks: current.tasks.filter(t => t.id !== taskId),
          edges: current.edges,
        }
      })
    } catch (err) {
      console.error('Failed to delete task', err)
      setError('Failed to delete task')
      throw err
    }
  }, [])

  const handleMoveHub = useCallback((hubId: number, coords: { x: number; y: number }) => {
    setGraph(current => {
      if (!current) return current
      return {
        ...current,
        hubs: current.hubs.map(h => (h.id === hubId ? { ...h, x: coords.x, y: coords.y } : h)),
      }
    })
  }, [])

  const handleMoveTask = useCallback((taskId: number, coords: { x: number; y: number }) => {
    setGraph(current => {
      if (!current) return current
      return {
        ...current,
        tasks: current.tasks.map(t => (t.id === taskId ? { ...t, x: coords.x, y: coords.y } : t)),
      }
    })
  }, [])

  const canEdit = isTeacher && mode === 'edit'

  const renderContent = () => {
    if (loading || authLoading) {
      return <div className="p-6 text-sm text-gray-500">Loading course…</div>
    }

    if (error) {
      return <div className="p-6 text-sm text-red-600">{error}</div>
    }

    if (!graph || !course) {
      return <div className="p-6 text-sm text-gray-500">No course data available.</div>
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold">{course.title}</h2>
            {course.description && (
              <p className="text-sm text-slate-500 max-w-xl">{course.description}</p>
            )}
          </div>
          {isTeacher && (
            <div className="ml-auto" aria-label="Switch view mode" role="group">
              <div className="flex rounded-full border border-slate-300 bg-linear-to-br from-slate-200 via-slate-100 to-white shadow-inner p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('student')}
                  className={`flex-1 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all ${mode === 'student'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Student view
                </button>
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={`flex-1 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all ${mode === 'edit'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Edit mode
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[500px]">
          <GraphCanvas
            courseId={courseId}
            initialHubs={graph.hubs}
            initialTasks={graph.tasks}
            initialEdges={graph.edges}
            canEdit={canEdit}
            onAddHub={handleAddHub}
            onAddTask={handleAddTask}
            onAddEdge={handleAddEdge}
            onUpdateHub={handleUpdateHub}
            onDeleteHub={handleDeleteHub}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onMoveHub={handleMoveHub}
            onMoveTask={handleMoveTask}
          />
        </div>
      </div>
    )
  }

  return (
    <MainCard
      name={user?.name ?? ''}
      email={user?.email ?? ''}
      role={user?.role ?? ''}
      chip={{ label: 'Dashboard', to: '/dashboard' }}
    >
      {renderContent()}
    </MainCard>
  )
}
