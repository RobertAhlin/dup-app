export type CourseMember = {
  id: number;
  name: string;
  email: string;
  global_role: string;
  role_in_course: 'teacher' | 'student';
  joined_at: string;
  last_login_at?: string;
  total_tasks?: number;
  completed_tasks?: number;
};

export type AvailableUser = {
  id: number;
  name: string;
  email: string;
  global_role: string;
};
