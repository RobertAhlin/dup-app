import ProgressBar from './ProgressBar'

type CourseProgressBarProps = {
  percentage: number
  completedItems: number
  totalItems: number
}

export default function CourseProgressBar({ percentage, completedItems, totalItems }: CourseProgressBarProps) {
  return (
    <div className="mt-4">
      <ProgressBar
        percentage={percentage}
        completedItems={completedItems}
        totalItems={totalItems}
      />
    </div>
  )
}
