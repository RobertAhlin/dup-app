import { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import axios from '../api/axios'
import SimpleEditor from './editor/SimpleEditor'
import QuizEditor from './quiz/QuizEditor'
import QuizRunner from './quiz/QuizRunner'
import type { QuizQuestion } from './quiz/QuizEditor'
import type { QuizWithQuestions } from '../types/quiz'
import { useAlert } from '../contexts/useAlert'
import * as quizApi from '../api/quizzes'

// Convert a variety of YouTube URLs to a strict embed URL on youtube-nocookie domain
function toYouTubeEmbed(raw: string): string | null {
  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    let id: string | null = null
    // Extract video id from known patterns
    if (host === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] || null
    } else if (host.endsWith('youtube.com')) {
      if (u.pathname === '/watch') {
        id = u.searchParams.get('v')
      } else if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.split('/')[2] || null
      } else if (u.pathname.startsWith('/embed/')) {
        id = u.pathname.split('/')[2] || null
      }
    }
    if (!id) return null
    // Parse start time (?t=1m30s or ?t=90)
    let start = 0
    const t = u.searchParams.get('t') || u.searchParams.get('start') || ''
    if (t) {
      const m = /^((\d+)m)?((\d+)s)?$/.exec(t)
      if (/^\d+$/.test(t)) start = parseInt(t, 10)
      else if (m) {
        const minutes = m[2] ? parseInt(m[2], 10) : 0
        const seconds = m[4] ? parseInt(m[4], 10) : 0
        start = minutes * 60 + seconds
      }
    }
    const params = new URLSearchParams()
    params.set('rel', '0')
    params.set('modestbranding', '1')
    params.set('controls', '1')
    params.set('iv_load_policy', '3')
    if (start > 0) params.set('start', String(start))
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params.toString()}`
  } catch {
    return null
  }
}

// Minimal shapes to avoid circular imports
export type HubPreview = { id: number; title: string; color?: string; is_start?: boolean; quiz_id?: number | null }
export type TaskPreview = { id: number; title: string; task_kind: string; color?: string }

type Props = {
  open: boolean
  type: 'hub' | 'task'
  hub?: HubPreview
  task?: TaskPreview
  onClose: () => void
  canEdit: boolean
  availableQuizzes?: Array<{ id: number; title: string; hub_id?: number | null }>
  onHubUpdate?: () => Promise<void> | void
  // Student progress callbacks/state
  taskDone?: boolean
  onToggleTaskDone?: (taskId: number, checked: boolean) => void
  hubDone?: boolean
  allHubTasksDone?: boolean
  onToggleHubDone?: (hubId: number, checked: boolean) => void
}

export default function NodeModal(props: Props) {
  // Destructure all props first
  const { open, type, hub, task, onClose, onHubUpdate, canEdit, availableQuizzes = [] } = props;
  const { showAlert } = useAlert();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose }, [onClose]);
  // Student quiz runner state
  const [studentQuiz, setStudentQuiz] = useState<QuizWithQuestions | null>(null);
  const [quizPassed, setQuizPassed] = useState(false);
  // Fetch quiz for students if hub.quiz_id is set and not editing
  useEffect(() => {
    if (!canEdit && type === 'hub' && hub?.quiz_id) {
      quizApi.getQuiz(hub.quiz_id).then(q => setStudentQuiz(q)).catch(() => setStudentQuiz(null));
    } else {
      setStudentQuiz(null);
    }
  }, [canEdit, type, hub?.quiz_id]);
  const [contentLoading, setContentLoading] = useState(false)
  const [html, setHtml] = useState<string>('')
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null)
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)

  useEffect(() => {
    if (hub?.quiz_id !== undefined) {
      setSelectedQuizId(hub.quiz_id)
    }
  }, [hub?.quiz_id])

  useEffect(() => {
    if (!open) return
    closeBtnRef.current?.focus()
    // Prevent background scroll while modal is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current?.(); return }
      if (e.key !== 'Tab') return
      const container = dialogRef.current
      if (!container) return
      const focusables = Array.from(container.querySelectorAll<HTMLElement>('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) { e.preventDefault(); last.focus() }
      } else {
        if (active === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  // Reset form state when entity changes
  // no hub title syncing needed in modal (metadata editing handled elsewhere)
  // metadata editing removed from modal; no need to sync task title/kind here

  // Load content lazily when opening a modal (hub or task)
  useEffect(() => {
    // Only refetch when the entity actually changes (by id), not on unrelated re-renders
    let cancelled = false
    const fetchContent = async () => {
      if (!open) return
      const taskId = type === 'task' ? task?.id : undefined
      const hubId = type === 'hub' ? hub?.id : undefined
      if (!taskId && !hubId) return
      setContentLoading(true)
      try {
        type TaskContentPayload = { html?: string; youtubeUrls?: string[]; imageUrls?: string[]; quiz?: QuizQuestion[] }
        let res: { data: { payload: TaskContentPayload } } | null = null
        if (taskId) {
          res = await axios.get<{ payload: TaskContentPayload }>(`/api/tasks/${taskId}/content`)
        } else if (hubId) {
          res = await axios.get<{ payload: TaskContentPayload }>(`/api/hubs/${hubId}/content`)
        }
        if (cancelled) return
        const p = res?.data.payload || {}
        setHtml(p.html || '')
        setYoutubeUrls(Array.isArray(p.youtubeUrls) ? p.youtubeUrls : [])
        setImageUrls(Array.isArray(p.imageUrls) ? p.imageUrls : [])
        setQuiz(Array.isArray(p.quiz) ? p.quiz : (p.quiz ? p.quiz : null))
      } catch (err) {
        console.error('Failed to load task content', err)
      } finally {
        if (!cancelled) setContentLoading(false)
      }
    }
    fetchContent()
    return () => { cancelled = true }
  }, [open, type, task?.id, hub?.id])

  const canShowHubCheckbox = useMemo(() => !canEdit && type === 'hub' && !!props.allHubTasksDone, [canEdit, type, props.allHubTasksDone])

  const getRandomQuizQuestions = () => {
    if (!studentQuiz || !Array.isArray(studentQuiz.questions)) return [];
    const questionsPerAttempt = studentQuiz.questions_per_attempt || 3;
    return [...studentQuiz.questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, questionsPerAttempt)
      .map(q => {
        const options = Array.isArray(q.answers) ? q.answers.map((a: { answer_text: string; is_correct: boolean }) => a.answer_text) : [];
        const correctIndices = Array.isArray(q.answers)
          ? q.answers.map((a: { answer_text: string; is_correct: boolean }, idx: number) => a.is_correct ? idx : -1).filter((idx: number) => idx >= 0)
          : [];
        return {
          question: q.question_text,
          options,
          correctIndex: correctIndices[0] || -1,
          correctIndices
        };
      });
  };

  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCloseRef.current?.()
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 9999, willChange: 'opacity, transform', transform: 'translateZ(0)' }}
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-xl w-[min(560px,90vw)] max-h-[80vh] overflow-auto"
        style={{ zIndex: 9999, willChange: 'opacity, transform', transform: 'translateZ(0)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 id="node-modal-title" className="text-sm font-semibold text-slate-700">
            {type === 'hub' ? (hub?.title ?? 'Hub') : (task?.title ?? 'Task')} details
          </h3>
          <button ref={closeBtnRef} className="text-slate-500 hover:text-slate-700" onClick={() => onCloseRef.current?.()} aria-label="Close">×</button>
        </div>
        <div className="p-4 text-sm text-slate-700">
          {type === 'hub' && hub && (
            <div className="space-y-3">
              <div><span className="font-medium">Title:</span> {hub.title}</div>
              {canEdit ? (
                <>
                  <div className="min-h-80">
                    {contentLoading ? (
                      <div className="text-xs text-slate-500">Loading content…</div>
                    ) : (
                      <>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Text content</div>
                        <SimpleEditor value={html} onChange={setHtml} readOnly={false} />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500">YouTube links</div>
                        {youtubeUrls.map((u, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input className="flex-1 border rounded px-2 py-1 text-sm" value={u} placeholder="https://www.youtube.com/watch?v=..." onChange={(e) => { const arr=[...youtubeUrls]; arr[i]=e.target.value; setYoutubeUrls(arr) }} />
                            <button type="button" className="text-xs text-red-600" onClick={() => { const arr=[...youtubeUrls]; arr.splice(i,1); setYoutubeUrls(arr) }}>Remove</button>
                          </div>
                        ))}
                        <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => setYoutubeUrls([...youtubeUrls, ''])}>+ Add YouTube link</button>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500">Image links</div>
                        {imageUrls.map((u, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input className="flex-1 border rounded px-2 py-1 text-sm" value={u} placeholder="https://example.com/image.jpg" onChange={(e) => { const arr=[...imageUrls]; arr[i]=e.target.value; setImageUrls(arr) }} />
                            <button type="button" className="text-xs text-red-600" onClick={() => { const arr=[...imageUrls]; arr.splice(i,1); setImageUrls(arr) }}>Remove</button>
                          </div>
                        ))}
                        <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => setImageUrls([...imageUrls, ''])}>+ Add image link</button>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500">Quiz</div>
                        <select
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          value={selectedQuizId || ''}
                          onChange={(e) => setSelectedQuizId(e.target.value ? parseInt(e.target.value) : null)}
                        >
                          <option value="">No quiz selected</option>
                          {availableQuizzes
                            .filter(q => !q.hub_id || q.hub_id === hub?.id)
                            .map(q => (
                              <option key={q.id} value={q.id}>{q.title}</option>
                            ))}
                        </select>
                        <div className="text-xs text-slate-400">
                          Students will get random questions from this quiz when they complete this hub's tasks
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs"
                          onClick={async () => {
                            try {
                              await axios.patch(`/api/hubs/${hub.id}/content`, { html, youtubeUrls, imageUrls, quiz })
                              await quizApi.attachQuizToHub(hub.id, selectedQuizId)
                              if (onHubUpdate) await onHubUpdate()
                              showAlert('success', 'Hub content and quiz saved')
                              onClose()
                            } catch (err) {
                              console.error('Failed to save hub content', err)
                              showAlert('error', 'Failed to save hub content')
                            }
                          }}
                        >Save content</button>
                      </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html || '' }} />
                  {youtubeUrls.map((u, i) => {
                    const src = toYouTubeEmbed(u)
                    if (!src) return null
                    return (
                      <div key={i} className="mt-2">
                        <iframe
                          title={`yt-hub-${i}`}
                          className="w-full aspect-video"
                          src={src}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                      </div>
                    )
                  })}
                  {imageUrls.map((u, i) => (
                    <img key={i} src={u} alt="" className="mt-2 max-w-full rounded" />
                  ))}
                  {/* Show quiz for students if hub has quiz attached */}
                  {studentQuiz && canShowHubCheckbox && !(quizPassed || props.hubDone) && (
                    <div className="mt-3">
                      <QuizRunner
                        questions={getRandomQuizQuestions()}
                        onPass={() => {
                          showAlert('success', 'Quiz completed successfully!');
                          setQuizPassed(true);
                          // Automatically mark hub as done when quiz is passed
                          if (props.onToggleHubDone && hub) {
                            props.onToggleHubDone(hub.id, true);
                          }
                        }}
                      />
                    </div>
                  )}
                  {/* Show message if quiz exists but tasks aren't complete */}
                  {studentQuiz && !canShowHubCheckbox && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      🎯 Hold your horses! First, you must conquer all the tasks in this hub. Only then will the legendary quiz reveal itself. Complete both to claim victory! 🏆
                    </div>
                  )}
                  {/* Fallback: show quiz from hub content if present */}
                  {quiz && quiz.length > 0 && !studentQuiz && (
                    <div className="mt-3">
                      <QuizEditor value={quiz} onChange={() => {}} readOnly={true} />
                    </div>
                  )}
                  {canShowHubCheckbox ? (
                    studentQuiz ? (
                      // Hub has quiz - show completion status with undo option
                      quizPassed || props.hubDone ? (
                        <div className="mt-3 space-y-2">
                          <div className="text-sm font-medium text-green-700">✓ Completed</div>
                          <button
                            onClick={() => {
                              setQuizPassed(false);
                              if (props.onToggleHubDone && hub) {
                                props.onToggleHubDone(hub.id, false);
                              }
                              showAlert('info', 'Quiz completion reset. You can retake the quiz.');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Undo completion
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 mt-2">Complete the quiz to mark this hub as done.</div>
                      )
                    ) : (
                      // No quiz - allow manual completion
                      <label className="flex items-center gap-2 text-xs text-slate-600 mt-3">
                        <input type="checkbox" checked={!!props.hubDone} onChange={(e) => props.onToggleHubDone?.(hub.id, e.target.checked)} />
                        Mark hub as done
                      </label>
                    )
                  ) : (
                    studentQuiz ? (
                      // Hub has quiz but tasks not complete - already shown message above
                      null
                    ) : (
                      // No quiz, tasks not complete
                      <div className="text-xs text-slate-400 mt-2">Complete all tasks to mark this hub as done.</div>
                    )
                  )}
                </>
              )}
            </div>
          )}
          {type === 'task' && task && (
            (
              <div className="space-y-3">
                {canEdit ? (
                  <>
                    <div className="min-h-80">
                      {contentLoading ? (
                        <div className="text-xs text-slate-500">Loading content…</div>
                      ) : (
                        <>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Text content</div>
                          <SimpleEditor value={html} onChange={setHtml} readOnly={false} />
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs text-slate-500">YouTube links</div>
                          {youtubeUrls.map((u, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input className="flex-1 border rounded px-2 py-1 text-sm" value={u} placeholder="https://www.youtube.com/watch?v=..." onChange={(e) => { const arr=[...youtubeUrls]; arr[i]=e.target.value; setYoutubeUrls(arr) }} />
                              <button type="button" className="text-xs text-red-600" onClick={() => { const arr=[...youtubeUrls]; arr.splice(i,1); setYoutubeUrls(arr) }}>Remove</button>
                            </div>
                          ))}
                          <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => setYoutubeUrls([...youtubeUrls, ''])}>+ Add YouTube link</button>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs text-slate-500">Image links</div>
                          {imageUrls.map((u, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input className="flex-1 border rounded px-2 py-1 text-sm" value={u} placeholder="https://example.com/image.jpg" onChange={(e) => { const arr=[...imageUrls]; arr[i]=e.target.value; setImageUrls(arr) }} />
                              <button type="button" className="text-xs text-red-600" onClick={() => { const arr=[...imageUrls]; arr.splice(i,1); setImageUrls(arr) }}>Remove</button>
                            </div>
                          ))}
                          <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => setImageUrls([...imageUrls, ''])}>+ Add image link</button>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs text-slate-500">Quiz</div>
                          <QuizEditor value={quiz ?? []} onChange={(q) => setQuiz(q)} readOnly={false} />
                        </div>
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs"
                            onClick={async () => {
                              try {
                                await axios.patch(`/api/tasks/${task.id}/content`, { html, youtubeUrls, imageUrls, quiz })
                                showAlert('success', 'Task content saved')
                              } catch (err) {
                                console.error('Failed to save content', err)
                                showAlert('error', 'Failed to save task content')
                              }
                            }}
                          >Save content</button>
                        </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html || '' }} />
                    {youtubeUrls.map((u, i) => {
                      const src = toYouTubeEmbed(u)
                      if (!src) return null
                      return (
                        <div key={i} className="mt-2">
                          <iframe
                            title={`yt-${i}`}
                            className="w-full aspect-video"
                            src={src}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                        </div>
                      )
                    })}
                    {imageUrls.map((u, i) => (
                      <img key={i} src={u} alt="" className="mt-2 max-w-full rounded" />
                    ))}
                    {quiz && quiz.length > 0 && (
                      <div className="mt-3">
                        <QuizEditor value={quiz} onChange={() => {}} readOnly={true} />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-slate-600 mt-3">
                      <input type="checkbox" checked={!!props.taskDone} onChange={(e) => props.onToggleTaskDone?.(task.id, e.target.checked)} />
                      Mark task as done
                    </label>
                  </>
                )}
              </div>
            )
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
          <button className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
