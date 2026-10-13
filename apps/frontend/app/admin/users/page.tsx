"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { adminApi, type AdminUser, type Paginated } from "@/lib/admin";

const LIMIT = 50;

export default function AdminUsersPage() {
  const { user: me } = useCurrentUser();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<AdminUser> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .listUsers(page, LIMIT)
      .then(setResult)
      .catch((err: Error) => setError(err.message));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs one admin action, then reloads the list. Errors (e.g. "can't suspend yourself") are shown inline.
  async function act(action: () => Promise<unknown>, success: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(user: AdminUser) {
    if (!window.confirm(`Permanently delete ${user.email} and their saves?`)) return;
    await act(() => adminApi.deleteUser(user.id), "User deleted.");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="neon-text font-arcade text-lg">USERS</h1>

      {error && <p className="text-sm text-neon-pink">{error}</p>}
      {notice && <p className="text-sm text-neon-yellow">{notice}</p>}
      {!result && !error && <p className="text-sm text-muted-foreground">Loading users…</p>}

      {result && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm text-slate-200">
              <thead className="border-b-2 border-neon-pink/40 text-xs uppercase text-neon-pink">
                <tr>
                  <th className="p-2">Username</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((u) => {
                  const isSelf = me?.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-slate-700/60">
                      <td className="p-2">{u.username}{isSelf && <span className="ml-2 text-xs text-neon-yellow">(you)</span>}</td>
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">
                        <select
                          aria-label={`Role for ${u.username}`}
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => act(() => adminApi.updateUserRole(u.id, e.target.value), "Role updated.")}
                          className="border-2 border-neon-pink/40 bg-[#0f1430] px-2 py-1 disabled:opacity-50"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <span className={u.status === "active" ? "text-slate-200" : "text-neon-pink"}>{u.status}</span>
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            onClick={() =>
                              act(
                                () => adminApi.updateUserStatus(u.id, u.status === "active" ? "suspended" : "active"),
                                u.status === "active" ? "Account suspended." : "Account restored.",
                              )
                            }
                          >
                            {u.status === "active" ? "Suspend" : "Restore"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => act(() => adminApi.forceLogout(u.id), "User signed out everywhere.")}
                          >
                            Force logout
                          </Button>
                          <Button variant="destructive" size="sm" disabled={isSelf} onClick={() => remove(u)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {result.meta.page} of {Math.max(result.meta.totalPages, 1)} · {result.meta.total} users
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= result.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
