import { UserIcon } from '@heroicons/react/24/solid';

interface UserProgressCircleProps {
  percentage: number;
  size?: number;
}

const UserProgressCircle: React.FC<UserProgressCircleProps> = ({ percentage, size = 100 }) => {
  const barCount = 36;
  const radius = size / 2 - 8;
  const angle = 360 / barCount;
  const progressBars = Math.round((Math.max(0, Math.min(percentage, 100)) / 100) * barCount);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        {Array.from({ length: barCount }).map((_, i) => {
          const isGreen = i < progressBars;
          return (
            <rect
              key={i}
              x={size / 2 - 2}
              y={size / 2 - radius}
              width={4}
              height={size * 0.18}
              rx={2}
              fill={isGreen ? '#22c55e' : '#bf3030'}
              transform={`rotate(${angle * i} ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>
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
        }}
      >
        <UserIcon style={{ width: '60%', height: '60%', color: '#64748b' }} />
      </div>
    </div>
  );
};

export default UserProgressCircle;
