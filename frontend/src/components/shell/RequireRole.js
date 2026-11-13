"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, ROLE_HOME } from "@/lib/session";

// Renders children only for a signed-in user with one of `roles`.
// Signed out -> /login (back here after). Wrong role -> that role's home.
export function RequireRole({ roles, children, fallback = null }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = session && roles.includes(session.role);

  useEffect(() => {
    if (session === undefined) return; // not read yet
    if (!session) router.replace(`/login?role=${roles[0]}&next=${encodeURIComponent(pathname)}`);
    else if (!roles.includes(session.role)) router.replace(ROLE_HOME[session.role]);
  }, [session, roles, router, pathname]);

  return allowed ? children : fallback;
}
