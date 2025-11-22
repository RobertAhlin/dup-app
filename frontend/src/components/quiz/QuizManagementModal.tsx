import { useCallback, useEffect, useState } from 'react'
import type { Quiz } from '../../types/quiz'
import QuizBuilder from './QuizBuilder'
import { getQuizzes, deleteQuiz as apiDeleteQuiz } from '../../api/quizzes'
import { useAlert } from '../../contexts/useAlert'

type HubMinimal = { id: number; title: string; quiz_id?: number }

interface Props {
	open: boolean
	onClose: () => void
	courseId: number
	selectedQuizId?: number
	onSelectQuiz: (id?: number) => void
	onSave: (newQuizId?: number) => Promise<void>
	hubs: HubMinimal[]
	onQuizzesChanged?: (quizzes: Quiz[]) => void
}

export default function QuizManagementModal({
	open,
	onClose,
	courseId,
	selectedQuizId,
	onSelectQuiz,
	onSave,
	hubs,
	onQuizzesChanged,
}: Props) {
	const { showAlert } = useAlert()
	const [quizzes, setQuizzes] = useState<Quiz[]>([])
	const [loadingQuizzes, setLoadingQuizzes] = useState(false)

	const load = useCallback(async () => {
		setLoadingQuizzes(true)
		try {
			const data = await getQuizzes({ courseId })
			setQuizzes(data)
			onQuizzesChanged?.(data)
		} catch (err) {
			console.error('Failed to load quizzes', err)
			showAlert('error', 'Failed to load quizzes')
			setQuizzes([])
		} finally {
			setLoadingQuizzes(false)
		}
	}, [courseId, onQuizzesChanged, showAlert])

	useEffect(() => {
		if (open) load()
	}, [open, load])

	const handleDelete = useCallback(async (quizId: number) => {
		try {
			await apiDeleteQuiz(quizId)
			await load()
			onSelectQuiz(undefined)
		} catch (err) {
			console.error('Failed to delete quiz', err)
			showAlert('error', 'Failed to delete quiz')
		}
	}, [load, onSelectQuiz, showAlert])

	if (!open) return null

	return (
		<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
			<div className="bg-dup-light-green rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-xl font-bold">Quiz Management</h2>
					<button
						onClick={onClose}
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
									onClick={() => onSelectQuiz(0)}
									className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
								>
									Create New Quiz
								</button>
							</div>
							<div className="space-y-1">
								{loadingQuizzes ? (
									<p className="text-gray-500 text-sm">Loading quizzes...</p>
								) : !quizzes || quizzes.length === 0 ? (
									<p className="text-gray-500 text-sm bg-white rounded-sm p-2">No quizzes for this course created yet. Create one to get started.</p>
								) : (
									quizzes.map(quiz => (
										<div
											key={quiz.id}
											className="border rounded px-2 py-1 bg-white flex justify-between items-center hover:bg-gray-50 cursor-pointer"
											onClick={() => onSelectQuiz(quiz.id)}
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
							hubs={hubs.map(h => ({ id: h.id, title: h.title, quiz_id: h.quiz_id }))}
							onSelectQuiz={(quizId) => onSelectQuiz(quizId)}
							onDeleteQuiz={handleDelete}
							onClose={() => onSelectQuiz(undefined)}
							onSave={async (newQuizId) => {
								await onSave(newQuizId)
								await load()
								onQuizzesChanged?.(quizzes)
							}}
						/>
					)}
				</div>
			</div>
		</div>
	)
}

