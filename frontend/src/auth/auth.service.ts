import { api } from '../api/axios';

type LoginPayload = {
  email: string;
  password: string;
};

export async function loginRequest(payload: LoginPayload) {
  const response = await api.post('/auth/login', payload);
  return response.data;
}