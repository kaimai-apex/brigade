import { redirect } from "next/navigation";
import { getConnectProSession, isAdmin } from "@/lib/connectpro/server";

/**
 * Role gate for the admin portal.
 *
 * middleware.ts only proves a session exists, so every signed-in member could
 * load /admin. It rendered an empty shell rather than leaking data — the
 * analytics endpoint behind it does check the role — but an admin surface that
 * anyone can open is a hole waiting for the first component that forgets to.
 *
 * The check is server-side and reads the role from the signed JWT, so it cannot
 * be bypassed by editing a cookie. Redirects rather than 403s: the existence of
 * the portal is not something a normal member needs to learn.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getConnectProSession();
  if (!session) redirect("/");
  if (!isAdmin(session)) redirect("/feed");
  return <>{children}</>;
}
