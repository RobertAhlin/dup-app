import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from '../api/axios'
import GraphCanvas from '../components/graph/GraphCanvas'
import type { HubData, TaskData, HubEdgeData } from '../components/graph/GraphCanvas'
import MainCard from '../components/MainCard'
import UserProfileCircle from '../components/UserProfileCircle'
import { useAuth } from '../hooks/useAuth'
import { getCourse } from '../api/courses'
import type { Course } from '../types/course'
import { useAlert } from '../contexts/useAlert'
import ProgressBar from '../components/ProgressBar'
import LoadingSpinner from '../components/LoadingSpinner'
import QuizManagementModal from '../components/quiz/QuizManagementModal'
import { getQuizzes } from '../api/quizzes'
import type { Quiz } from '../types/quiz'
import { toggleCourseLock } from '../api/courses'

type GraphResponse = {
  hubs: HubData[]
  tasks: TaskData[]
  edges: HubEdgeData[]
}

type ProgressSummary = {
  totalTasks: number
  totalHubs: number
  completedTasks: number
  completedHubs: number
  totalItems: number
  completedItems: number
  percentage: number
}

type AxiosLikeError = {
  response?: {
    status?: number
    data?: { error?: string }
  }
}

// Add CourseProgress type for local use
type CourseProgress = {
  id: number;
  title: string;
  icon?: string;
  progress: {
    totalTasks: number;
    totalHubs: number;
    completedTasks: number;
    completedHubs: number;
    totalItems: number;
    completedItems: number;
    percentage: number;
  };
};

