import client from '../api/client';
import type { User } from '../types';

export async function listUsers(): Promise<User[]> {
  const response = await client.get<User[]>('/users');
  return response.data;
}

export async function createUser(payload: {
  employee_id: string;
  name: string;
  password: string;
  role: 'user' | 'admin';
}): Promise<User> {
  const response = await client.post<User>('/users', payload);
  return response.data;
}

export async function deleteUser(id: number): Promise<void> {
  await client.delete(`/users/${id}`);
}

export async function resetPassword(id: number, newPassword: string): Promise<void> {
  await client.put(`/users/${id}/password`, { new_password: newPassword });
}
