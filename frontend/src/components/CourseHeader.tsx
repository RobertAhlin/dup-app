import CourseLockToggle from './CourseLockToggle'
import ManageQuizzesButton from './ManageQuizzesButton'
import ModeSwitcher from './ModeSwitcher'

type CourseHeaderProps = {
  courseTitle: string
  courseDescription?: string
  isTeacher: boolean
  isLocked: boolean
  onToggleLock: () => void
  isTogglingLock: boolean
  onManageQuizzes: () => void
  mode: 'student' | 'edit'
  onModeChange: (mode: 'student' | 'edit') => void
}

export default function CourseHeader({
  courseTitle,
  courseDescription,
  isTeacher,
  isLocked,
  onToggleLock,
  isTogglingLock,
  onManageQuizzes,
  mode,
  onModeChange,
}: CourseHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div>
        <h2 className="text-xl font-semibold">{courseTitle}</h2>
        {courseDescription && (
          <p className="text-sm text-slate-500 max-w-xl">{courseDescription}</p>
        )}
      </div>
      {isTeacher && (
        <>
          <CourseLockToggle
            isLocked={isLocked}
            onToggle={onToggleLock}
            loading={isTogglingLock}
          />
          <ManageQuizzesButton onClick={onManageQuizzes} />
          <ModeSwitcher mode={mode} onChange={onModeChange} />
        </>
      )}
    </div>
  )
}
