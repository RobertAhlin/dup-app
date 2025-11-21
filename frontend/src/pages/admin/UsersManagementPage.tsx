import { useEffect, useState, Fragment } from 'react';
import FloatingInput from '../../components/FloatingInput';
import FloatingSelect from '../../components/FloatingSelect';
import { listUsers, createUser, updateUser, deleteUser } from '../../api/users';
import { listRoles } from '../../api/roles';
import type { Role } from '../../types/role';
import type { User } from '../../types/user';

export default function UsersManagementPage({ usersPerPage: usersPerPageProp }: { usersPerPage?: number } = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'student' });
  const [editing, setEditing] = useState<null | number>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');

  const refresh = async () => {
    const list = await listUsers();
    setUsers(list);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [u, r] = await Promise.all([listUsers(), listRoles()]);
        setUsers(u);
        setRoles(r);
      } catch {
        setError('Failed to load users or roles');
      }
    };
    load();
  }, []);

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

  // Pagination
  const effectiveUsersPerPage = typeof usersPerPageProp === 'number' ? usersPerPageProp : 10;
  // reset to page 1 when parent-controlled per-page changes
  useEffect(() => {
    if (typeof usersPerPageProp === 'number') setCurrentPage(1);
  }, [usersPerPageProp]);

  const indexOfLastUser = currentPage * effectiveUsersPerPage;
  const indexOfFirstUser = indexOfLastUser - effectiveUsersPerPage;
  const currentUsers = effectiveUsersPerPage === -1 ? users : users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = effectiveUsersPerPage === -1 ? 1 : Math.ceil(users.length / effectiveUsersPerPage);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <>
      {/* Create */}
      <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end mb-6">
        <div className="md:col-span-2">
          <FloatingInput
            id="admin-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <FloatingInput
            id="admin-name"
            label="Name"
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <FloatingInput
            id="admin-password"
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
          />
        </div>
        <div>
          <FloatingSelect
            id="admin-role"
            label="Role"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            options={roles.slice().sort((a, b) => a.id - b.id).map(r => ({ value: r.name, label: r.name }))}
          />
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
      {effectiveUsersPerPage !== -1 && totalPages > 1 && (
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
  );
}
