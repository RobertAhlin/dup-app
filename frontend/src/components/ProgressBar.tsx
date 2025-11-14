import { memo } from 'react'

type Props = {
  percentage: number
  completedItems: number
  totalItems: number
  className?: string
}

function ProgressBar({ percentage, completedItems, totalItems, className = '' }: Props) {
  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full bg-slate-800 rounded-full h-8 overflow-hidden shadow-lg border border-slate-700">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
        
        {/* Progress fill with diagonal stripes */}
        <div
          className="relative h-full bg-linear-to-r from-violet-800 via-green-500 to-lime-400 transition-all duration-700 ease-out"
          style={{ 
            width: `${percentage}%`,
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)',
            clipPath: percentage > 0 ? 'polygon(0 0, calc(100% - 25px) 0, 100% 100%, 0 100%)' : 'none'
          }}
        >
          {/* Static diagonal stripes */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)'
            }}
          />
          
          {/* Glossy overlay */}
          <div className="absolute inset-0 bg-linear-to-b from-white/20 via-transparent to-black/10" />
        </div>
        
        {/* Text overlay - always visible */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <span className="text-sm font-bold text-white drop-shadow-lg tracking-wider">
            COURSE PROGRESS AT {percentage}%
          </span>
          <span className="text-sm font-medium text-white drop-shadow-lg">
            {completedItems} / {totalItems} completed
          </span>
        </div>
        
        {/* Convex glass effect overlay */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 50%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.3) 100%)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 0 10px rgba(0,0,0,0.2)'
          }}
        />
      </div>
    </div>
  )
}

export default memo(ProgressBar)
