import type { Course } from '../types/course';

type Props = {
  courses: Course[];
  selectedCourseId: number | null;
  onChange: (courseId: number) => void;
};

export default function CourseSelector({ courses, selectedCourseId, onChange }: Props) {
  return (
    <div className="mb-6">
      <label htmlFor="course-select" className="block text-sm font-medium text-slate-700 mb-2">
        Select Course
      </label>
      <select
        id="course-select"
        value={selectedCourseId ?? ''}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        <option value="">-- Select a course --</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </select>
    </div>
  );
}
