"use client";

import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Google sign-in failed before we could create your Brigade session.",
  connectpro: "Google worked, but Brigade auth could not finish.",
  missing_code: "No authorization code returned from Google.",
  supabase_not_configured: "Supabase URL/keys are missing in your environment.",
  auth_service_unreachable: "Could not reach the auth service on port 3000. Is dev:stack running?",
  no_email: "Your Google account did not return an email address.",
  connectpro_oauth_failed: "ConnectPro rejected the Google login.",
};

export function LoginErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");

  if (!error) return null;

  const base = ERROR_MESSAGES[error] ?? "Sign-in failed.";
  const detail = reason ? ERROR_MESSAGES[reason] ?? decodeURIComponent(reason) : null;

  return (
    <div className="mb-4 rounded-lg border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust">
      <p className="font-semibold">{base}</p>
      {detail && <p className="mt-1 text-rust/90">{detail}</p>}
    </div>
  );
}
