import axios from './axios';
import type { Role } from '../types/role';

export async function listRoles() {
  const res = await axios.get<{ roles: Role[] }>('/api/roles', { withCredentials: true });
  return res.data.roles;
}
