import { UserIcon } from '@heroicons/react/24/solid';

interface UserProfileCircleProps {
  percentage: number;
  size?: number;
  role?: string;
}

const UserProfileCircle: React.FC<UserProfileCircleProps> = ({ percentage, size = 100, role = 'student' }) => {
  const barCount = 36;
  const radius = size / 2 - 8;
  const angle = 360 / barCount;
  const progressBars = Math.round((Math.max(0, Math.min(percentage, 100)) / 100) * barCount);
  
  // Determine colors based on role
  const isTeacherOrAdmin = role?.toLowerCase() === 'teacher' || role?.toLowerCase() === 'admin';
  const completedColor = isTeacherOrAdmin ? '#2563eb' : '#22c55e'; // blue for teachers/admins, green for students
  const incompleteColor = isTeacherOrAdmin ? '#2563eb' : '#bf3030'; // same blue for teachers/admins, red for students

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        {Array.from({ length: barCount }).map((_, i) => {
          const isComplete = i < progressBars;
          return (
            <rect
              key={i}
              x={size / 2 - 2}
              y={size / 2 - radius}
              width={4}
              height={size * 0.18}
              rx={2}
              fill={isComplete ? completedColor : incompleteColor}
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

export default UserProfileCircle;
