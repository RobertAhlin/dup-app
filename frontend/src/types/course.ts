export interface Course {
  id: number;
  title: string;
  description: string | null;
  created_by?: number | null;
  creator_name?: string | null;
  created_at?: string;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string | null;
}
