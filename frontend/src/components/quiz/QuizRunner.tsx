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
  const [selected, setSelected] = useState<(number|null)[]>(Array(questions.length).fill(null))
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number|null>(null)

  const handleSelect = (qi: number, oi: number) => {
    if (submitted) return
    const next = [...selected]
    next[qi] = oi
    setSelected(next)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const correct = questions.reduce((acc, q, i) => acc + (selected[i] === q.correctIndex ? 1 : 0), 0)
    setScore(correct)
    if (onSubmit) onSubmit(selected as number[])
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
                    type="radio"
                    name={`q${i}`}
                    checked={selected[i] === oi}
                    disabled={submitted}
                    onChange={() => handleSelect(i, oi)}
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
          disabled={selected.some(s => s === null)}
        >Submit Quiz</button>
      ) : (
        <div className="text-lg font-bold text-green-700">Score: {score} / {questions.length}</div>
      )}
    </div>
  )
}
