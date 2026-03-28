"use client";

import { ReactNode, useEffect, useState } from "react";

import { AdminShell } from "@/components/AdminShell";
import { getAccessToken } from "@/lib/auth";
import { getMe, isApiError } from "@/lib/api";

type AdminUser = { name: string; email: string; company?: string; avatarUrl?: string };

export function AuthedAdminShell({
  children,
  requireAuth = true,
  hideHeader = false
}: {
  children: (ctx: { loading: boolean; user: AdminUser }) => ReactNode;
  requireAuth?: boolean;
  hideHeader?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminUser>({ name: "Usuario", email: "" });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      if (requireAuth) window.location.href = "/login";
      setLoading(false);
      return;
    }

    getMe(token)
      .then((me) => {
        setUser({
          name: me.name || "Usuario",
          email: me.email || "",
          company: ((me.company?.name as string) ?? "") || undefined,
          avatarUrl: (((me as unknown as { profile?: { avatar_url?: string } }).profile?.avatar_url as string) ?? "") || undefined
        });
      })
      .catch((err) => {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
      })
      .finally(() => setLoading(false));
  }, [requireAuth]);

  return <AdminShell user={user} hideHeader={hideHeader}>{children({ loading, user })}</AdminShell>;
}
