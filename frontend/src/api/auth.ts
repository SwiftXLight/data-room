import api from "./client";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export const authApi = {
  register: (email: string, password: string): Promise<AuthResponse> =>
    api.post<AuthResponse>("/auth/register", { email, password }),

  login: (email: string, password: string): Promise<AuthResponse> =>
    api.post<AuthResponse>("/auth/login", { email, password }),

  me: (): Promise<AuthUser> => api.get<AuthUser>("/auth/me"),
};
