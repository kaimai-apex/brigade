import {
  connectProLogin,
  connectProLogout,
  connectProOAuthSignIn,
  connectProRefresh,
  connectProSignup,
  isConnectProAuthConfigured,
  toAuthErrorResponse,
} from "@/lib/auth/connectpro-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type AuthTokens = {
  userId: string;
  accessToken: string;
  refreshToken: string;
};

type LoginResult =
  | AuthTokens
  | { mfaRequired: true; userId: string }
  | { message: string };

async function proxyAuth<T>(path: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/${path}`, init);
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export async function signup(body: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  if (isConnectProAuthConfigured()) {
    try {
      return { ok: true, status: 201, data: await connectProSignup(body) };
    } catch (error) {
      const { status, body: errBody } = toAuthErrorResponse(error);
      return { ok: false, status, data: errBody };
    }
  }
  return proxyAuth<AuthTokens>("signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function login(body: { email: string; password: string }) {
  if (isConnectProAuthConfigured()) {
    try {
      return { ok: true, status: 200, data: await connectProLogin(body) };
    } catch (error) {
      const { status, body: errBody } = toAuthErrorResponse(error);
      return { ok: false, status, data: errBody };
    }
  }
  return proxyAuth<LoginResult>("login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function oauthGoogle(body: {
  email: string;
  provider: string;
  providerUid: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}) {
  if (isConnectProAuthConfigured()) {
    try {
      return { ok: true, status: 201, data: await connectProOAuthSignIn(body) };
    } catch (error) {
      const { status, body: errBody } = toAuthErrorResponse(error);
      return { ok: false, status, data: errBody };
    }
  }
  return proxyAuth<AuthTokens>("oauth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function refresh(refreshToken: string) {
  if (isConnectProAuthConfigured()) {
    try {
      return { ok: true, status: 200, data: await connectProRefresh(refreshToken) };
    } catch (error) {
      const { status, body: errBody } = toAuthErrorResponse(error);
      return { ok: false, status, data: errBody };
    }
  }
  return proxyAuth<Omit<AuthTokens, "userId">>("refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}

export async function logout(refreshToken: string) {
  if (isConnectProAuthConfigured()) {
    try {
      return { ok: true, status: 200, data: await connectProLogout(refreshToken) };
    } catch {
      return { ok: true, status: 200, data: { success: true } };
    }
  }
  return proxyAuth("logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}
