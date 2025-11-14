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

  return (
    <MainCard name={user.name ?? ''} email={user.email} role={user.role}>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">My Courses</h2>
        
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">You are not enrolled in any courses yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
            {courses.map((course) => (
              <div 
                key={course.id}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <CircularProgressBar
                  percentage={course.progress.percentage}
                  title={course.title}
                  icon={course.icon}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </MainCard>
  );
};

export default Dashboard;
