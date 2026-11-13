import { AppShell } from "@/components/shell/AppShell";

export const metadata = { title: "Mentor studio" };

export default function Layout({ children }) {
  return <AppShell role="mentor">{children}</AppShell>;
}