export default function CourseBuilderPage() {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const courseId = Number(courseIdParam)
  const [course, setCourse] = useState<Course | null>(null)
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [taskDoneIds, setTaskDoneIds] = useState<number[] | null>(null)
  const [hubDoneIds, setHubDoneIds] = useState<number[] | null>(null)
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null)
  const [mode, setMode] = useState<'student' | 'edit'>('student')
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const initialModeSet = useRef(false)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState<number | undefined>(undefined)
  const { showAlert } = useAlert()
  // Fix: Declare courses and setCourses at the top
  const [courses, setCourses] = useState<CourseProgress[]>([]);

  const isTeacher = useMemo(() => {
    const role = (user?.role ?? '').toLowerCase()
    return role === 'teacher' || role === 'admin'
  }, [user])
  const isAdmin = useMemo(() => (user?.role ?? '').toLowerCase() === 'admin', [user])

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
      showAlert('error', 'Invalid course id')
      setLoading(false)
      return
    }

    let isCancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      axios.get<{ graph: GraphResponse }>(`/api/courses/${courseId}/graph`),
      axios.get<{ 
        taskProgress: Array<{ task_id: number; status: string }>
        hubProgress: Array<{ hub_id: number; state: string }>
        summary: ProgressSummary
      }>(`/api/courses/${courseId}/progress`),
      getCourse(courseId),
      axios.get<{ courses: CourseProgress[] }>(`/api/courses/dashboard/progress`),
    ])
      .then(([graphRes, progressRes, courseData, coursesRes]) => {
        if (isCancelled) return
        setGraph(graphRes.data.graph)
        const taskIds = progressRes.data.taskProgress.filter(p => p.status === 'completed').map(p => p.task_id)
        const hubIds = progressRes.data.hubProgress.filter(p => p.state === 'completed').map(p => p.hub_id)
        setTaskDoneIds(taskIds)
        setHubDoneIds(hubIds)
        setProgressSummary(progressRes.data.summary)
        setCourse(courseData)
        setCourses(coursesRes.data.courses)
      })
      .catch((err: unknown) => {
        if (isCancelled) return
        console.error('Failed to load course graph', err)
        const axiosErr = err as AxiosLikeError
        const status = axiosErr.response?.status
        if (status === 403) {
          setError('You do not have access to this course.')
          showAlert('error', 'You do not have access to this course.')
          setTimeout(() => navigate('/dashboard'), 2000)
          return
        }
        if (status === 404) {
          setError('Course not found.')
          showAlert('error', 'Course not found.')
          return
        }
        if (status === 401) {
          setError('Please sign in to view this course.')
          showAlert('error', 'Please sign in to view this course.')
          setTimeout(() => navigate('/login'), 2000)
          return
        }
        const message = axiosErr.response?.data?.error ?? 'Failed to load course graph'
        setError(message)
        showAlert('error', message)
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [courseId, navigate, showAlert])

  const handleAddHub = useCallback(async (coords?: { x: number; y: number }) => {
    if (!graph) return
    try {
      setError(null)
      const payload = { courseId, title: 'New hub', x: coords?.x ?? 200, y: coords?.y ?? 200 }
      const res = await axios.post<{ hub: HubData }>(`/api/hubs`, payload)
      setGraph(current => current ? { ...current, hubs: [...current.hubs, res.data.hub] } : current)
    } catch (err) {
      console.error('Failed to add hub', err)
      setError('Failed to add hub')
      showAlert('error', 'Failed to add hub')
    }
  }, [courseId, graph, showAlert])

  const handleAddTask = useCallback(async (selectedHubId: number | null, coords?: { x: number; y: number }) => {
    if (!graph) return
    if (!selectedHubId) {
      setError('Select a hub before adding a task')
      showAlert('error', 'Select a hub before adding a task')
      return
    }
    try {
      setError(null)
      const payload = { hubId: selectedHubId, title: 'New task', task_kind: 'content', x: coords?.x ?? 70, y: coords?.y ?? 0 }
      const res = await axios.post<{ task: TaskData }>(`/api/tasks`, payload)
      setGraph(current => current ? { ...current, tasks: [...current.tasks, res.data.task] } : current)
    } catch (err) {
      console.error('Failed to add task', err)
      setError('Failed to add task')
      showAlert('error', 'Failed to add task')
    }
  }, [graph, showAlert])

  const handleAddEdge = useCallback(async (fromHubId: number, toHubId: number) => {
    if (!graph) return
    // Frontend guard: prevent duplicates and inform user
    const duplicate = graph.edges.some(e => e.from_hub_id === fromHubId && e.to_hub_id === toHubId)
    if (duplicate) {
      showAlert('error', 'These hubs are already connected.')
      return
    }
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
      showAlert('error', 'Failed to add edge')
    }
  }, [courseId, graph, showAlert])

  const handleUpdateHub = useCallback(async (hubId: number, updates: { title?: string; color?: string; is_start?: boolean }) => {
    try {
      setError(null)
      const res = await axios.patch<{ hub: HubData }>(`/api/hubs/${hubId}`, updates)
      setGraph(current => {
        if (!current) return current
        const updatedHub = res.data.hub
        const clearOthers = updates.is_start === true
        return {
          ...current,
          hubs: current.hubs.map(h => (
            h.id === hubId
              ? updatedHub
              : (clearOthers ? { ...h, is_start: false } : h)
          )),
        }
      })
    } catch (err) {
      console.error('Failed to update hub', err)
      setError('Failed to update hub')
      showAlert('error', 'Failed to update hub')
      throw err
    }
  }, [showAlert])

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
      showAlert('error', 'Failed to delete hub')
      throw err
    }
  }, [showAlert])

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
      showAlert('error', 'Failed to update task')
      throw err
    }
  }, [showAlert])

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
      showAlert('error', 'Failed to delete task')
      throw err
    }
  }, [showAlert])

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
  const [managePressed, setManagePressed] = useState(false)
  const [isTogglingLock, setIsTogglingLock] = useState(false)

  const loadQuizzes = useCallback(async () => {
    try {
      const data = await getQuizzes({ courseId })
      setQuizzes(data)
    } catch (err) {
      console.error('Failed to load quizzes', err)
      setQuizzes([])
    } finally {
      // no-op
    }
  }, [courseId])

  const refetchProgress = useCallback(async () => {
    try {
      const res = await axios.get<{ 
        taskProgress: Array<{ task_id: number; status: string }>
        hubProgress: Array<{ hub_id: number; state: string }>
        summary: ProgressSummary
      }>(`/api/courses/${courseId}/progress`)
      const taskIds = res.data.taskProgress.filter(p => p.status === 'completed').map(p => p.task_id)
      const hubIds = res.data.hubProgress.filter(p => p.state === 'completed').map(p => p.hub_id)
      setTaskDoneIds(taskIds)
      setHubDoneIds(hubIds)
      setProgressSummary(res.data.summary)
    } catch (err) {
      console.error('Failed to refetch progress', err)
    }
  }, [courseId])

  const handleDeleteEdge = useCallback(async (edgeId: number) => {
    try {
      setError(null)
      await axios.delete(`/api/edges/${edgeId}`)
      setGraph(current => current ? { ...current, edges: current.edges.filter(e => e.id !== edgeId) } : current)
    } catch (err) {
      console.error('Failed to delete edge', err)
      setError('Failed to delete connection')
      showAlert('error', 'Failed to delete connection')
      throw err
    }
  }, [showAlert])

  const handleUpdateEdgeColor = useCallback(async (edgeId: number, color: string) => {
    try {
      setError(null)
      const res = await axios.patch<{ edge: HubEdgeData }>(`/api/edges/${edgeId}`, { color })
      setGraph(current => current ? { ...current, edges: current.edges.map(e => e.id === edgeId ? { ...e, color: res.data.edge.color } : e) } : current)
    } catch (err) {
      console.error('Failed to update edge color', err)
      setError('Failed to update connection color')
      showAlert('error', 'Failed to update connection color')
      throw err
    }
  }, [showAlert])

  const handleToggleLock = useCallback(async () => {
    if (!course || isTogglingLock) return
    setIsTogglingLock(true)
    try {
      const result = await toggleCourseLock(courseId)
      setCourse(current => current ? { ...current, is_locked: result.is_locked } : current)
      showAlert('success', result.is_locked ? 'Course locked for students' : 'Course unlocked for students')
    } catch (err) {
      console.error('Failed to toggle course lock', err)
      showAlert('error', 'Failed to toggle course lock')
    } finally {
      setIsTogglingLock(false)
    }
  }, [course, courseId, isTogglingLock, showAlert])

  const renderContent = () => {
    if (loading || authLoading) {
      return <div className="p-6"><LoadingSpinner size="medium" text="Loading course..." /></div>
    }

    // Errors are surfaced exclusively via AlertBanner; no inline error UI here

    if (!graph || !course) {
      return <div className="p-6 text-sm text-gray-500">No course data available.</div>
    }

    return (
      <div className="p-2 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold">{course.title}</h2>
            {course.description && (
              <p className="text-sm text-slate-500 max-w-xl">{course.description}</p>
            )}
          </div>
          {isTeacher && (
            <>
              <div className="ml-auto" aria-label="Lock course" role="group">
                <span className="pl-13 text-xs font-semibold uppercase">Course</span>
                <div
                  className="relative flex items-center w-30 h-7 rounded-full border border-slate-300 bg-linear-to-br from-slate-200 via-slate-100 to-white shadow-inner p-0.5"
                  style={{ minWidth: '148px' }}
                >
                  {/* Animated slider background */}
                  <div
                    className="absolute top-0 left-0 h-full w-full rounded-full pointer-events-none"
                    style={{
                      transition: 'background 0.4s',
                      background: course?.is_locked
                        ? 'linear-gradient(90deg, #f87171 60%, #f87171 100%)'
                        : 'linear-gradient(90deg, #a3e635 60%, #a3e635 100%)',
                      opacity: 0.25,
                    }}
                  />
                  {/* Slider knob */}
                  <div
                    className="absolute top-0.8 left-1 h-6 rounded-full bg-white shadow transition-all duration-400"
                    style={{
                      width: course?.is_locked ? '64px' : '80px', // Match 'Locked'/'Unlocked' label width
                      transform: course?.is_locked ? 'translateX(-2px)' : 'translateX(60px)',
                      transition: 'transform 0.4s cubic-bezier(.4,0,.2,1), width 0.4s cubic-bezier(.4,0,.2,1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  />
                  {/* Buttons (labels) */}
                  <button
                    type="button"
                    onClick={handleToggleLock}
                    disabled={isTogglingLock}
                    // ...removed lockPressed handlers
                                className={`flex-1 px-2 text-xs font-semibold uppercase tracking-wide rounded-full transition-all duration-400 ${
                                  course?.is_locked
                                    ? 'text-slate-900'
                                    : 'text-slate-500 hover:text-blue-500 cursor-pointer'
                                } ${isTogglingLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{
                      color: course?.is_locked ? '#b91c1c' : undefined,
                      transition: 'color 0.4s',
                      zIndex: 2,
                      fontWeight: 600,
                    }}
                  >
                    Locked
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleLock}
                    disabled={isTogglingLock}
                    // ...removed lockPressed handlers
                                className={`flex-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all duration-400 ${
                                  !course?.is_locked
                                    ? 'text-slate-900'
                                    : 'text-slate-500 hover:text-blue-500 cursor-pointer'
                                } ${isTogglingLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{
                      color: !course?.is_locked ? '#65a30d' : undefined,
                      transition: 'color 0.4s',
                      zIndex: 2,
                      fontWeight: 600,
                      
                    }}
                  >
                    Unlocked
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedQuizId(undefined)
                  setShowQuizModal(true)
                }}
                onMouseDown={() => setManagePressed(true)}
                onMouseUp={() => setManagePressed(false)}
                onMouseLeave={() => setManagePressed(false)}
                className={`ml-auto px-4 py-3.5 text-xs border-3 border-gray-300 font-semibold uppercase tracking-wide rounded-full transition-all ${managePressed ? 'bg-gray-200 cursor-pointer' : 'bg-white hover:bg-gray-100 cursor-pointer'} text-slate-900`}
                  style={managePressed ? { boxShadow: 'inset 3px 3px 0 rgba(0,0,0,0.1), inset 1px 1px 0 rgba(0,0,0,0.2)' } : undefined}
              >
                Manage Quizzes
              </button>
              <div className="ml-2" aria-label="Switch view mode" role="group">
                <div className="flex rounded-full border border-slate-300 bg-linear-to-br from-slate-200 via-slate-100 to-white shadow-inner p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('student')}
                  className={`flex-1 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all ${mode === 'student'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 cursor-pointer'
                  }`}
                >
                  Student view
                </button>
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={`flex-1 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full transition-all ${mode === 'edit'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 cursor-pointer'
                  }`}
                >
                  Edit mode
                </button>
              </div>
            </div>
            </>
          )}
        </div>

        <div className="flex-1 min-h-[500px]">
          <GraphCanvas
            courseId={courseId}
            initialHubs={graph.hubs}
            initialTasks={graph.tasks}
            initialEdges={graph.edges}
            canEdit={canEdit}
            availableQuizzes={quizzes.map(q => ({ id: q.id, title: q.title, hub_id: q.hub_id }))}
            initialTaskDoneIds={taskDoneIds ?? undefined}
            initialHubDoneIds={hubDoneIds ?? undefined}
            onSetTaskDone={async (taskId, done) => {
              try {
                await axios.put(`/api/tasks/${taskId}/progress`, { done })
                await refetchProgress()
              } catch (err) {
                const axiosErr = err as AxiosLikeError
                const msg = axiosErr.response?.data?.error ?? 'Failed to update task progress'
                showAlert('error', msg)
                throw err
              }
            }}
            onSetHubDone={async (hubId, done) => {
              try {
                await axios.put(`/api/hubs/${hubId}/progress`, { done })
                await refetchProgress()
              } catch (err) {
                const axiosErr = err as AxiosLikeError
                const msg = axiosErr.response?.data?.error ?? 'Failed to update hub progress'
                showAlert('error', msg)
                throw err
              }
            }}
            onAddHub={handleAddHub}
            onAddTask={handleAddTask}
            onAddEdge={handleAddEdge}
            onUpdateHub={handleUpdateHub}
            onDeleteHub={handleDeleteHub}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onMoveHub={handleMoveHub}
            onMoveTask={handleMoveTask}
            onDeleteEdge={handleDeleteEdge}
            onUpdateEdgeColor={handleUpdateEdgeColor}
            onHubUpdate={async () => {
              const graphRes = await axios.get(`/api/courses/${courseId}/graph`)
              setGraph(graphRes.data.graph)
              await loadQuizzes()
            }}
          />
        </div>

        {!canEdit && progressSummary && (
          <div className="mt-4">
            <ProgressBar
              percentage={progressSummary.percentage}
              completedItems={progressSummary.completedItems}
              totalItems={progressSummary.totalItems}
            />
          </div>
        )}

        <QuizManagementModal
          open={showQuizModal}
          onClose={() => setShowQuizModal(false)}
          courseId={courseId}
          selectedQuizId={selectedQuizId}
          onSelectQuiz={(id) => setSelectedQuizId(id)}
          onSave={async (newQuizId) => {
            await loadQuizzes()
            // Reload graph to get updated hub quiz_id values
            const graphRes = await axios.get(`/api/courses/${courseId}/graph`)
            setGraph(graphRes.data.graph)
            // Keep the quiz open for adding questions
            if (newQuizId) {
              setSelectedQuizId(newQuizId)
            }
          }}
          hubs={graph?.hubs?.map(h => ({ id: h.id, title: h.title, quiz_id: h.quiz_id ?? undefined })) || []}
          onQuizzesChanged={setQuizzes}
        />
      </div>
    )
  }

  // Calculate average percentage for student (same as dashboard)
  let avgPercent = 0;
  if (courses.length > 0) {
    avgPercent = Math.round(
      courses.reduce((sum, c) => sum + (c.progress?.percentage ?? 0), 0) / courses.length
    );
  }

  return (
    <MainCard
      name={user?.name ?? ''}
      email={user?.email ?? ''}
      role={user?.role ?? ''}
      chip={!authLoading && user && !isAdmin ? { label: 'Dashboard', to: '/dashboard' } : undefined}
      headerElement={<UserProfileCircle percentage={avgPercent} size={100} role={user?.role} />}
    >
      {renderContent()}
    </MainCard>
  )
}
