import { redirect } from "next/navigation";

/** Public directory removed — Find a Brigade requires authentication. */
export default function DirectoryRedirect() {
  redirect("/discover");
}
