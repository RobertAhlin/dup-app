import { useState } from 'react'

export type QuizQuestion = {
  question: string
  options: string[]
  correctIndex: number
}

type Props = {
  value?: QuizQuestion[]
  onChange: (q: QuizQuestion[]) => void
  readOnly?: boolean
}

export default function QuizEditor({ value, onChange, readOnly }: Props) {
  const [local, setLocal] = useState<QuizQuestion[]>(value ?? [])

  const pushChange = (next: QuizQuestion[]) => {
    setLocal(next)
    onChange(next)
  }

  if (readOnly) {
    return (
      <div className="space-y-3">
        {local.length === 0 && <div className="text-sm text-slate-500">No quiz</div>}
        {local.map((q, i) => (
          <div key={i} className="border rounded p-3">
            <div className="font-medium">Q{i + 1}. {q.question}</div>
            <ul className="list-disc pl-5 mt-2">
              {q.options.map((opt, oi) => (
                <li key={oi} className={oi === q.correctIndex ? 'text-green-700' : ''}>{opt}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button type="button" className="px-2 py-1 border rounded" onClick={() => pushChange([...local, { question: '', options: ['',''], correctIndex: 0 }])}>+ Add question</button>
      {local.map((q, qi) => (
        <div key={qi} className="border rounded p-3 space-y-2">
          <input className="w-full border rounded px-2 py-1" placeholder="Question" value={q.question} onChange={(e) => {
            const next = [...local]; next[qi] = { ...q, question: e.target.value }; pushChange(next)
          }} />
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input type="radio" name={`q-${qi}`} checked={q.correctIndex === oi} onChange={() => { const next=[...local]; next[qi]={...q, correctIndex: oi}; pushChange(next) }} />
              <input className="flex-1 border rounded px-2 py-1" placeholder={`Option ${oi+1}`} value={opt} onChange={(e) => { const next=[...local]; const opts=[...q.options]; opts[oi]=e.target.value; next[qi]={...q, options: opts}; pushChange(next) }} />
              <button type="button" className="px-2 py-1 border rounded" onClick={() => { const next=[...local]; const opts=[...q.options]; opts.splice(oi,1); next[qi]={...q, options: opts.length?opts:['','']}; pushChange(next) }}>Delete</button>
            </div>
          ))}
          <button type="button" className="px-2 py-1 border rounded" onClick={() => { const next=[...local]; const opts=[...q.options, '']; next[qi]={...q, options: opts}; pushChange(next) }}>+ Add option</button>
          <div>
            <button type="button" className="text-red-600 text-xs" onClick={() => { const next=[...local]; next.splice(qi,1); pushChange(next) }}>Remove question</button>
          </div>
        </div>
      ))}
    </div>
  )
}
