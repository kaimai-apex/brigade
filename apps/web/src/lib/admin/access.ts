import { cookies } from "next/headers";
import {
  ADMIN_PORTAL_COOKIE,
  readAdminPortalCookie,
} from "./session-cookie";

export async function getAdminPortalSession(): Promise<{ email: string } | null> {
  const jar = await cookies();
  return readAdminPortalCookie(
    jar.get(ADMIN_PORTAL_COOKIE)?.value,
    process.env.JWT_SECRET?.trim(),
  );
}
