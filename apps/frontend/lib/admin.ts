import { getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Shapes mirror the backend's admin services (apps/backend/src/admin/*).
export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface AdminGame {
  id: string;
  title: string;
  emulator: string;
  romPath: string;
  cover: string | null;
  thumbnail: string | null;
  description: string | null;
  releaseYear: number | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GameStats {
  gameId: string;
  title: string;
  totalPlays: number;
  totalPlaytimeSeconds: number;
  uniquePlayers: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AnalyticsOverview {
  totalUsers: number;
  totalGames: number;
  totalSaves: number;
  totalPlaytimeSeconds: number;
  newUsersLast7Days: number;
  usersByRole: { role: string; count: number }[];
}

export interface TopGame {
  gameId: string;
  title: string;
  cover: string | null;
  playCount: number;
  totalPlaytimeSeconds: number;
}

export interface Announcement {
  text: string;
  tone: "info" | "warning" | "success";
  active: boolean;
}

export interface EmailResult {
  recipients: number;
  sent: number;
  failed: number;
}

export interface GameUpdate {
  title?: string;
  emulator?: string;
  description?: string;
  releaseYear?: number;
  rating?: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : typeof body?.message === "string"
        ? body.message
        : `Request failed (HTTP ${res.status})`;
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const adminApi = {
  overview: () => request<AnalyticsOverview>("/admin/analytics/overview"),
  topGames: (limit = 5) => request<TopGame[]>(`/admin/analytics/top-games?limit=${limit}`),

  listGames: (page = 1, limit = 20) =>
    request<Paginated<AdminGame>>(`/admin/games?page=${page}&limit=${limit}&sort=date`),
  getGame: (id: string) => request<AdminGame>(`/admin/games/${id}`),
  getGameStats: (id: string) => request<GameStats>(`/admin/games/${id}/stats`),
  updateGame: (id: string, dto: GameUpdate) => request<AdminGame>(`/admin/games/${id}`, json("PUT", dto)),
  deleteGame: (id: string) => request<void>(`/admin/games/${id}`, { method: "DELETE" }),
  uploadImage: (id: string, kind: "cover" | "thumbnail", file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<AdminGame>(`/admin/games/${id}/images/${kind}`, { method: "POST", body: form });
  },

  listUsers: (page = 1, limit = 50) => request<Paginated<AdminUser>>(`/admin/users?page=${page}&limit=${limit}`),
  updateUserRole: (id: string, role: string) => request<AdminUser>(`/admin/users/${id}/role`, json("PATCH", { role })),
  updateUserStatus: (id: string, status: string) =>
    request<AdminUser>(`/admin/users/${id}/status`, json("PATCH", { status })),
  forceLogout: (id: string) => request<void>(`/admin/users/${id}/force-logout`, { method: "POST" }),
  deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: "DELETE" }),

  getAnnouncement: () => request<{ announcement: Announcement | null }>("/announcement"),
  getSetting: (key: string) => request<{ key: string; value: unknown; updatedAt: string }>(`/admin/settings/${key}`),
  saveAnnouncement: (value: Announcement) => request<unknown>("/admin/announcement", json("PUT", value)),

  sendEmail: (dto: { audience: "all" } | { audience: "selected"; userIds: string[] }, subject: string, body: string) =>
    request<EmailResult>("/admin/emails", json("POST", { ...dto, subject, body })),
};
