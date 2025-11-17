import axios from './axios';
import type { CourseMember, AvailableUser } from '../types/courseMember';

export async function getCourseMembers(
  courseId: number,
  filters?: { role?: string[]; search?: string }
): Promise<CourseMember[]> {
  const params = new URLSearchParams();
  if (filters?.role) {
    filters.role.forEach(r => params.append('role', r));
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  const queryString = params.toString();
  const url = `/api/course-members/${courseId}/members${queryString ? `?${queryString}` : ''}`;
  const res = await axios.get<{ members: CourseMember[] }>(url);
  return res.data.members;
}

export async function addCourseMember(
  courseId: number,
  userId: number,
  roleInCourse: 'teacher' | 'student'
): Promise<void> {
  await axios.post(`/api/course-members/${courseId}/members`, {
    userId,
    roleInCourse,
  });
}

export async function removeCourseMember(courseId: number, userId: number): Promise<void> {
  await axios.delete(`/api/course-members/${courseId}/members/${userId}`);
}

export async function getUsersForCourse(
  excludeCourseId: number,
  filters?: { role?: string[]; search?: string }
): Promise<AvailableUser[]> {
  const params = new URLSearchParams();
  params.append('excludeCourseId', excludeCourseId.toString());
  if (filters?.role) {
    filters.role.forEach(r => params.append('role', r));
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  const res = await axios.get<{ users: AvailableUser[] }>(`/api/course-members/users/for-course?${params.toString()}`);
  return res.data.users;
}
