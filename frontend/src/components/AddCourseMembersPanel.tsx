import { useState, useEffect } from 'react';
import type { AvailableUser } from '../types/courseMember';
import LoadingSpinner from './LoadingSpinner';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';

type Props = {
  users: AvailableUser[];
  loading: boolean;
  onAdd: (userId: number, roleInCourse: 'teacher' | 'student', userName: string) => void;
  onFilterChange: (filters: { role: string[]; search: string }) => void;
};

export default function AddCourseMembersPanel({ users, loading, onAdd, onFilterChange }: Props) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['teacher', 'student']);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleAdd = (user: AvailableUser, roleInCourse: 'teacher' | 'student') => {
    onAdd(user.id, roleInCourse, user.name);
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Add Members</h2>

      {/* Filters */}
      <div className="mb-4 space-y-3">
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

      {/* Users Table */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="small" text="Loading users..." />
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-500">
              {searchTerm || selectedRoles.length < 2
                ? 'No users found matching your filters'
                : 'All users are already members of this course'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Global Role
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Add As
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 capitalize">{user.global_role}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleAdd(user, 'teacher')}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                        title="Add as teacher"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Teacher
                      </button>
                      <button
                        onClick={() => handleAdd(user, 'student')}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        title="Add as student"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Student
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
