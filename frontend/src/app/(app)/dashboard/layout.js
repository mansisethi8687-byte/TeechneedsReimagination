import { AppShell } from "@/components/shell/AppShell";

export const metadata = { title: "Today" };

export default function Layout({ children }) {
  return <AppShell role="mentee">{children}</AppShell>;
}
