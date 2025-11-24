import axios from './axios';
import type { Course, CreateCourseInput, UpdateCourseInput } from '../types/course';

export async function listCourses(): Promise<Course[]> {
  const res = await axios.get<{ courses: Course[] }>('/api/courses');
  return res.data.courses;
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const res = await axios.post<{ course: Course }>('/api/courses', input);
  return res.data.course;
}

export async function getCourse(id: number): Promise<Course> {
  const res = await axios.get<{ course: Course }>(`/api/courses/${id}`);
  return res.data.course;
}

export async function updateCourse(id: number, input: UpdateCourseInput): Promise<Course> {
  const res = await axios.put<{ course: Course }>(`/api/courses/${id}` , input);
  return res.data.course;
}

export async function deleteCourse(id: number): Promise<void> {
  await axios.delete(`/api/courses/${id}`);
}

export async function toggleCourseLock(id: number): Promise<{ is_locked: boolean }> {
  const res = await axios.patch<{ course: { id: number; is_locked: boolean } }>(`/api/courses/${id}/lock`);
  return { is_locked: res.data.course.is_locked };
}
