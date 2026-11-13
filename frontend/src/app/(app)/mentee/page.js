import { redirect } from "next/navigation";

// Upstream's mentee login lived here; sign-in is now one page for every role.
export default function MenteeEntry() {
  redirect("/login?role=mentee");
}
