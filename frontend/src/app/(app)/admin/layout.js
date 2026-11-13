import { AppShell } from "@/components/shell/AppShell";

export const metadata = { title: "Admin console" };

export default function Layout({ children }) {
  return <AppShell role="admin">{children}</AppShell>;
}
