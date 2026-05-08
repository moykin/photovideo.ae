import { login, register, getMe, updateMe, strapi } from './strapi';
import type { User } from './types';

const JWT_KEY = 'jwt';
const USER_KEY = 'user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(JWT_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setSession(jwt: string, user: User): void {
  localStorage.setItem(JWT_KEY, jwt);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(JWT_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function signIn(identifier: string, password: string): Promise<User> {
  const { jwt, user } = await login(identifier, password);
  setSession(jwt, user);
  return user;
}

export async function signUp(data: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  userType?: string;
}): Promise<User> {
  // Шаг 1: стандартная регистрация — Strapi v5 принимает только username/email/password
  const { jwt, user } = await register({
    username: data.username,
    email: data.email,
    password: data.password,
  });

  // Ставим токен сразу чтобы updateMe прошёл с авторизацией
  strapi.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
  localStorage.setItem('jwt', jwt);

  // Шаг 2: обновляем кастомные поля через PUT /users/:id
  const slug = data.username.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const updatedUser = await updateMe({
    displayName: data.displayName || data.username,
    userType: data.userType || 'client',
    slug,
  }, user.id);

  const finalUser = { ...user, ...updatedUser };
  setSession(jwt, finalUser);
  return finalUser;
}

export async function refreshUser(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    const user = await getMe();
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    clearSession();
    return null;
  }
}

export function signOut(): void {
  clearSession();
  window.location.href = '/';
}
