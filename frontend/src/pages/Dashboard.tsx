import { useEffect, useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import MainCard from "../components/MainCard";
import UserProfileCircle from "../components/UserProfileCircle";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import TeacherDashboard from "../components/dashboard/TeacherDashboard";
import StudentDashboard from "../components/dashboard/StudentDashboard";
import LoadingSpinner from "../components/LoadingSpinner";
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
        } else if (userRes.data.user.role === 'student') {
          const coursesRes = await axios.get<{ courses: CourseProgress[] }>(
            "/api/courses/dashboard/progress", 
            { withCredentials: true }
          );
          setCourses(coursesRes.data.courses);
        }
        // Admin doesn't need to fetch course data since AdminDashboard handles its own data
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

  if (loading || !user) {
    if (error) return <p style={{ color: "red" }}>{error}</p>;
    return <LoadingSpinner size="medium" />;
  }

  // Calculate average percentage for all roles
  let avgPercent = 0;
  if (courses.length > 0) {
    avgPercent = Math.round(
      courses.reduce((sum, c) => sum + (c.progress?.percentage ?? 0), 0) / courses.length
    );
  }

  return (
    <MainCard
      name={user.name ?? ''}
      email={user.email}
      role={user.role}
      headerElement={<UserProfileCircle percentage={avgPercent} size={100} role={user.role} />}
    >
      {user.role === 'admin' ? (
        <AdminDashboard />
      ) : user.role === 'teacher' ? (
        <TeacherDashboard courses={teacherCourses} />
      ) : (
        <StudentDashboard courses={courses} />
      )}
    </MainCard>
  );
};

export default Dashboard;
