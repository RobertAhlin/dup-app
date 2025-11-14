import { memo } from 'react'
import * as HeroIcons from '@heroicons/react/24/outline'

type Props = {
  percentage: number
  title: string
  icon?: string
  size?: number
  strokeWidth?: number
  className?: string
}

function CircularProgressBar({ 
  percentage, 
  title, 
  icon,
  size = 120, 
  strokeWidth = 12,
  className = '' 
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  // Get the icon component dynamically
  const IconComponent = icon 
    ? (HeroIcons as Record<string, React.ComponentType<{ className?: string }>>)[icon.split('-').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('') + 'Icon'] 
    : null

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))'
            }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {IconComponent && (
            <IconComponent className="w-8 h-8 text-slate-600 mb-1" />
          )}
          <span className="text-xl font-bold text-slate-800">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Course title */}
      <div className="mt-3 text-center">
        <p className="text-sm font-semibold text-slate-700 line-clamp-2 max-w-[140px]">
          {title}
        </p>
      </div>
    </div>
  )
}

export default memo(CircularProgressBar)
