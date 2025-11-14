import { memo } from 'react'
import * as HeroIcons from '@heroicons/react/24/outline'

type CourseProgress = {
  id: number
  title: string
  icon?: string
  percentage: number
  color: string
}

type Props = {
  courses: CourseProgress[]
  size?: number
  className?: string
}

function CircularProgressBar({ 
  courses, 
  size = 400, 
  className = '' 
}: Props) {
  const strokeWidth = 25
  const spacing = 8
  const centerX = size / 2
  const centerY = size / 2

  // Filter out completed courses (100%)
  const incompleteCourses = courses.filter(course => course.percentage < 100)

  // Calculate radii for concentric circles, working from outside to inside
  const getRadius = (index: number) => {
    return (size / 2) - strokeWidth / 2 - (index * (strokeWidth + spacing))
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            {incompleteCourses.map((course, index) => (
              <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={course.color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={course.color} stopOpacity="1" />
              </linearGradient>
            ))}
          </defs>

          {incompleteCourses.map((course, index) => {
            const radius = getRadius(index)
            const circumference = 2 * Math.PI * radius
            const offset = circumference - (course.percentage / 100) * circumference

            return (
              <g key={course.id}>
                {/* Background circle */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  fill="none"
                  stroke={`url(#gradient-${index})`}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                  style={{
                    filter: `drop-shadow(0 0 6px ${course.color}40)`
                  }}
                />
              </g>
            )
          })}
        </svg>

        {/* Overlay icons and percentages for each ring */}
        {incompleteCourses.map((course, index) => {
          const radius = getRadius(index)
          
          // Center of icon position at the top
          const iconCenterAngle = -90
          const iconRadians = (iconCenterAngle * Math.PI) / 180
          const iconX = centerX + radius * Math.cos(iconRadians)
          const iconY = centerY + radius * Math.sin(iconRadians)

          // Position percentage at the end of progress
          const endAngle = (course.percentage / 100) * 360 - 90
          const endRadians = (endAngle * Math.PI) / 180
          const percentX = centerX + radius * Math.cos(endRadians)
          const percentY = centerY + radius * Math.sin(endRadians)

          const IconComponent = course.icon 
            ? (HeroIcons as Record<string, React.ComponentType<{ className?: string }>>)[
                course.icon.split('-').map((word: string) => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join('') + 'Icon'
              ] 
            : null

          return (
            <div key={`label-${course.id}`}>
              {/* Icon positioned on the ring */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${iconX}px`,
                  top: `${iconY}px`,
                }}
              >
                <div 
                  className="flex items-center justify-center rounded-full shadow-lg"
                  style={{
                    width: `${strokeWidth}px`,
                    height: `${strokeWidth}px`,
                    backgroundColor: course.color,
                  }}
                >
                  {IconComponent && (
                    <IconComponent className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>

              {/* Percentage at end */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${percentX}px`,
                  top: `${percentY}px`,
                }}
              >
                <div className="flex items-center justify-center bg-white rounded-full px-2 py-1 shadow-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-800">
                    {course.percentage}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Progress
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {incompleteCourses.length} {incompleteCourses.length === 1 ? 'Course' : 'Courses'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(CircularProgressBar)
