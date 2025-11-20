import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from '../api/axios'
import GraphCanvas from '../components/graph/GraphCanvas'
import type { HubData, TaskData, HubEdgeData } from '../components/graph/GraphCanvas'
import MainCard from '../components/MainCard'
import { useAuth } from '../hooks/useAuth'
import { getCourse } from '../api/courses'
import type { Course } from '../types/course'
import { useAlert } from '../contexts/useAlert'
import ProgressBar from '../components/ProgressBar'
import LoadingSpinner from '../components/LoadingSpinner'
import QuizBuilder from '../components/quiz/QuizBuilder'
import { getQuizzes, deleteQuiz } from '../api/quizzes'
import type { Quiz } from '../types/quiz'

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
  const [loadingQuizzes, setLoadingQuizzes] = useState(false)
  const { showAlert } = useAlert()

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
    ])
      .then(([graphRes, progressRes, courseData]) => {
        if (isCancelled) return
        setGraph(graphRes.data.graph)
        const taskIds = progressRes.data.taskProgress.filter(p => p.status === 'completed').map(p => p.task_id)
        const hubIds = progressRes.data.hubProgress.filter(p => p.state === 'completed').map(p => p.hub_id)
        setTaskDoneIds(taskIds)
        setHubDoneIds(hubIds)
        setProgressSummary(progressRes.data.summary)
        setCourse(courseData)
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

  const loadQuizzes = useCallback(async () => {
    setLoadingQuizzes(true)
    try {
      const data = await getQuizzes({ courseId })
      setQuizzes(data)
    } catch (err) {
      console.error('Failed to load quizzes', err)
      setQuizzes([])
    } finally {
      setLoadingQuizzes(false)
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
              <button
                onClick={() => {
                  setQuizzes([]) // Reset first
                  loadQuizzes()
                  setSelectedQuizId(undefined)
                  setShowQuizModal(true)
                }}
                className="ml-auto px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-medium"
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

        {/* Quiz Management Modal */}
        {showQuizModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold">Quiz Management</h2>
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {selectedQuizId === undefined ? (
                  <div className="p-4 space-y-4 h-full overflow-y-auto">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Course Quizzes</h3>
                      <button
                        onClick={() => setSelectedQuizId(0)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Create New Quiz
                      </button>
                    </div>
                    <div className="space-y-2">
                      {loadingQuizzes ? (
                        <p className="text-gray-500 text-sm">Loading quizzes...</p>
                      ) : !quizzes || quizzes.length === 0 ? (
                        <p className="text-gray-500 text-sm">No quizzes yet. Create one to get started.</p>
                      ) : (
                        quizzes.map(quiz => (
                          <div
                            key={quiz.id}
                            className="border rounded p-3 flex justify-between items-center hover:bg-gray-50"
                          >
                            <div>
                              <h4 className="font-medium">{quiz.title}</h4>
                              {quiz.description && (
                                <p className="text-sm text-gray-600">{quiz.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {quiz.questions_per_attempt} questions per attempt
                                {quiz.hub_id ? ' • Attached to hub' : ' • Not attached'}
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedQuizId(quiz.id)}
                              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <QuizBuilder
                    key={selectedQuizId}
                    courseId={courseId}
                    quizId={selectedQuizId === 0 ? undefined : selectedQuizId}
                    availableQuizzes={quizzes.map(q => ({ id: q.id, title: q.title }))}
                    hubs={graph?.hubs.map(h => ({ id: h.id, title: h.title, quiz_id: h.quiz_id })) || []}
                    onSelectQuiz={(quizId) => setSelectedQuizId(quizId)}
                    onDeleteQuiz={async (quizId) => {
                      try {
                        await deleteQuiz(quizId)
                        await loadQuizzes()
                        setSelectedQuizId(undefined)
                      } catch (err) {
                        console.error('Failed to delete quiz', err)
                        alert('Failed to delete quiz')
                      }
                    }}
                    onClose={() => setSelectedQuizId(undefined)}
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
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <MainCard
      name={user?.name ?? ''}
      email={user?.email ?? ''}
      role={user?.role ?? ''}
      chip={!authLoading && user && !isAdmin ? { label: 'Dashboard', to: '/dashboard' } : undefined}
    >
      {renderContent()}
    </MainCard>
  )
}
