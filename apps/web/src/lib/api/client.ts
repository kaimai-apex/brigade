/**
 * The browser's client for the app's own route handlers.
 *
 * This used to be 450 lines with two transports: `request`, which proxied to an
 * API gateway in front of fifteen microservices, and `localRequest`, which
 * called the app's own routes because the gateway was never deployed. The
 * gateway and the services are gone, so only the transport that actually ran in
 * production is left, and with it the four calls anything still makes.
 *
 * Everything else the app reads — mentors, bookings, the directory listing,
 * profiles on server-rendered pages — goes through server actions and
 * `lib/server/*-db.ts` directly against Postgres, which is why this file is
 * small and getting smaller is the right direction for it.
 */
export class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null) {
    // Tokens are httpOnly cookies; keep an in-memory hint only for rare callers.
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  }

  getToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? 'Request failed');
    }
    // 204 and an empty body are ordinary answers from the save/unsave routes.
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  getProfile(userId: string) {
    return this.request(`/api/users/${userId}`);
  }

  updateProfile(userId: string, data: Record<string, unknown>) {
    return this.request(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  saveMember(userId: string) {
    return this.request(`/api/directory/saves/${userId}`, {
      method: 'POST',
      body: '{}',
    });
  }

  unsaveMember(userId: string) {
    return this.request(`/api/directory/saves/${userId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
