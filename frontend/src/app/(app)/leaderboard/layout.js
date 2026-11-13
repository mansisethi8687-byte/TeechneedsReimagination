import { AppShell } from "@/components/shell/AppShell";

export const metadata = { title: "Leaderboard" };

// Public: anyone can view the cohort ranking. Signed-in users get their nav.
export default function Layout({ children }) {
  return <AppShell role={["mentee", "mentor", "admin"]} allowAnonymous>{children}</AppShell>;
}
