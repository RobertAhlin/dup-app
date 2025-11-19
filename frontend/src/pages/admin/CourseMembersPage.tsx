import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { listCourses } from '../../api/courses';
import { getCourseMembers, addCourseMember, removeCourseMember, getUsersForCourse } from '../../api/courseMembers';
import type { Course } from '../../types/course';
import type { CourseMember, AvailableUser } from '../../types/courseMember';
import type { User } from '../../types/user';
import LoadingSpinner from '../../components/LoadingSpinner';
import CourseSelector from '../../components/CourseSelector';
import CourseMembersList from '../../components/CourseMembersList';
import AddCourseMembersPanel from '../../components/AddCourseMembersPanel';
import AdminSidebar from '../../components/AdminSidebar';
import { useAlert } from '../../contexts/useAlert';

export default function CourseMembersPage() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  
  const [members, setMembers] = useState<CourseMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberFilters, setMemberFilters] = useState<{ role: string[]; search: string }>({
    role: ['teacher', 'student'],
    search: '',
  });
  
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilters, setUserFilters] = useState<{ role: string[]; search: string }>({
    role: ['teacher', 'student'],
    search: '',
  });

  // Check authentication and authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get<{ user: User }>('/api/auth/me');
        const user = res.data.user;
        if ((user.role || '').toLowerCase() !== 'admin') {
          navigate('/dashboard');
          return;
        }
        
        // Load courses
        const courseList = await listCourses();
        setCourses(courseList);
        
        // Select first course if available
        if (courseList.length > 0) {
          setSelectedCourseId(courseList[0].id);
        }
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  // Load members when course or filters change
  const loadMembers = useCallback(async () => {
    if (!selectedCourseId) return;
    
    setMembersLoading(true);
    try {
      const data = await getCourseMembers(selectedCourseId, memberFilters);
      setMembers(data);
    } catch (error) {
      showAlert('error', 'Failed to load course members');
      console.error('Load members error:', error);
    } finally {
      setMembersLoading(false);
    }
  }, [selectedCourseId, memberFilters, showAlert]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Load available users when course or filters change
  const loadAvailableUsers = useCallback(async () => {
    if (!selectedCourseId) return;
    
    setUsersLoading(true);
    try {
      const data = await getUsersForCourse(selectedCourseId, userFilters);
      setAvailableUsers(data);
    } catch (error) {
      showAlert('error', 'Failed to load available users');
      console.error('Load available users error:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [selectedCourseId, userFilters, showAlert]);

  useEffect(() => {
    loadAvailableUsers();
  }, [loadAvailableUsers]);

  const handleCourseChange = (courseId: number) => {
    setSelectedCourseId(courseId);
  };

  const handleAddMember = async (userId: number, roleInCourse: 'teacher' | 'student', userName: string) => {
    if (!selectedCourseId) return;
    
    try {
      await addCourseMember(selectedCourseId, userId, roleInCourse);
      showAlert('success', `${userName} added as ${roleInCourse}`);
      
      // Refresh both lists
      await Promise.all([loadMembers(), loadAvailableUsers()]);
    } catch (error) {
      showAlert('error', 'Failed to add member');
      console.error('Add member error:', error);
    }
  };

  const handleRemoveMember = async (userId: number, userName: string) => {
    if (!selectedCourseId) return;
    
    try {
      await removeCourseMember(selectedCourseId, userId);
      showAlert('info', `${userName} removed from course`);
      
      // Refresh both lists
      await Promise.all([loadMembers(), loadAvailableUsers()]);
    } catch (error) {
      showAlert('error', 'Failed to remove member');
      console.error('Remove member error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Course Enrollment Management</h1>
            <p className="text-slate-600 mt-2">Manage which users belong to each course</p>
          </div>

          <CourseSelector
            courses={courses}
            selectedCourseId={selectedCourseId}
            onChange={handleCourseChange}
          />

          {selectedCourseId ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-300px)]">
              {/* Left: Current Members */}
              <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
                <CourseMembersList
                  members={members}
                  loading={membersLoading}
                  onRemove={handleRemoveMember}
                  onFilterChange={setMemberFilters}
                />
              </div>

              {/* Right: Add Members */}
              <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
                <AddCourseMembersPanel
                  users={availableUsers}
                  loading={usersLoading}
                  onAdd={handleAddMember}
                  onFilterChange={setUserFilters}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-slate-500 text-lg">Please select a course to manage its members</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
