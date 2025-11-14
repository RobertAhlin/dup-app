import { useEffect, useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import MainCard from "../components/MainCard";
import CircularProgressBar from "../components/CircularProgressBar";
import type { User } from "../types/user";

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

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await axios.get<{ user: User }>("/api/auth/me", { withCredentials: true });
        setUser(userRes.data.user);
        
        // Fetch appropriate dashboard data based on role
        if (userRes.data.user.role === 'teacher') {
          const statsRes = await axios.get<{ courses: TeacherCourseStats[] }>(
            "/api/courses/dashboard/teacher-stats", 
            { withCredentials: true }
          );
          setTeacherCourses(statsRes.data.courses);
        } else {
          const coursesRes = await axios.get<{ courses: CourseProgress[] }>(
            "/api/courses/dashboard/progress", 
            { withCredentials: true }
          );
          setCourses(coursesRes.data.courses);
        }
      } catch (err: unknown) {
        console.error("❌ Error loading dashboard:", err);
        setError("Not authenticated. Redirecting...");
        setTimeout(() => navigate("/login"), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading || !user) return <p style={{ color: "red" }}>{error || "Loading..."}</p>;

  // Assign colors to each course
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

  // Teacher view
  if (user.role === 'teacher') {
    const sortedTeacherCourses = [...teacherCourses].sort((a, b) => b.stats.averagePercentage - a.stats.averagePercentage);

    return (
      <MainCard name={user.name ?? ''} email={user.email} role={user.role}>
        <div className="p-1">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Course Completion Overview</h2>
          
          {teacherCourses.length === 0 ? (
            <div>
              <p className="text-slate-600">You are not assigned to any courses yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-w-1/6">
              {sortedTeacherCourses.map((course, index) => (
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
      </MainCard>
    );
  }

  // Student view
  const sortedCourses = [...courses].sort((a, b) => b.progress.percentage - a.progress.percentage);

  const coursesWithColors = sortedCourses.map((course, index) => ({
    id: course.id,
    title: course.title,
    icon: course.icon,
    percentage: course.progress.percentage,
    color: colors[index % colors.length],
  }));

  return (
    <MainCard name={user.name ?? ''} email={user.email} role={user.role}>
      <div className="p-2">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">My Courses Progress</h2>
        
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">You are not enrolled in any courses yet.</p>
          </div>
        ) : (
          <div className="flex gap-8 items-start">
            {/* Course list on the left */}
            <div className="w-60 shrink-0">
              <div className="flex flex-col gap-2">
                {sortedCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => navigate(`/course/${course.id}`)}
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
                    <div className="text-right">
                      <p className="text-base font-bold text-slate-800">{course.progress.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Circular progress visualization on the right */}
            <div className="flex-1 flex">
              <CircularProgressBar courses={coursesWithColors} />
            </div>
          </div>
        )}
      </div>
    </MainCard>
  );
};

export default Dashboard;
