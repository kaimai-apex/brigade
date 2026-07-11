export type Brigade = {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
};

function storageKey(userId: string) {
  return `brigade:teams:${userId}`;
}

export function listBrigades(userId: string): Brigade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Brigade[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBrigades(userId: string, brigades: Brigade[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(brigades));
}

export function createBrigade(userId: string, name: string, memberIds: string[]): Brigade {
  const brigade: Brigade = {
    id: crypto.randomUUID(),
    name: name.trim(),
    memberIds,
    createdAt: new Date().toISOString(),
  };
  const next = [brigade, ...listBrigades(userId)];
  saveBrigades(userId, next);
  return brigade;
}

export function deleteBrigade(userId: string, brigadeId: string) {
  saveBrigades(
    userId,
    listBrigades(userId).filter((b) => b.id !== brigadeId),
  );
}
