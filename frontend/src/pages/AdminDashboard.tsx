import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { listUsers, createUser, updateUser, deleteUser } from '../api/users';
import { listRoles } from '../api/roles';
import type { Role } from '../types/role';
import type { User } from '../types/user';
import MainCard from '../components/MainCard';
import AdminSidebar from '../components/AdminSidebar';
import type { Course } from '../types/course';
import { listCourses, createCourse, updateCourse, deleteCourse } from '../api/courses';
import * as OutlineIcons from '@heroicons/react/24/outline';
const IconPicker = lazy(() => import('../components/IconPicker'));

export default function AdminDashboard() {
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tab, setTab] = useState<'users' | 'courses'>('users');
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseForm, setCourseForm] = useState<{ title: string; description: string; icon: string }>({ title: '', description: '', icon: '' });
  const [courseEditing, setCourseEditing] = useState<null | number>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
    };
    load();
  }, [tab, courses.length]);

  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'user' });
  const [editing, setEditing] = useState<null | number>(null);
  const [iconPickerTarget, setIconPickerTarget] = useState<null | { type: 'create' } | { type: 'edit'; courseId: number }>(null);

  const refresh = async () => {
    const list = await listUsers();
    setUsers(list);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({ email: form.email, password: form.password, name: form.name || undefined, role: form.role });
      setForm({ email: '', name: '', password: '', role: 'user' });
      await refresh();
    } catch {
      setError('Failed to create user');
    }
  };

  const onUpdate = async (id: number) => {
    try {
      await updateUser(id, { name: form.name || undefined, role: form.role || undefined, password: form.password || undefined });
      setEditing(null);
      setForm({ email: '', name: '', password: '', role: 'user' });
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

  if (loading) return <p>Loading...</p>;
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
          <h2 className="text-xl font-semibold text-gray-800">Admin • {tab === 'users' ? 'Users' : 'Courses'}</h2>
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
              {roles.map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1 md:justify-self-end">
            <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors" type="submit">Create user</button>
          </div>
        </form>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/10 text-gray-600">
                <th className="py-2 pr-2">ID</th>
                <th className="pr-2">Name</th>
                <th className="pr-2">Email</th>
                <th className="pr-2">Role</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
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
          </>
        )}

        {tab === 'courses' && (
          <>
            {/* Create course */}
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
            }} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-6">
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
              <div className="md:col-span-2 md:justify-self-end">
                <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors" type="submit">Create course</button>
              </div>
            </form>

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
                    <tr key={c.id} className="border-b border-black/5 hover:bg-black/5">
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
                            <button className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1" onClick={async () => {
                              try {
                                await updateCourse(c.id, { title: c.title, description: c.description ?? null, icon: c.icon ?? null });
                                setCourseEditing(null);
                                const list = await listCourses();
                                setCourses(list);
                              } catch {
                                setError('Failed to update course');
                              }
                            }}>Save</button>
                            <button className="bg-gray-400 hover:bg-gray-500 text-white rounded-lg px-3 py-1" onClick={() => { setCourseEditing(null); }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1" onClick={() => setCourseEditing(c.id)}>Edit</button>
                            <button className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1" onClick={async () => {
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
      </div>
    </MainCard>
  );
}
