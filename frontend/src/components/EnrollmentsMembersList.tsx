import { useState, useEffect } from 'react';
import type { CourseMember } from '../types/courseMember';
import LoadingSpinner from './LoadingSpinner';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

type Props = {
  members: CourseMember[];
  loading: boolean;
  onRemove: (userId: number, userName: string) => void;
  onFilterChange: (filters: { role: string[]; search: string }) => void;
};

export default function CourseMembersList({ members, loading, onRemove, onFilterChange }: Props) {
    // DRY column definitions
    const columns = [
      { key: 'name', label: 'Name', className: 'px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider', cellClass: 'px-4 py-1 text-sm font-medium text-slate-900' },
      { key: 'email', label: 'Email', className: 'px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider', cellClass: 'px-4 py-1 text-sm text-slate-600' },
      { key: 'global_role', label: 'Role', className: 'px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider', cellClass: 'px-4 py-1 text-sm text-slate-600 capitalize' },
      { key: 'joined_at', label: 'Joined', className: 'px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider', cellClass: 'px-4 py-1 text-sm text-slate-600' },
      { key: 'actions', label: 'Actions', className: 'px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider', cellClass: 'px-4 py-1 text-right' }
    ];
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['teacher', 'student']);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ userId: number; userName: string } | null>(null);

  // Debounced filter update
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ role: selectedRoles, search: searchTerm });
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedRoles, searchTerm, onFilterChange]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleRemoveClick = (userId: number, userName: string) => {
    setConfirmDelete({ userId, userName });
  };

  const handleConfirmRemove = () => {
    if (confirmDelete) {
      onRemove(confirmDelete.userId, confirmDelete.userName);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Current Members</h2>

      {/* Filters */}
      <div className="mb-2">
        {/* Role Filter */}
        <div className="flex gap-3">
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
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="small" text="Loading members..." />
          </div>
        ) : members.length === 0 ? (
          <div className="flex items-center justify-center">
            <p className="text-slate-500">No members found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className={col.className}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {members.map((member) => (
                <tr key={member.id} className="bg-white hover:bg-slate-50">
                  {columns.map(col => (
                    col.key === 'actions' ? (
                      <td key={col.key} className={col.cellClass}>
                        <button
                          onClick={() => handleRemoveClick(member.id, member.name)}
                          className="px-3 py-1 text-sm font-medium text-red-600 hover:text-white hover:bg-red-500 rounded-md transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    ) : (
                      <td key={col.key} className={col.cellClass}>
                        {col.key === 'name' && member.name}
                        {col.key === 'email' && member.email}
                        {col.key === 'global_role' && member.global_role}
                        {col.key === 'joined_at' && formatDate(member.joined_at)}
                      </td>
                    )
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <XMarkIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove Member</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Are you sure you want to remove <strong>{confirmDelete.userName}</strong> from this course?
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRemove}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
