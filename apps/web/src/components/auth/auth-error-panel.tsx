"use client";

import { authStepLabel, type AuthErrorDetail } from "@/lib/auth/auth-errors";

type AuthErrorPanelProps = {
  info: AuthErrorDetail;
  title?: string;
  className?: string;
};

export function AuthErrorPanel({ info, title, className = "" }: AuthErrorPanelProps) {
  return (
    <div
      className={`rounded-lg border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust ${className}`}
      role="alert"
    >
      <p className="font-semibold">{title ?? info.message}</p>

      <dl className="mt-2 space-y-1 text-xs text-rust/90">
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium">Step</dt>
          <dd>{authStepLabel(info.step)}</dd>
        </div>
        {info.code && (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium">Code</dt>
            <dd className="font-mono">{info.code}</dd>
          </div>
        )}
        {info.detail && info.detail !== info.message && (
          <div>
            <dt className="font-medium">Error</dt>
            <dd className="mt-0.5 break-all font-mono text-[11px] leading-relaxed">{info.detail}</dd>
          </div>
        )}
        {info.hint && (
          <div>
            <dt className="font-medium">Fix</dt>
            <dd className="mt-0.5 leading-relaxed">{info.hint}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
