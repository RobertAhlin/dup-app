import React, { Suspense } from 'react';
import FloatingInput from '../../components/FloatingInput';
import { listCourses, createCourse, updateCourse, deleteCourse } from '../../api/courses';
import type { Course } from '../../types/course';

// IconPicker and iconFromString must be passed in as props for lazy loading and icon mapping

type IconPickerTarget = { type: 'create' } | { type: 'edit'; courseId: number };

interface IconPickerProps {
  value: string;
  onChange: (key: string) => void;
  onClose: () => void;
}

export default function CourseManagement({
  courses,
  setCourses,
  courseForm,
  setCourseForm,
  courseEditing,
  setCourseEditing,
  iconPickerTarget,
  setIconPickerTarget,
  iconFromString,
  IconPicker,
  setSelectedCourseId,
  setTab,
  setError
}: {
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  courseForm: { title: string; description: string; icon: string };
  setCourseForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; icon: string }>>;
  courseEditing: number | null;
  setCourseEditing: React.Dispatch<React.SetStateAction<number | null>>;
  iconPickerTarget: IconPickerTarget | null;
  setIconPickerTarget: React.Dispatch<React.SetStateAction<IconPickerTarget | null>>;
  iconFromString: (key?: string | null) => React.ReactNode;
  IconPicker: React.LazyExoticComponent<React.ComponentType<IconPickerProps>>;
  setSelectedCourseId: (id: number) => void;
  setTab: (tab: 'users' | 'courses' | 'enrollments') => void;
  setError: (err: string) => void;
}) {
  return (
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
            <button
              type="button"
              onClick={() => setIconPickerTarget({ type: 'create' })}
              className="w-full border rounded-lg px-3 py-2 bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              {courseForm.icon ? (
                <>{iconFromString(courseForm.icon)}</>
              ) : (
                <>Choose Icon</>
              )}
            </button>
          </div>
          <div className="md:col-span-3">
            <FloatingInput
              id="course-title"
              label="Title"
              value={courseForm.title}
              onChange={(e) => setCourseForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="md:col-span-5">
            <FloatingInput
              id="course-description"
              label="Description"
              value={courseForm.description}
              onChange={(e) => setCourseForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-800 text-white rounded-lg px-4 py-2 transition-colors" type="submit">Create course</button>
          </div>
        </form>
      </div>

      {iconPickerTarget && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white px-4 py-2 rounded shadow">Loading icons…</div></div>}>
          <IconPicker
            value={iconPickerTarget.type === 'create' ? courseForm.icon : (courses.find(cc => cc.id === (iconPickerTarget as { type: 'edit'; courseId: number }).courseId)?.icon ?? '')}
            onChange={(key: string) => {
              if (iconPickerTarget.type === 'create') {
                setCourseForm(f => ({ ...f, icon: key }));
              } else {
                const id = iconPickerTarget.courseId;
                setCourses((prev: Course[]) => prev.map(cc => cc.id === id ? { ...cc, icon: key } : cc));
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
                      const val = e.target.value; setCourses((prev: Course[]) => prev.map(cc => cc.id === c.id ? { ...cc, title: val } : cc));
                    }} />
                  ) : c.title}
                </td>
                <td className="pr-2">
                  {courseEditing === c.id ? (
                    <input className="w-full border rounded-lg px-2 py-1" value={c.description ?? ''} onChange={e => {
                      const val = e.target.value; setCourses((prev: Course[]) => prev.map(cc => cc.id === c.id ? { ...cc, description: val } : cc));
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
                            const val = e.target.value; setCourses((prev: Course[]) => prev.map(cc => cc.id === c.id ? { ...cc, icon: val } : cc));
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
                            setCourses((prev: Course[]) => prev.filter(cc => cc.id !== c.id));
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
  );
}
