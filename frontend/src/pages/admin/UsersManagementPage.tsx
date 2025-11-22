import { useEffect, useState, Fragment } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['admin', 'teacher', 'student']);

  const refresh = async () => {
    const list = await listUsers();
    setUsers(list);
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

  // Debounce search term
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
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

  // Pagination
  const effectiveUsersPerPage = typeof usersPerPageProp === 'number' ? usersPerPageProp : 10;
  // reset to page 1 when parent-controlled per-page changes
  useEffect(() => {
    if (typeof usersPerPageProp === 'number') setCurrentPage(1);
  }, [usersPerPageProp]);

  // Apply role + search filter before pagination
  const filteredUsers = users
    .filter(u => selectedRoles.includes((u.role || '').toLowerCase()))
    .filter(u => {
      if (!debouncedSearch) return true;
      return (u.name || '').toLowerCase().includes(debouncedSearch) || (u.email || '').toLowerCase().includes(debouncedSearch);
    });

  const handleExportExcel = async () => {
    try {
      const rows = filteredUsers.map(u => ({
        ID: u.id,
        Name: u.name ?? '',
        Email: u.email ?? '',
        Role: u.role ?? '',
        'Last Login': u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'
      }));

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      const filename = `users-export-${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Export failed', err);
      setError('Failed to export users');
    }
  };

  const indexOfLastUser = currentPage * effectiveUsersPerPage;
  const indexOfFirstUser = indexOfLastUser - effectiveUsersPerPage;
  const currentUsers = effectiveUsersPerPage === -1 ? filteredUsers : filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = effectiveUsersPerPage === -1 ? 1 : Math.ceil(filteredUsers.length / effectiveUsersPerPage);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <>
      {/* Create */}
      <form onSubmit={onCreate} className="bg-gray-100 rounded-lg p-2 grid grid-cols-1 md:grid-cols-6 gap-3 items-end mb-2">
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
        <div className="md:col-span-1 md:justify-self-start">
          <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors" type="submit">Create user</button>
        </div>
      </form>

      {/* Search + Role filters (same row on md+) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1">
          <div className="relative w-2/3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedRoles.includes('admin')}
              onChange={() => toggleRole('admin')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Admin</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedRoles.includes('teacher')}
              onChange={() => toggleRole('teacher')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Teachers</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedRoles.includes('student')}
              onChange={() => toggleRole('student')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Students</span>
          </label>
          <button
            type="button"
            onClick={handleExportExcel}
            title="Export filtered list to Excel file."
            aria-label="Export filtered list to Excel file."
            className="ml-2 inline-flex items-center justify-center p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span className="sr-only">Export to Excel file</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left border-b border-black/10 text-gray-600">
              <th className="py-2 pr-2">ID</th>
              <th className="pr-2">Name</th>
              <th className="pr-2">Email</th>
              <th className="pr-2">Role</th>
              <th className="pr-2">Last Login</th>
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
                <td className="pr-2 text-xs text-slate-600">{formatLastLogin(u.last_login_at)}</td>
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
