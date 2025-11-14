import { useNavigate } from "react-router-dom";

type TeacherCourseStats = {
  id: number
  title: string
  icon?: string
  stats: {
    totalStudents: number
    totalTasks: number
    totalHubs: number
    totalItems: number
    totalCompletedItems: number
    averagePercentage: number
  }
}

type Props = {
  courses: TeacherCourseStats[]
}

const colors = [
  '#e91e63', // pink
  '#00bcd4', // cyan
  '#4caf50', // green
  '#ff9800', // orange
  '#9c27b0', // purple
  '#f44336', // red
  '#2196f3', // blue
  '#ffeb3b', // yellow
];

export default function TeacherDashboard({ courses }: Props) {
  const navigate = useNavigate();
  const sortedCourses = [...courses].sort((a, b) => b.stats.averagePercentage - a.stats.averagePercentage);

  return (
    <div className="p-1">
      <h2 className="text-lg font-bold text-slate-800 mb-3">Course Completion Overview</h2>
      
      {courses.length === 0 ? (
        <div>
          <p className="text-slate-600">You are not assigned to any courses yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-1/6">
          {sortedCourses.map((course, index) => (
            <div
              key={course.id}
              className="flex flex-col px-2 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(`/course/${course.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <p className="text-base font-semibold text-slate-800 truncate">{course.title}</p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-1xl font-bold text-slate-800">{course.stats.averagePercentage}%</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500">
                {course.stats.totalStudents} {course.stats.totalStudents === 1 ? 'student' : 'students'} • {course.stats.totalItems} items
              </p>
              
              {/* Progress bar */}
              <div className="w-full mb-2 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${course.stats.averagePercentage}%`,
                    backgroundColor: colors[index % colors.length]
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
