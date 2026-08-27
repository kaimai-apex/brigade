import { cookies } from "next/headers";
import { getConnectProSession } from "@/lib/connectpro/server";
import { RESOURCE_UNLOCK_COOKIE, isValidResourceUnlockCookie } from "./unlock-cookie";

/** Logged-in members skip the wall. Everyone else needs a signed unlock cookie. */
export async function viewerHasResourceAccess(): Promise<boolean> {
  const session = await getConnectProSession();
  if (session) return true;
  const jar = await cookies();
  return isValidResourceUnlockCookie(
    jar.get(RESOURCE_UNLOCK_COOKIE)?.value,
    process.env.JWT_SECRET?.trim(),
  );
}
