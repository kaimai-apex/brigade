import { redirect } from "next/navigation";

/** Dashboard removed — feed is the primary post-login experience. */
export default function DashboardRedirect() {
  redirect("/feed");
}
