"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DevPersonaSummary } from "@/lib/server/dev-personas";

/**
 * The demo console.
 *
 * One click to enter a flow as a brand new throwaway account, so the
 * become-a-mentor and onboarding journeys can be shown repeatedly without
 * anyone signing in as themselves — which would permanently turn their own
 * profile into a mentor, with no way back through the UI.
 */
export function PersonaConsole({
  current,
  personas,
}: {
  current: DevPersonaSummary | null;
  personas: DevPersonaSummary[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  async function call(label: string, body: Record<string, unknown>) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch("/api/dev/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "That did not work");
        return;
      }
      if (json.next) window.location.assign(json.next);
      else router.refresh();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy("out");
    await fetch("/api/dev/persona", { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-meta font-semibold uppercase tracking-wide text-rust">
        Development only
      </p>
      <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-ink">
        Demo console
      </h1>
      <p className="mt-2 text-[15px] text-ink/60">
        Walk the product as a throwaway account. Nothing here touches your real Brigade
        profile, and this page does not exist in production.
      </p>

      {/* ---------------------------------------------------------------- */}
      <section className="mt-8 rounded-xl border border-ink/10 bg-white p-5">
        <h2 className="text-meta font-semibold uppercase tracking-wide text-ink/50">
          Signed in as
        </h2>
        {current ? (
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[17px] font-semibold text-ink">{current.name}</p>
              <p className="text-meta mt-0.5 font-mono text-ink/50">{current.email}</p>
              <p className="text-meta mt-2 text-ink/60">
                Onboarding {current.onboardingCompleted ? "finished" : "not finished"} ·{" "}
                {current.mentorStatus
                  ? `mentor profile is ${current.mentorStatus}`
                  : "not a mentor yet"}
              </p>
              {!current.isPersona && (
                <p className="text-meta mt-2 rounded-lg bg-rust/5 px-3 py-2 text-rust">
                  This is a real account, not a demo persona. Reset is disabled for it —
                  create a persona below instead.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={busy !== null}
              className="text-meta text-ink/50 underline underline-offset-4 hover:text-ink"
            >
              {busy === "out" ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-[15px] text-ink/60">Nobody. Start a flow below.</p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mt-6 rounded-xl border border-ink/10 bg-white p-5">
        <h2 className="text-[17px] font-semibold text-ink">Start a flow, fresh</h2>
        <p className="mt-1 text-[15px] text-ink/60">
          Creates a new account and drops you at step one. Use a different name each time
          if you want them easy to tell apart.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-meta font-semibold text-ink/70">First name</span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Alex"
              className="mt-1 h-11 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-meta font-semibold text-ink/70">Last name</span>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Rivera"
              className="mt-1 h-11 w-full rounded-lg border border-ink/15 px-3 text-base"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => call("mentor", { kind: "mentor", firstName, lastName })}
            className="rounded-xl bg-forest px-5 py-3 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy === "mentor" ? "Creating…" : "Become a mentor →"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => call("member", { kind: "member", firstName, lastName })}
            className="rounded-xl px-5 py-3 text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1px_rgba(26,26,23,0.2)] hover:bg-ink/[0.03] disabled:opacity-50"
          >
            {busy === "member" ? "Creating…" : "Member onboarding →"}
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {current?.isPersona && (
        <section className="mt-6 rounded-xl border border-ink/10 bg-white p-5">
          <h2 className="text-[17px] font-semibold text-ink">Run it again</h2>
          <p className="mt-1 text-[15px] text-ink/60">
            Wipes this persona&rsquo;s mentor setup, onboarding answers and bookings, then
            puts you back at step one as the same person. Handy for showing the flow twice
            without a pile of accounts.
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => call("reset", { action: "reset" })}
            className="mt-4 rounded-xl px-5 py-3 text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1px_rgba(26,26,23,0.2)] hover:bg-ink/[0.03] disabled:opacity-50"
          >
            {busy === "reset" ? "Resetting…" : "Reset this persona"}
          </button>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {personas.length > 0 && (
        <section className="mt-6 rounded-xl border border-ink/10 bg-white p-5">
          <h2 className="text-[17px] font-semibold text-ink">Personas you have made</h2>
          <ul className="mt-3 divide-y divide-ink/10">
            {personas.map((persona) => (
              <li key={persona.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink">{persona.name}</p>
                  <p className="text-meta text-ink/50">
                    {persona.mentorStatus
                      ? `mentor · ${persona.mentorStatus}`
                      : persona.onboardingCompleted
                        ? "member · onboarded"
                        : "member · mid-onboarding"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      call(`switch-${persona.userId}`, {
                        action: "switch",
                        userId: persona.userId,
                        kind: "mentor",
                      })
                    }
                    className="text-meta text-ink/60 underline underline-offset-4 hover:text-ink"
                  >
                    Mentor setup
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      call(`switch-m-${persona.userId}`, {
                        action: "switch",
                        userId: persona.userId,
                        kind: "member",
                      })
                    }
                    className="text-meta text-ink/60 underline underline-offset-4 hover:text-ink"
                  >
                    Onboarding
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p className="mt-6 rounded-xl bg-rust/5 px-4 py-3 text-[15px] text-rust">{error}</p>
      )}

      <section className="mt-8">
        <h2 className="text-meta font-semibold uppercase tracking-wide text-ink/50">
          Jump to
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
          {[
            ["/mentorship/setup", "Become a mentor"],
            ["/onboarding", "Member onboarding"],
            ["/onboarding/recommendations", "Recommendations"],
            ["/mentors", "Mentor directory"],
            ["/directory", "Member directory"],
            ["/sessions", "Sessions"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="text-ink/60 underline underline-offset-4 hover:text-ink">
              {label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
