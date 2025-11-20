import { useState } from 'react'
import type { QuizQuestion } from './QuizEditor'

function getRandomQuestions(questions: QuizQuestion[], count: number) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

type Props = {
  questions: QuizQuestion[]
  onSubmit?: (answers: number[]) => void
}

export default function QuizRunner({ questions, onSubmit }: Props) {
  const [selected, setSelected] = useState<number[][]>(questions.map(() => []))
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number|null>(null)

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
    setScore(correct)
    if (onSubmit) onSubmit(selected.flat())
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={i} className="border rounded p-3">
          <div className="font-medium">Q{i + 1}. {q.question}</div>
          <ul className="list-none pl-0 mt-2">
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
      {!submitted ? (
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleSubmit}
          disabled={selected.some(s => s.length === 0)}
        >Submit Quiz</button>
      ) : (
        <div className="text-lg font-bold text-green-700">Score: {score} / {questions.length}</div>
      )}
    </div>
  )
}
