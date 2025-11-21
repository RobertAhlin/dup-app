import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from '../api/axios';
import type { User } from '../types/user';
import MainCard from '../components/MainCard';
import AdminSidebar from '../components/AdminSidebar';
import UsersManagementPage from './admin/UsersManagementPage';
import EnrollmentsMembersPage from './admin/EnrollmentsMembersPage';
import CourseManagementPage from './admin/CourseManagementPage';

export default function AdminDashboard() {
  const [me, setMe] = useState<User | null>(null);
  const [tab, setTab] = useState<'users' | 'courses' | 'enrollments'>('users');
  const [loading, setLoading] = useState(true);
  const [usersPerPageHeader, setUsersPerPageHeader] = useState<number>(10);
  const [enrollmentsInitialCourseId, setEnrollmentsInitialCourseId] = useState<number | null>(null);
  const navigate = useNavigate();

  // Access control
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get<{ user: User }>('/api/auth/me', { withCredentials: true });
        const user = res.data.user;
        setMe(user);
        if ((user.role || '').toLowerCase() !== 'admin') {
          navigate('/dashboard');
          return;
        }
      } catch {
        navigate('/login');
        return;
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) return <LoadingSpinner size="medium" />;
  if (!me) return null;

  return (
    <MainCard
      name={me.name ?? ''}
      email={me.email}
      role={me.role}
      title="Admin:"
      chip={{ label: 'Dashboard', to: '/dashboard' }}
      hideSidebar={false}
      sidebar={<AdminSidebar active={tab} onChange={setTab} />}
    >
      <div className="p-4 md:p-6 overflow-hidden w-full max-w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Admin • {tab === 'users' ? 'Users' : tab === 'courses' ? 'Courses' : 'Enrollments'}
          </h2>
          {tab === 'users' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Show:</label>
              <select 
                className="border rounded-lg px-3 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                value={usersPerPageHeader}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setUsersPerPageHeader(value);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
            </div>
          )}
        </div>

        {tab === 'users' && (
          <UsersManagementPage usersPerPage={usersPerPageHeader} />
        )}

        {tab === 'courses' && (
          <CourseManagementPage
            onCourseClick={(courseId) => {
              setEnrollmentsInitialCourseId(courseId);
              setTab('enrollments');
            }}
          />
        )}

        {tab === 'enrollments' && (
          <EnrollmentsMembersPage initialCourseId={enrollmentsInitialCourseId ?? undefined} />
        )}
      </div>
    </MainCard>
  );
}
