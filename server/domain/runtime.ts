import { AsyncLocalStorage } from "node:async_hooks";
import type { drizzle } from "drizzle-orm/mysql2";
export type Database = ReturnType<typeof drizzle>;
export const domainDb = new AsyncLocalStorage<Database>();
