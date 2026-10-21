import {
  UNAUTHED_ERR_MSG,
  NOT_ADMIN_ERR_MSG,
  NOT_GESTOR_ERR_MSG,
  NOT_MANUTENCAO_ERR_MSG,
  FORBIDDEN_ERR_MSG,
  ROLE_PERMISSIONS,
  type UserRole,
} from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { runOperation } from "../domain/operations";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware: require authenticated user
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || !ctx.user.active) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const operationMiddleware = t.middleware(async opts => {
  if (!opts.ctx.user?.active)
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return runOperation(
    opts.ctx.user,
    opts.path,
    opts.type,
    await opts.getRawInput(),
    user => opts.next({ ctx: { ...opts.ctx, user } })
  );
});
const authenticatedProcedure = t.procedure.use(requireUser);
export const protectedProcedure =
  authenticatedProcedure.use(operationMiddleware);

// Middleware: require admin role
export const adminProcedure = authenticatedProcedure
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
        },
      });
    })
  )
  .use(operationMiddleware);

// Middleware: require gestor_frota or admin role
export const gestorProcedure = authenticatedProcedure
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (!ctx.user || !["admin", "gestor_frota"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_GESTOR_ERR_MSG });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
        },
      });
    })
  )
  .use(operationMiddleware);

// Middleware: require manutencao, gestor_frota or admin role
export const manutencaoProcedure = authenticatedProcedure
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (
        !ctx.user ||
        !["admin", "gestor_frota", "manutencao"].includes(ctx.user.role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: NOT_MANUTENCAO_ERR_MSG,
        });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
        },
      });
    })
  )
  .use(operationMiddleware);

// Helper function to check specific permission
export function hasPermission(
  role: UserRole,
  permission: keyof typeof ROLE_PERMISSIONS.admin
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

// Middleware factory: require specific permission
export function requirePermission(
  permission: keyof typeof ROLE_PERMISSIONS.admin
) {
  return t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !ctx.user.active) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const userRole = ctx.user.role as UserRole;
    if (!hasPermission(userRole, permission)) {
      throw new TRPCError({ code: "FORBIDDEN", message: FORBIDDEN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });
}

// Create procedure with specific permission requirement
export function permissionProcedure(
  permission: keyof typeof ROLE_PERMISSIONS.admin
) {
  return authenticatedProcedure
    .use(requirePermission(permission))
    .use(operationMiddleware);
}

// Stateless existing extraction proposes fields only; no database transaction or new AI side effects.
export const assistedExtractionProcedure = authenticatedProcedure.use(
  requirePermission("canManageVehicles")
);
