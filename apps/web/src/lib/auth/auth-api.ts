import {
  connectProLogin,
  connectProLogout,
  connectProRefresh,
  connectProSignup,
  connectProVerifyMfa,
  isConnectProAuthConfigured,
  toAuthErrorResponse,
} from "@/lib/auth/connectpro-auth";
import { formatAuthError, type AuthErrorDetail } from "@/lib/auth/auth-errors";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type AuthTokens = {
  userId: string;
  accessToken: string;
  refreshToken: string;
};

type LoginResult =
  | AuthTokens
  | { mfaRequired: true; userId: string; mfaToken: string }
  | AuthErrorDetail;

async function proxyAuth<T>(path: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: T | AuthErrorDetail }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/${path}`, init);
    const data = (await res.json().catch(() => ({}))) as T | AuthErrorDetail;
    if (!res.ok) {
      const gateway = data as Partial<AuthErrorDetail> & { message?: string };
      if (gateway.detail && gateway.step) {
        return { ok: false, status: res.status, data: gateway as AuthErrorDetail };
      }
      const message =
        typeof gateway.message === "string" ? gateway.message : `Auth service returned HTTP ${res.status}`;
      return {
        ok: false,
        status: res.status,
        data: formatAuthError(new Error(message), "proxy"),
      };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      data: formatAuthError(error, "proxy"),
    };
  }
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
      const { status, body: errBody } = toAuthErrorResponse(error, "signup");
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
      const { status, body: errBody } = toAuthErrorResponse(error, "login");
      return { ok: false, status, data: errBody };
    }
  }
  return proxyAuth<LoginResult>("login", {
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
      const { status, body: errBody } = toAuthErrorResponse(error, "auth");
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

export async function verifyMfa(body: { mfaToken: string; code: string }) {
  if (isConnectProAuthConfigured()) {
    try {
      return { ok: true, status: 200, data: await connectProVerifyMfa(body.mfaToken, body.code) };
    } catch (error) {
      const { status, body: errBody } = toAuthErrorResponse(error, "auth");
      return { ok: false, status, data: errBody };
    }
  }
  return proxyAuth<AuthTokens>("mfa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
