import client from '../api/client';
import type { AuthState } from '../types';

export async function login(employee_id: string, password: string): Promise<AuthState> {
  const response = await client.post<AuthState>('/auth/login', { employee_id, password });
  return response.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await client.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
