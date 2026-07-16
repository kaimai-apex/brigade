import { redirect } from "next/navigation";

/** Public signup paused — collect waitlist contacts instead. */
export default function SignupPage() {
  redirect("/waitlist");
}
