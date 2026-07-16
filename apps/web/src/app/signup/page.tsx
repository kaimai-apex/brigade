import { redirect } from "next/navigation";

/** Public signup paused — collect waitlist contacts on the landing page. */
export default function SignupPage() {
  redirect("/#waitlist");
}
