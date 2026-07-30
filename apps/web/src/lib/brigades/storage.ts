export type Brigade = {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
};

/**
 * Saved Brigades, server-side.
 *
 * These used to live in localStorage, which meant they were never really saved:
 * a cleared cache or a second device lost them silently, and the product calls
 * them "your trusted teams". They are rows now.
 *
 * The legacy key is still read once, by importLegacyTeams(), so anyone who
 * built a team under the old implementation keeps it.
 */

const LEGACY_KEY = (userId: string) => `brigade:teams:${userId}`;

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new Error(body.message ?? "Request failed");
  return body as T;
}

export async function listBrigades(): Promise<Brigade[]> {
  const res = await fetch("/api/brigade-teams");
  const { data } = await json<{ data: Brigade[] }>(res);
  return data ?? [];
}

export async function createBrigade(name: string, memberIds: string[]): Promise<Brigade> {
  const res = await fetch("/api/brigade-teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, memberIds }),
  });
  return json<Brigade>(res);
}

export async function deleteBrigade(brigadeId: string): Promise<void> {
  const res = await fetch(`/api/brigade-teams/${brigadeId}`, { method: "DELETE" });
  await json(res);
}

/**
 * Move any teams left in localStorage onto the server, once.
 *
 * Returns how many were imported. The local key is only cleared after every
 * team has been written — a half-finished import that deleted the source would
 * lose exactly the data this migration exists to save.
 */
export async function importLegacyTeams(userId: string): Promise<number> {
  if (typeof window === "undefined") return 0;

  let legacy: Brigade[];
  try {
    const raw = localStorage.getItem(LEGACY_KEY(userId));
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    legacy = Array.isArray(parsed) ? (parsed as Brigade[]) : [];
  } catch {
    // Unparseable: leave it alone rather than destroy something we cannot read.
    return 0;
  }

  if (legacy.length === 0) {
    localStorage.removeItem(LEGACY_KEY(userId));
    return 0;
  }

  for (const team of legacy) {
    if (!team?.name) continue;
    await createBrigade(team.name, Array.isArray(team.memberIds) ? team.memberIds : []);
  }

  localStorage.removeItem(LEGACY_KEY(userId));
  return legacy.length;
}
