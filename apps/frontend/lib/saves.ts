import { getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Matches SavesService's `SaveResponse` shape (apps/backend/src/saves/saves.service.ts).
export interface SaveRecord {
  id: string;
  gameId: string;
  userId: string;
  saveState: string; // base64
  playTime: number;
  screenshot: string | null;
  slotNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveInput {
  gameId: string;
  slotNumber: number;
  saveState: string;
  screenshot?: string;
  playTime?: number;
}

export interface SaveUpdateInput {
  saveState?: string;
  screenshot?: string;
  playTime?: number;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
  if (typeof body?.message === "string") return body.message;
  if (Array.isArray(body?.message)) return body.message.join(", ");
  return fallback;
}

export async function listSavesForGame(gameId: string): Promise<SaveRecord[]> {
  const res = await authedFetch(`/saves/game/${gameId}`);
  if (!res.ok) throw new Error(await parseErrorMessage(res, `Failed to load saves (HTTP ${res.status})`));
  return res.json() as Promise<SaveRecord[]>;
}

export async function listSavesForUser(userId: string): Promise<SaveRecord[]> {
  const res = await authedFetch(`/saves/user/${userId}`);
  if (!res.ok) throw new Error(await parseErrorMessage(res, `Failed to load saves (HTTP ${res.status})`));
  return res.json() as Promise<SaveRecord[]>;
}

export async function createSave(input: SaveInput): Promise<SaveRecord> {
  const res = await authedFetch("/saves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, `Save failed (HTTP ${res.status})`));
  return res.json() as Promise<SaveRecord>;
}

export async function updateSave(id: string, input: SaveUpdateInput): Promise<SaveRecord> {
  const res = await authedFetch(`/saves/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, `Save failed (HTTP ${res.status})`));
  return res.json() as Promise<SaveRecord>;
}

export async function deleteSave(id: string): Promise<void> {
  const res = await authedFetch(`/saves/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseErrorMessage(res, `Delete failed (HTTP ${res.status})`));
}

export function formatPlaytime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
