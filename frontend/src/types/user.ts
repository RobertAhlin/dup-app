export interface User {
  id: number;
  name: string | null;
  email: string;
  role: string; // e.g., 'admin', 'user'
  created_at?: string;
  last_login_at?: string;
}
