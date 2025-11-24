export interface Course {
  id: number;
  title: string;
  description: string | null;
  created_by?: number | null;
  creator_name?: string | null;
  icon?: string | null;
  created_at?: string;
  is_locked?: boolean;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  icon?: string;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string | null;
  icon?: string | null;
}
