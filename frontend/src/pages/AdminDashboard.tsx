import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { listUsers, createUser, updateUser, deleteUser } from '../api/users';
import { listRoles } from '../api/roles';
import type { Role } from '../types/role';
import type { User } from '../types/user';
import MainCard from '../components/MainCard';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminDashboard() {
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tab, setTab] = useState<'users' | 'courses'>('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'user' });
  const [editing, setEditing] = useState<null | number>(null);

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
      <div className="p-4 md:p-6 overflow-x-auto max-w-[1100px] mx-auto">
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
          <div className="text-gray-600 text-sm">
            <p>Courses tab coming soon…</p>
          </div>
        )}
      </div>
    </MainCard>
  );
}
