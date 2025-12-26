// Re-export useAuth from core hooks
export { useAuth } from "@/_core/hooks/useAuth";

// Convenience hook for accessing just the user
import { useAuth } from "@/_core/hooks/useAuth";

export function useUser() {
  const { user, loading, isAuthenticated } = useAuth();
  return { user, loading, isAuthenticated };
}

// Role checking utilities
export function hasRole(user: { role: string } | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function isAdmin(user: { role: string } | null): boolean {
  return hasRole(user, ["admin"]);
}

export function isGestor(user: { role: string } | null): boolean {
  return hasRole(user, ["admin", "gestor_frota"]);
}

export function isManutencao(user: { role: string } | null): boolean {
  return hasRole(user, ["admin", "gestor_frota", "manutencao"]);
}
