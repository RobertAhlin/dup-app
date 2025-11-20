// frontend/src/api/quizzes.ts

import api from './axios'
import type {
  Quiz,
  QuizWithQuestions,
  QuizQuestion,
  QuizAnswer,
  QuizStartResponse,
  QuizSubmitRequest,
  QuizSubmitResponse
} from '../types/quiz'

// Quiz CRUD
export const getQuizzes = async (params?: {
  courseId?: number
  hubId?: number
  unassigned?: boolean
}) => {
  const response = await api.get<Quiz[]>('/api/quizzes', { params })
  return response.data
}

export const getQuiz = async (quizId: number) => {
  const response = await api.get<{ quiz: QuizWithQuestions }>(`/api/quizzes/${quizId}`)
  return response.data.quiz
}

export const createQuiz = async (data: {
  course_id: number
  hub_id?: number
  title: string
  description?: string
  questions_per_attempt: 3 | 5
}) => {
  const response = await api.post<{ quiz: Quiz }>('/api/quizzes', {
    courseId: data.course_id,
    hubId: data.hub_id,
    title: data.title,
    description: data.description,
    questionsPerAttempt: data.questions_per_attempt
  })
  return response.data.quiz
}

export const updateQuiz = async (quizId: number, data: {
  title?: string
  description?: string
  questions_per_attempt?: 3 | 5
}) => {
  const response = await api.put<Quiz>(`/api/quizzes/${quizId}`, data)
  return response.data
}

export const deleteQuiz = async (quizId: number) => {
  await api.delete(`/api/quizzes/${quizId}`)
}

// Question CRUD
export const createQuestion = async (quizId: number, data: {
  question_text: string
  order_index?: number
}) => {
  const response = await api.post<{ question: QuizQuestion }>(`/api/questions/${quizId}/questions`, {
    questionText: data.question_text,
    orderIndex: data.order_index
  })
  return response.data.question
}

export const updateQuestion = async (questionId: number, data: {
  question_text?: string
  order_index?: number
}) => {
  const response = await api.put<{ question: QuizQuestion }>(`/api/questions/${questionId}`, {
    questionText: data.question_text,
    orderIndex: data.order_index
  })
  return response.data.question
}

export const deleteQuestion = async (questionId: number) => {
  await api.delete(`/api/questions/${questionId}`)
}

// Answer CRUD
export const createAnswer = async (questionId: number, data: {
  answer_text: string
  is_correct: boolean
  order_index?: number
}) => {
  const response = await api.post<{ answer: QuizAnswer }>(`/api/questions/${questionId}/answers`, {
    answerText: data.answer_text,
    isCorrect: data.is_correct,
    orderIndex: data.order_index
  })
  return response.data.answer
}

export const updateAnswer = async (answerId: number, data: {
  answer_text?: string
  is_correct?: boolean
  order_index?: number
}) => {
  const response = await api.put<{ answer: QuizAnswer }>(`/api/questions/answers/${answerId}`, {
    answerText: data.answer_text,
    isCorrect: data.is_correct,
    orderIndex: data.order_index
  })
  return response.data.answer
}

export const deleteAnswer = async (answerId: number) => {
  await api.delete(`/api/questions/answers/${answerId}`)
}

// Hub quiz attachment
export const attachQuizToHub = async (hubId: number, quizId: number | null) => {
  const response = await api.put(`/api/hubs/${hubId}/quiz`, { quizId })
  return response.data
}

// Student quiz operations
export const startQuiz = async (hubId: number) => {
  const response = await api.post<QuizStartResponse>(`/api/student-quiz/hubs/${hubId}/quiz/start`)
  return response.data
}

export const submitQuiz = async (data: QuizSubmitRequest) => {
  const response = await api.post<QuizSubmitResponse>(`/api/student-quiz/quizzes/${data.attemptId}/submit`, {
    answers: data.answers
  })
  return response.data
}
