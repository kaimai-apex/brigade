import { redirect } from "next/navigation";

/** Legacy route — Network is now Your Brigade. */
export default function NetworkRedirect() {
  redirect("/brigade");
}
