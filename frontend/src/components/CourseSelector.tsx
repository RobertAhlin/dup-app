import type { Course } from '../types/course';
import FloatingSelect from './FloatingSelect';

type Props = {
  courses: Course[];
  selectedCourseId: number | null;
  onChange: (courseId: number) => void;
};

export default function CourseSelector({ courses, selectedCourseId, onChange }: Props) {
  return (
    <div className="mb-2 w-1/3">
      <FloatingSelect
        id="course-select"
        label="Select Course"
        value={selectedCourseId ? String(selectedCourseId) : ''}
        onChange={(e) => onChange(parseInt(e.target.value))}
        options={[{ value: '', label: '' }, ...courses.map(c => ({ value: String(c.id), label: c.title }))]}
      />
    </div>
  );
}
