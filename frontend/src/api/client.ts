import axios from 'axios';
import { clearStoredAuth, notifyAuthExpired, TOKEN_KEY } from '../utils/authStorage';

const client = axios.create({
  baseURL: '/api',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredAuth();
      notifyAuthExpired();
    }

    return Promise.reject(error);
  },
);

export default client;
