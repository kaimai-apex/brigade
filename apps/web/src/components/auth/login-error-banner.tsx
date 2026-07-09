"use client";

import { useSearchParams } from "next/navigation";
import { parseAuthErrorFromSearchParams } from "@/lib/auth/auth-errors";
import { AuthErrorPanel } from "@/components/auth/auth-error-panel";

const ERROR_TITLES: Record<string, string> = {
  auth: "Sign-in failed before Brigade could create your session.",
  connectpro: "Brigade auth could not finish.",
};

export function LoginErrorBanner() {
  const searchParams = useSearchParams();
  const info = parseAuthErrorFromSearchParams(searchParams);

  if (!info) return null;

  const errorKind = searchParams.get("error") ?? "auth";
  const title = ERROR_TITLES[errorKind] ?? "Sign-in failed.";

  return <AuthErrorPanel info={info} title={title} className="mb-4" />;
}
