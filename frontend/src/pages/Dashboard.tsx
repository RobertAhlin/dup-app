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

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, coursesRes] = await Promise.all([
          axios.get<{ user: User }>("/api/auth/me", { withCredentials: true }),
          axios.get<{ courses: CourseProgress[] }>("/api/courses/dashboard/progress", { withCredentials: true })
        ]);
        setUser(userRes.data.user);
        setCourses(coursesRes.data.courses);
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

  // Sort courses by percentage (highest to lowest) for display in rings
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
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">My Courses Progress</h2>
        
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">You are not enrolled in any courses yet.</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <CircularProgressBar courses={coursesWithColors} />
          </div>
        )}

        {/* Course list below */}
        {courses.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Enrolled Courses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedCourses.map((course, index) => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <div 
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{course.title}</p>
                    <p className="text-sm text-slate-500">
                      {course.progress.completedItems} / {course.progress.totalItems} completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-800">{course.progress.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainCard>
  );
};

export default Dashboard;
