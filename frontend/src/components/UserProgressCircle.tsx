import { UserIcon } from '@heroicons/react/24/solid';

interface UserProgressCircleProps {
  percentage: number;
  size?: number;
}

export default function UserProgressCircle({ percentage, size = 80 }: UserProgressCircleProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(percentage, 100));
  const greenLength = (progress / 100) * circumference;
  const redLength = circumference - greenLength;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Red background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth}
        />
        {/* Green progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          strokeDasharray={`${greenLength} ${redLength}`}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
      </svg>
      {/* User icon in center */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: '50%',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <UserIcon style={{ width: '60%', height: '60%', color: '#64748b' }} />
      </div>
      {/* Percentage text below removed as requested */}
    </div>
  );
}
