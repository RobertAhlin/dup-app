import axios from './axios';
import type { User } from '../types/user';

export async function listUsers() {
  const res = await axios.get<{ users: User[] }>('/api/users', { withCredentials: true });
  return res.data.users;
}

export async function createUser(payload: { email: string; password: string; name?: string; role: string; }) {
  const res = await axios.post<{ user: User }>('/api/users', payload, { withCredentials: true });
  return res.data.user;
}

export async function updateUser(id: number, payload: { name?: string; role?: string; password?: string; }) {
  const res = await axios.put<{ user: User }>(`/api/users/${id}`, payload, { withCredentials: true });
  return res.data.user;
}

export async function deleteUser(id: number) {
  const res = await axios.delete<{ message: string; id: number }>(`/api/users/${id}`, { withCredentials: true });
  return res.data;
}
