//src/components/dashboard/StudentDashboard.tsx

import CircularProgressBar from "../CircularProgressBar";
import StudentActivityNotification from "./StudentActivityNotification";

type CourseProgress = {
  id: number
  title: string
  icon?: string
  progress: {
    totalTasks: number
    totalHubs: number
    completedTasks: number
    completedHubs: number
    totalItems: number
    completedItems: number
    percentage: number
  }
}

type Props = {
  courses: CourseProgress[]
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

export default function StudentDashboard({ courses }: Props) {

  const sortedCourses = [...courses].sort((a, b) => b.progress.percentage - a.progress.percentage);

  const coursesWithColors = sortedCourses.map((course, index) => ({
    id: course.id,
    title: course.title,
    icon: course.icon,
    percentage: course.progress.percentage,
    color: colors[index % colors.length],
  }));

  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">My Courses Progress</h2>
      
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600">You are not enrolled in any courses yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-start">
            {/* Circular progress visualization on the left */}
            <div className="flex-none">
              <CircularProgressBar courses={coursesWithColors} />
            </div>

            {/* Course list on the right */}
            <div className="w-60 shrink-0 ml-2">
              <div className="flex flex-col gap-2">
                {sortedCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 transition-all"
                  >
                    <div 
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{course.title}</p>
                      <p className="text-xs text-slate-500">
                        {course.progress.completedItems} / {course.progress.totalItems} completed
                      </p>
                    </div>
                    {/* Removed percentage value */}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Activity Notification (toast-style) */}
          <StudentActivityNotification />
        </div>
      )}
    </div>
  );
}
