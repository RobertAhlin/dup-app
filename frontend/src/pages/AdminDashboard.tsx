import { useEffect, useState, lazy, Suspense, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from '../api/axios';
import { listUsers, createUser, updateUser, deleteUser } from '../api/users';
import { listRoles } from '../api/roles';
import type { Role } from '../types/role';
import type { User } from '../types/user';
import MainCard from '../components/MainCard';
import AdminSidebar from '../components/AdminSidebar';
import type { Course } from '../types/course';
import { listCourses, createCourse, updateCourse, deleteCourse } from '../api/courses';
import { getCourseMembers, addCourseMember, removeCourseMember, getUsersForCourse } from '../api/courseMembers';
import type { CourseMember, AvailableUser } from '../types/courseMember';
import CourseSelector from '../components/CourseSelector';
import CourseMembersList from '../components/CourseMembersList';
import AddCourseMembersPanel from '../components/AddCourseMembersPanel';
import { useAlert } from '../contexts/useAlert';
import * as OutlineIcons from '@heroicons/react/24/outline';
const IconPicker = lazy(() => import('../components/IconPicker'));

export default function AdminDashboard() {
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tab, setTab] = useState<'users' | 'courses' | 'enrollments'>('users');
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseForm, setCourseForm] = useState<{ title: string; description: string; icon: string }>({ title: '', description: '', icon: '' });
  const [courseEditing, setCourseEditing] = useState<null | number>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  // Enrollments state
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

  const iconClass = 'h-5 w-5';
  const IconsMap = OutlineIcons as unknown as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>;
  const iconFromString = (key?: string | null) => {
    const kebab = (key || '').toLowerCase();
    const pascal = kebab
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join('') + 'Icon';
    const Fallback = IconsMap['ExclamationTriangleIcon'];
    const Comp = IconsMap[pascal] || Fallback;
    return <Comp className={iconClass} />;
  };

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
  const [list, roleList] = await Promise.all([listUsers(), listRoles()]);
  setUsers(list);
  setRoles(roleList);
      } catch {
        navigate('/login');
        return;
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  // When switching to courses tab and no data yet, load courses
  useEffect(() => {
    const load = async () => {
      if (tab === 'courses' && courses.length === 0) {
        try {
          const list = await listCourses();
          setCourses(list);
        } catch {
          setError('Failed to load courses');
        }
      }
      if (tab === 'enrollments' && courses.length === 0) {
        try {
          const list = await listCourses();
          setCourses(list);
          if (list.length > 0) {
            setSelectedCourseId(list[0].id);
          }
        } catch {
          setError('Failed to load courses');
        }
      }
    };
    load();
  }, [tab, courses.length]);

  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'student' });
  const [editing, setEditing] = useState<null | number>(null);
  const [iconPickerTarget, setIconPickerTarget] = useState<null | { type: 'create' } | { type: 'edit'; courseId: number }>(null);
  
  // Pagination state
  const [usersPerPage, setUsersPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const refresh = async () => {
    const list = await listUsers();
    setUsers(list);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({ email: form.email, password: form.password, name: form.name || undefined, role: form.role });
      setForm({ email: '', name: '', password: '', role: 'student' });
      await refresh();
    } catch {
      setError('Failed to create user');
    }
  };

  const onUpdate = async (id: number) => {
    try {
      await updateUser(id, { name: form.name || undefined, role: form.role || undefined, password: form.password || undefined });
      setEditing(null);
      setForm({ email: '', name: '', password: '', role: 'student' });
      await refresh();
    } catch {
      setError('Failed to update user');
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm('Delete user?')) return;
    try {
      await deleteUser(id);
      await refresh();
    } catch {
      setError('Failed to delete user');
    }
  };

  // Enrollment functions
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
    if (tab === 'enrollments') {
      loadMembers();
    }
  }, [tab, loadMembers]);

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
    if (tab === 'enrollments') {
      loadAvailableUsers();
    }
  }, [tab, loadAvailableUsers]);

  const handleAddMember = async (userId: number, roleInCourse: 'teacher' | 'student', userName: string) => {
    if (!selectedCourseId) return;
    
    try {
      await addCourseMember(selectedCourseId, userId, roleInCourse);
      showAlert('success', `${userName} added as ${roleInCourse}`);
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
      await Promise.all([loadMembers(), loadAvailableUsers()]);
    } catch (error) {
      showAlert('error', 'Failed to remove member');
      console.error('Remove member error:', error);
    }
  };

  // Calculate paginated users
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = usersPerPage === -1 ? users : users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = usersPerPage === -1 ? 1 : Math.ceil(users.length / usersPerPage);

  if (loading) return <LoadingSpinner size="medium" />;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
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
      <div className="p-4 md:p-6 overflow-x-auto max-w-[full] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Admin • {tab === 'users' ? 'Users' : tab === 'courses' ? 'Courses' : 'Enrollments'}
          </h2>
          {tab === 'users' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Show:</label>
              <select 
                className="border rounded-lg px-3 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                value={usersPerPage}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setUsersPerPage(value);
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
            </div>
          )}
        </div>

        {tab === 'users' && (
          <>
        {/* Create */}
        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input type="password" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <select className="w-full border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
              {roles
                .sort((a, b) => a.id - b.id)
                .map(r => (
                  <option 
                    key={r.id} 
                    value={r.name}
                    style={r.name.toLowerCase() === 'admin' ? { color: '#9ca3af' } : undefined}
                  >
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="md:col-span-1 md:justify-self-end">
            <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors" type="submit">Create user</button>
          </div>
        </form>

        {/* List */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left border-b border-black/10 text-gray-600">
                <th className="py-2 pr-2">ID</th>
                <th className="pr-2">Name</th>
                <th className="pr-2">Email</th>
                <th className="pr-2">Role</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map(u => (
                <tr key={u.id} className="border-b border-black/5 hover:bg-black/5">
                  <td className="py-2 pr-2">{u.id}</td>
                  <td className="pr-2">
                    {editing === u.id ? (
                      <input className="w-full border rounded-lg px-2 py-1" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
                    ) : (u.name)}
                  </td>
                  <td className="pr-2">{u.email}</td>
                  <td className="pr-2">
                    {editing === u.id ? (
                      <select className="border rounded-lg px-2 py-1" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                        {roles.map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    ) : (u.role)}
                  </td>
                  <td className="py-2">
                    {editing === u.id ? (
                      <div className="flex gap-2">
                        <button className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1" onClick={() => onUpdate(u.id)}>Save</button>
                        <button className="bg-gray-400 hover:bg-gray-500 text-white rounded-lg px-3 py-1" onClick={() => { setEditing(null); setForm({ email: '', name: '', password: '', role: 'user' }); }}>Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1" onClick={() => { setEditing(u.id); setForm({ email: u.email, name: u.name || '', password: '', role: u.role }); }}>Edit</button>
                        <button className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1" onClick={() => onDelete(u.id)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersPerPage !== -1 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, users.length)} of {users.length} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-lg text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                    return false;
                  })
                  .map((page, index, array) => (
                    <Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 border rounded-lg text-sm ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </Fragment>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-lg text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
          </>
        )}

        {tab === 'courses' && (
          <>
            {/* Create course */}
            <div className="bg-gray-100 rounded-lg p-2 mb-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!courseForm.title.trim()) return;
                try {
                  await createCourse({ title: courseForm.title, description: courseForm.description || undefined, icon: courseForm.icon || undefined });
                  setCourseForm({ title: '', description: '', icon: '' });
                  const list = await listCourses();
                  setCourses(list);
                } catch {
                  setError('Failed to create course');
                }
              }} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-1">
                <label className="block text-sm text-gray-600 mb-1">Icon</label>
                <button
                  type="button"
                  onClick={() => setIconPickerTarget({ type: 'create' })}
                  className="w-full border rounded-lg px-3 py-2 bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  {courseForm.icon ? (
                    <>{iconFromString(courseForm.icon)}</>
                  ) : (
                    <>Choose</>
                  )}
                </button>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm text-gray-600 mb-1">Title</label>
                <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={courseForm.title} onChange={e => setCourseForm(f => ({...f, title: e.target.value}))} required />
              </div>
              <div className="md:col-span-5">
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={courseForm.description} onChange={e => setCourseForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-800 text-white rounded-lg px-4 py-2 transition-colors" type="submit">Create course</button>
              </div>
            </form>
            </div>

            {iconPickerTarget && (
              <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white px-4 py-2 rounded shadow">Loading icons…</div></div>}>
                <IconPicker
                  value={iconPickerTarget.type === 'create' ? courseForm.icon : (courses.find(cc => cc.id === iconPickerTarget.courseId)?.icon ?? '')}
                  onChange={(key) => {
                    if (iconPickerTarget.type === 'create') {
                      setCourseForm(f => ({ ...f, icon: key }));
                    } else {
                      const id = iconPickerTarget.courseId;
                      setCourses(prev => prev.map(cc => cc.id === id ? { ...cc, icon: key } : cc));
                    }
                    setIconPickerTarget(null);
                  }}
                  onClose={() => setIconPickerTarget(null)}
                />
              </Suspense>
            )}

            {/* List courses */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-black/10 text-gray-600">
                    <th className="py-2 pr-2">Icon</th>
                    <th className="pr-2">Title</th>
                    <th className="pr-2">Description</th>
                    <th className="pr-2">Icon key</th>
                    <th className="pr-2">Creator</th>
                    <th className="pr-2">Created</th>
                    <th className="w-40"></th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr 
                      key={c.id} 
                      className="border-b border-black/5 hover:bg-black/5 cursor-pointer"
                      onClick={() => {
                        if (courseEditing !== c.id) {
                          setSelectedCourseId(c.id);
                          setTab('enrollments');
                        }
                      }}
                    >
                      <td className="py-2 pr-2">{iconFromString(c.icon)}</td>
                      <td className="pr-2">
                        {courseEditing === c.id ? (
                          <input className="w-full border rounded-lg px-2 py-1" value={c.title} onChange={e => {
                            const val = e.target.value; setCourses(prev => prev.map(cc => cc.id === c.id ? { ...cc, title: val } : cc));
                          }} />
                        ) : c.title}
                      </td>
                      <td className="pr-2">
                        {courseEditing === c.id ? (
                          <input className="w-full border rounded-lg px-2 py-1" value={c.description ?? ''} onChange={e => {
                            const val = e.target.value; setCourses(prev => prev.map(cc => cc.id === c.id ? { ...cc, description: val } : cc));
                          }} />
                        ) : (c.description ?? '')}
                      </td>
                      <td className="pr-2">
                        {courseEditing === c.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="border rounded px-2 py-1 bg-white hover:bg-gray-50"
                              onClick={() => setIconPickerTarget({ type: 'edit', courseId: c.id })}
                            >Choose</button>
                            <div className="flex items-center gap-1">
                              {iconFromString(c.icon)}
                              <input
                                className="w-40 border rounded-lg px-2 py-1"
                                value={c.icon ?? ''}
                                onChange={e => {
                                  const val = e.target.value; setCourses(prev => prev.map(cc => cc.id === c.id ? { ...cc, icon: val } : cc));
                                }}
                              />
                            </div>
                          </div>
                        ) : (c.icon ?? '')}
                      </td>
                      <td className="pr-2">{c.creator_name ?? ''}</td>
                      <td className="pr-2">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</td>
                      <td className="py-2">
                        {courseEditing === c.id ? (
                          <div className="flex gap-2">
                            <button 
                              className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1" 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await updateCourse(c.id, { title: c.title, description: c.description ?? null, icon: c.icon ?? null });
                                  setCourseEditing(null);
                                  const list = await listCourses();
                                  setCourses(list);
                                } catch {
                                  setError('Failed to update course');
                                }
                              }}>Save</button>
                            <button 
                              className="bg-gray-400 hover:bg-gray-500 text-white rounded-lg px-3 py-1" 
                              onClick={(e) => { 
                                e.stopPropagation();
                                setCourseEditing(null); 
                              }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCourseEditing(c.id);
                              }}>Edit</button>
                            <button 
                              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1" 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm('Delete course?')) return;
                                try {
                                  await deleteCourse(c.id);
                                  setCourses(prev => prev.filter(cc => cc.id !== c.id));
                                } catch {
                                  setError('Failed to delete course');
                                }
                              }}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'enrollments' && (
          <>
            <CourseSelector
              courses={courses}
              selectedCourseId={selectedCourseId}
              onChange={setSelectedCourseId}
            />

            {selectedCourseId ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Current Members */}
                <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col" style={{ minHeight: '500px' }}>
                  <CourseMembersList
                    members={members}
                    loading={membersLoading}
                    onRemove={handleRemoveMember}
                    onFilterChange={setMemberFilters}
                  />
                </div>

                {/* Right: Add Members */}
                <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col" style={{ minHeight: '500px' }}>
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
          </>
        )}
      </div>
    </MainCard>
  );
}
