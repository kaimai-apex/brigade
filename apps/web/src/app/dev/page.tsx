import { notFound } from "next/navigation";
import { getConnectProSession } from "@/lib/connectpro/server";
import { describeCurrentUser, listDevPersonas } from "@/lib/server/dev-personas";
import { PersonaConsole } from "@/components/dev/persona-console";

export const dynamic = "force-dynamic";

/**
 * Demo console — development only.
 *
 * `notFound()` before anything else runs, so on a production build this route
 * is indistinguishable from one that was never written. It hands out sessions
 * for accounts it creates on demand; reachable on the live site it would be a
 * complete authentication bypass, so the guard is the first statement rather
 * than a condition further down.
 */
export default async function DevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const session = await getConnectProSession();
  const [current, personas] = await Promise.all([
    session ? describeCurrentUser(session.userId) : Promise.resolve(null),
    listDevPersonas(),
  ]);

  return (
    <div className="min-h-dvh bg-[var(--brand-canvas)]">
      <PersonaConsole current={current} personas={personas} />
    </div>
  );
}
