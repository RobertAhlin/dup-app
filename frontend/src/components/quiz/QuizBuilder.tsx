// frontend/src/components/quiz/QuizBuilder.tsx

import { useState, useEffect, useCallback } from 'react'
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import type { QuizQuestion } from '../../types/quiz'
import * as quizApi from '../../api/quizzes'
import { useAlert } from '../../contexts/useAlert'

interface QuizBuilderProps {
  courseId: number
  quizId?: number
  onClose: () => void
  onSave: (quizId?: number) => void
  availableQuizzes?: Array<{ id: number; title: string }>
  onSelectQuiz?: (quizId: number) => void
  onDeleteQuiz?: (quizId: number) => void
  hubs?: Array<{ id: number; title: string; quiz_id?: number | null }>
}

export default function QuizBuilder({ courseId, quizId, onClose, onSave, availableQuizzes = [], onSelectQuiz, onDeleteQuiz, hubs = [] }: QuizBuilderProps) {
  const { showAlert } = useAlert()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState<3 | 5>(3)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)
  const [currentQuizId, setCurrentQuizId] = useState(quizId)
  const [selectedHubId, setSelectedHubId] = useState<number | null>(null)

  const loadQuiz = useCallback(async (quizIdToLoad: number) => {
    if (!quizIdToLoad) return
    setLoading(true)
    try {
      const quiz = await quizApi.getQuiz(quizIdToLoad)
      setTitle(quiz.title)
      setDescription(quiz.description || '')
      setQuestionsPerAttempt(quiz.questions_per_attempt)
      setQuestions(quiz.questions || [])
      setSelectedHubId(quiz.hub_id || null)
      setError(null)
    } catch (err) {
      setError('Failed to load quiz')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentQuizId) {
      loadQuiz(currentQuizId)
    }
  }, [currentQuizId, loadQuiz])

  // Update currentQuizId when quizId prop changes
  useEffect(() => {
    setCurrentQuizId(quizId)
  }, [quizId])

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      showAlert('error', 'Quiz title is required')
      return
    }

    // Check all existing questions have at least one correct answer
    for (const q of questions) {
      if (!q.answers || q.answers.length === 0) {
        showAlert('error', `Question "${q.question_text}" has no answers`)
        return
      }
      if (!q.answers.some(a => a.is_correct)) {
        showAlert('error', `Question "${q.question_text}" has no correct answer`)
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      if (currentQuizId) {
        await quizApi.updateQuiz(currentQuizId, {
          title,
          description: description || undefined,
          questions_per_attempt: questionsPerAttempt,
          hubId: selectedHubId ?? null
        })
        onSave(currentQuizId)
        showAlert('success', 'Quiz saved successfully!')
      } else {
        const newQuiz = await quizApi.createQuiz({
          course_id: courseId,
          title,
          description: description || undefined,
          questions_per_attempt: questionsPerAttempt
        })
        
        showAlert('success', 'Quiz created successfully!')
        
        // Auto-add one question with two answers
        try {
          const newQuestion = await quizApi.createQuestion(newQuiz.id, {
            question_text: ' ',
            order_index: 0
          })
          
          // Add 2 empty answer fields
          const answers = []
          for (let j = 0; j < 2; j++) {
            const newAnswer = await quizApi.createAnswer(newQuestion.id, {
              answer_text: ' ',
              is_correct: false,
              order_index: j
            })
            answers.push(newAnswer)
          }
          
          // Set state with the created question and answers
          setTitle(newQuiz.title)
          setDescription(newQuiz.description || '')
          setQuestionsPerAttempt(newQuiz.questions_per_attempt)
          setQuestions([{ ...newQuestion, answers }])
          setSelectedHubId(newQuiz.hub_id || null)
          setCurrentQuizId(newQuiz.id)
          showAlert('info', 'Created 1 question with 2 answer fields')
          onSave(newQuiz.id)
        } catch (err) {
          console.error('Failed to create initial question:', err)
          setCurrentQuizId(newQuiz.id)
          onSave(newQuiz.id)
          showAlert('error', 'Quiz created but failed to add initial question')
        }
        // Don't close - let user edit questions
      }
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      showAlert('error', error.response?.data?.error || 'Failed to save quiz')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddQuestion = async () => {
    if (!currentQuizId) {
      showAlert('error', 'Please save the quiz first before adding questions')
      return
    }

    try {
      const newQuestion = await quizApi.createQuestion(currentQuizId, {
        question_text: ' ',
        order_index: questions.length
      })
      
      // Auto-add 2 answer fields for the new question
      const answers = []
      for (let i = 0; i < 2; i++) {
        const newAnswer = await quizApi.createAnswer(newQuestion.id, {
          answer_text: ' ',
          is_correct: false,
          order_index: i
        })
        answers.push(newAnswer)
      }
      
      setQuestions([...questions, { ...newQuestion, answers }])
      setExpandedQuestion(newQuestion.id)
      setError(null)
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      showAlert('error', error.response?.data?.error || 'Failed to add question')
      console.error(err)
    }
  }

  const handleUpdateQuestion = (questionId: number, question_text: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, question_text } : q
    ))
  }

  const handleSaveQuestion = async (questionId: number, question_text: string) => {
    try {
      await quizApi.updateQuestion(questionId, { question_text })
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Failed to update question')
      console.error(err)
    }
  }

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Delete this question?')) return
    try {
      await quizApi.deleteQuestion(questionId)
      setQuestions(questions.filter(q => q.id !== questionId))
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      showAlert('error', error.response?.data?.error || 'Failed to delete question')
      console.error(err)
    }
  }

  const handleAddAnswer = async (questionId: number) => {
    try {
      const question = questions.find(q => q.id === questionId)
      if (!question) return

      const newAnswer = await quizApi.createAnswer(questionId, {
        answer_text: ' ',
        is_correct: false,
        order_index: question.answers?.length || 0
      })

      setQuestions(questions.map(q =>
        q.id === questionId
          ? { ...q, answers: [...(q.answers || []), newAnswer] }
          : q
      ))
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      showAlert('error', error.response?.data?.error || 'Failed to add answer')
      console.error(err)
    }
  }

  const handleUpdateAnswer = (answerId: number, data: { answer_text?: string, is_correct?: boolean }) => {
    if (!answerId) return
    setQuestions(questions.map(q => ({
      ...q,
      answers: q.answers?.map(a =>
        a.id === answerId ? { ...a, ...data } : a
      )
    })))
  }

  const handleSaveAnswer = async (answerId: number, data: { answer_text?: string, is_correct?: boolean }) => {
    if (!answerId) return
    try {
      await quizApi.updateAnswer(answerId, data)
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Failed to update answer')
      console.error(err)
    }
  }

  const handleDeleteAnswer = async (questionId: number, answerId: number) => {
    if (!confirm('Delete this answer?')) return
    try {
      await quizApi.deleteAnswer(answerId)
      setQuestions(questions.map(q =>
        q.id === questionId
          ? { ...q, answers: q.answers?.filter(a => a.id !== answerId) }
          : q
      ))
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      showAlert('error', error.response?.data?.error || 'Failed to delete answer')
      console.error(err)
    }
  }

  const handleAttachToHub = async (hubId: number | null) => {
    if (!currentQuizId) return
    try {
      if (hubId) {
        // Detach from old hub if switching hubs
        if (selectedHubId && selectedHubId !== hubId) {
          await quizApi.attachQuizToHub(selectedHubId, null)
        }
        // Attach to new hub
        await quizApi.attachQuizToHub(hubId, currentQuizId)
        showAlert('success', 'Quiz attached to hub')
      } else if (selectedHubId) {
        // Detaching from current hub
        await quizApi.attachQuizToHub(selectedHubId, null)
        showAlert('success', 'Quiz detached from hub')
      }
      setSelectedHubId(hubId)
      onSave(currentQuizId) // Refresh quiz list and hubs
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      showAlert('error', error.response?.data?.error || 'Failed to attach quiz')
      console.error(err)
    }
  }

  if (loading) {
    return <div className="p-4">Loading quiz...</div>
  }

  const minQuestions = questionsPerAttempt === 3 ? 10 : 20

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-2 border-b space-y-2 bg-gray-200">
        {availableQuizzes.length > 0 && onSelectQuiz && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-sm font-medium">Select Quiz to Edit</label>
              <button
                onClick={async () => {
                  // Create new quiz
                  setCurrentQuizId(undefined)
                  setTitle('New Quiz')
                  setDescription('')
                  setQuestionsPerAttempt(3)
                  setQuestions([])
                  // Trigger save
                  await handleSaveQuiz()
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm whitespace-nowrap"
              >
                Create Quiz
              </button>
            </div>
            <select
              value={currentQuizId || ''}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : undefined
                if (id) {
                  onSelectQuiz(id)
                }
              }}
              className="w-full border rounded px-3 py-2 bg-white"
            >
              <option value="">- Select -</option>
              {availableQuizzes.map(quiz => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Quiz Metadata */}
        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <div className="flex gap-2 items-end">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 border rounded px-2 py-1 bg-white"
              />
              {currentQuizId && onDeleteQuiz && (
                <button
                  onClick={() => {
                    if (confirm('Delete this quiz? This cannot be undone.')) {
                      onDeleteQuiz(currentQuizId)
                    }
                  }}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm whitespace-nowrap"
                >
                  Delete Quiz
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-2 py-1 bg-white"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Questions Per Attempt *</label>
            <select
              value={questionsPerAttempt}
              onChange={(e) => setQuestionsPerAttempt(parseInt(e.target.value) as 3 | 5)}
              className="border rounded px-2 py-1 bg-white"
            >
              <option value={3}>3 (requires 10+ total questions)</option>
              <option value={5}>5 (requires 20+ total questions)</option>
            </select>
          </div>

          {/* Hub Attachment */}
          {currentQuizId && (
            <div>
              <label className="block text-sm font-medium mb-1">Attach to Hub</label>
              <select
                value={selectedHubId || ''}
                onChange={(e) => handleAttachToHub(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border rounded px-3 py-1 bg-white"
              >
                <option value="">No hub selected</option>
                {hubs.filter(h => !h.quiz_id || h.id === selectedHubId).map(hub => (
                  <option key={hub.id} value={hub.id}>
                    {hub.title}
                  </option>
                ))}
              </select>
              {selectedHubId && (
                <p className="text-xs text-gray-600 mt-1">
                  Students will get {questionsPerAttempt} random questions from this quiz when they complete this hub's tasks.
                </p>
              )}
            </div>
          )}

          <div className={`text-sm ${questions.length < minQuestions ? 'text-orange-600 font-medium' : 'text-green-600'}`}>
            Questions: {questions.length} / {minQuestions} minimum
            {questions.length < minQuestions && !currentQuizId && (
              <span className="text-gray-600 font-normal"> (save quiz first to add questions)</span>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Questions</h3>
            {currentQuizId && (
              <button
                onClick={handleAddQuestion}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <PlusIcon className="w-4 h-4" />
                Add Question
              </button>
            )}
          </div>

          {!currentQuizId && (
            <div className="text-sm text-gray-500 italic">
              Save the quiz first to add questions
            </div>
          )}

          {currentQuizId && questions.length === 0 && (
            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-3">
              <p className="font-medium mb-1">Get started:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Click "+ Add Question" above</li>
                <li>Edit the question text</li>
                <li>Click "Answers" to expand and add answer options</li>
                <li>Click the checkbox to mark correct answers (green = correct, gray = incorrect)</li>
                <li>Add at least 10 questions total (20 for 5-per-attempt quizzes)</li>
              </ol>
            </div>
          )}

          {questions.map((question, index) => (
            <div key={question.id} className="border rounded p-3 space-y-2 bg-white">
              <div className="flex items-start gap-1">
                <span className="font-medium text-gray-600 mt-1">{index + 1}.</span>
                <input
                  type="text"
                  value={question.question_text}
                  onChange={(e) => handleUpdateQuestion(question.id, e.target.value)}
                  onBlur={(e) => handleSaveQuestion(question.id, e.target.value)}
                  className="flex-1 border rounded px-2 py-1"
                  placeholder="Enter your question here"
                />
                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                  className="px-1 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1 transition-transform duration-300"
                >
                  <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${expandedQuestion === question.id ? 'rotate-180' : ''}`} />
                  {expandedQuestion === question.id ? 'Collapse' : 'Answers'}
                </button>
                <button
                  onClick={() => handleDeleteQuestion(question.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Answers */}
              {expandedQuestion === question.id && (
                <div className="ml-8 space-y-2 border-l-2 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Answers</span>
                    <button
                      onClick={() => handleAddAnswer(question.id)}
                      className="flex items-center gap-1 px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <PlusIcon className="w-3 h-3" />
                      Add Answer
                    </button>
                  </div>

                  {question.answers?.map((answer) => (
                    <div key={answer.id} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newValue = !answer.is_correct
                          handleUpdateAnswer(answer.id, { is_correct: newValue })
                          handleSaveAnswer(answer.id, { is_correct: newValue })
                        }}
                        className={`p-1 rounded ${answer.is_correct ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                        title={answer.is_correct ? 'Correct answer' : 'Mark as correct'}
                      >
                        {answer.is_correct ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <XMarkIcon className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="text"
                        value={answer.answer_text || ''}
                        onChange={(e) => handleUpdateAnswer(answer.id, { answer_text: e.target.value })}
                        onBlur={(e) => handleSaveAnswer(answer.id, { answer_text: e.target.value })}
                        className="flex-1 border border-gray-400 rounded px-2 py-1 text-sm"
                        placeholder="Enter answer here"
                      />
                      <button
                        onClick={() => handleDeleteAnswer(question.id, answer.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {(!question.answers || question.answers.length === 0) && (
                    <div className="text-sm text-gray-500 italic">No answers yet</div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add Question button at bottom */}
          {currentQuizId && (
            <button
              onClick={handleAddQuestion}
              className="w-1/4 mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Question
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 border rounded bg-gray-300 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveQuiz}
          disabled={saving}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          {saving ? 'Saving...' : 'Save Quiz'}
        </button>
      </div>
    </div>
  )
}
