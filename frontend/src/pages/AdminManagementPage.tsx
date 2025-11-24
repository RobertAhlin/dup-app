import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import FloatingSelect from '../components/FloatingSelect';
import axios from '../api/axios';
import type { User } from '../types/user';
import MainCard from '../components/MainCard';
import UserProfileCircle from '../components/UserProfileCircle';
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

  if (loading) return <LoadingSpinner size="large" />;
  if (!me) return null;

  // For now, just show a static blue progress circle for admin (can be replaced with real stats)
  const avgPercent = 100; // Or fetch/compute real admin stats if available

  return (
    <MainCard
      name={me.name ?? ''}
      email={me.email}
      role={me.role}
      title="Admin:"
      chip={{ label: 'Dashboard', to: '/dashboard' }}
      hideSidebar={false}
      sidebar={<AdminSidebar active={tab} onChange={setTab} />}
      headerElement={<UserProfileCircle percentage={avgPercent} size={100} role={me.role} />}
    >
      <div className="p-4 md:p-6 overflow-hidden w-full max-w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Admin • {tab === 'users' ? 'Users' : tab === 'courses' ? 'Courses' : 'Enrollments'}
          </h2>
          {tab === 'users' && (
            <div className="w-20">
              <FloatingSelect
                id="users-per-page"
                label="Show"
                value={String(usersPerPageHeader)}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setUsersPerPageHeader(value);
                }}
                options={[
                  { value: '10', label: '10' },
                  { value: '25', label: '25' },
                  { value: '100', label: '100' },
                  { value: '-1', label: 'All' },
                ]}
              />
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
