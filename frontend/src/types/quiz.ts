// frontend/src/types/quiz.ts

export interface Quiz {
  id: number
  course_id: number
  hub_id: number | null
  title: string
  description: string | null
  questions_per_attempt: 3 | 5
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  id: number
  quiz_id: number
  question_text: string
  order_index: number
  created_at: string
  answers?: QuizAnswer[]
}

export interface QuizAnswer {
  id: number
  question_id: number
  answer_text: string
  is_correct: boolean
  order_index: number
  created_at: string
}

export interface QuizAttempt {
  id: number
  quiz_id: number
  user_id: number
  hub_id: number
  started_at: string
  submitted_at: string | null
  questions_shown: number[]
  answers_submitted: Record<number, number[]>
  passed: boolean | null
  score: number | null
}

export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[]
}

// For quiz start response
export interface QuizStartResponse {
  attemptId: number
  quizId: number
  hubId: number
  questions: {
    id: number
    question_text: string
    answers: {
      id: number
      answer_text: string
    }[]
  }[]
}

// For quiz submit request
export interface QuizSubmitRequest {
  attemptId: number
  answers: Record<number, number[]> // questionId -> answerIds[]
}

// For quiz submit response
export interface QuizSubmitResponse {
  passed: boolean
  score: number
  correctCount?: number
  totalQuestions?: number
}
