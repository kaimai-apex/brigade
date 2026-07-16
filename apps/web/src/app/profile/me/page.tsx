import { redirect } from "next/navigation";
import { getConnectProSession } from "@/lib/connectpro/server";

/** Always resolves to the authenticated user's profile. */
export default async function MyProfilePage() {
  const session = await getConnectProSession();
  if (!session) {
    redirect("/login?next=/profile/me");
  }
  redirect(`/profile/${session.userId}`);
}
