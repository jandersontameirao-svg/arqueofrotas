import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("arqueofrotas-offline-identity");
      localStorage.removeItem("manus-runtime-user-info");
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const liveUser = meQuery.data;
    let localUser: typeof liveUser;
    if (liveUser) {
      const { id, name, role } = liveUser;
      localStorage.setItem(
        "arqueofrotas-offline-identity",
        JSON.stringify({ id, name, role })
      );
      localStorage.removeItem("manus-runtime-user-info");
    } else if (
      !navigator.onLine &&
      ["/driver", "/"].includes(window.location.pathname)
    ) {
      try {
        const cached = JSON.parse(
          localStorage.getItem("arqueofrotas-offline-identity") || "null"
        );
        if (
          cached &&
          Number.isInteger(cached.id) &&
          ["motorista", "admin", "gestor_frota", "manutencao"].includes(
            cached.role
          )
        )
          localUser = {
            ...cached,
            active: true,
            openId: "",
            email: null,
            phone: null,
            unitId: null,
            loginMethod: null,
            createdAt: new Date(0),
            updatedAt: new Date(0),
            lastSignedIn: new Date(0),
          };
      } catch {
        /* No local identity means login is required. */
      }
    }
    return {
      user: liveUser ?? localUser ?? null,
      loading: (!localUser && meQuery.isLoading) || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(liveUser ?? localUser),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
