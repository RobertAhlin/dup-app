export type CourseMember = {
  id: number;
  name: string;
  email: string;
  global_role: string;
  role_in_course: 'teacher' | 'student';
  joined_at: string;
};

export type AvailableUser = {
  id: number;
  name: string;
  email: string;
  global_role: string;
};
