import { useState, useEffect } from 'react'
import type { QuizQuestion } from './QuizEditor'
import { useAlert } from '../../contexts/useAlert'

type Props = {
  questions: QuizQuestion[]
  onSubmit?: (answers: number[]) => void
  onPass?: () => void
}

export default function QuizRunner({ questions, onSubmit, onPass }: Props) {
  const { showAlert } = useAlert()
  const [selected, setSelected] = useState<number[][]>(questions.map(() => []))
  const [submitted, setSubmitted] = useState(false)
  const [key, setKey] = useState(0)

  // Reset selections when questions change
  useEffect(() => {
    setSelected(questions.map(() => []))
    setSubmitted(false)
  }, [key, questions])

  const handleToggle = (qi: number, oi: number) => {
    if (submitted) return
    const next = [...selected]
    const qAnswers = [...next[qi]]
    const idx = qAnswers.indexOf(oi)
    if (idx >= 0) {
      qAnswers.splice(idx, 1)
    } else {
      qAnswers.push(oi)
    }
    next[qi] = qAnswers
    setSelected(next)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const correct = questions.reduce((acc, q, i) => {
      const userAnswers = selected[i].sort((a: number, b: number) => a - b)
      const correctAnswers = (q.correctIndices || []).sort((a: number, b: number) => a - b)
      const isCorrect = userAnswers.length === correctAnswers.length && 
                        userAnswers.every((ans, idx) => ans === correctAnswers[idx])
      return acc + (isCorrect ? 1 : 0)
    }, 0)
    if (onSubmit) onSubmit(selected.flat())

    // Show result and reload if failed
    const passed = correct === questions.length
    if (passed) {
      showAlert('success', `Quiz passed! Score: ${correct}/${questions.length}`)
      if (onPass) onPass()
    } else {
      showAlert('error', `Quiz failed. Score: ${correct}/${questions.length}. Loading new questions...`)
      // Auto-reload with new questions after a brief delay
      setTimeout(() => {
        setKey(prev => prev + 1)
      }, 2500)
    }
  }

  return (
    <div className="space-y-1">
      {questions.map((q, i) => (
        <div key={i} className="border rounded py-1 px-2">
          <div className="font-medium">{i + 1}. {q.question}</div>
          <ul className="list-none pl-0 mt-1">
            {(Array.isArray(q.options) ? q.options : []).map((opt, oi) => (
              <li key={oi}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected[i].includes(oi)}
                    disabled={submitted}
                    onChange={() => handleToggle(i, oi)}
                  />
                  <span>{opt}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button
        className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleSubmit}
        disabled={selected.some(s => s.length === 0) || submitted}
      >{submitted ? 'Submitted...' : 'Submit Quiz'}</button>
    </div>
  )
}
