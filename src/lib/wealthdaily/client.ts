import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

const cache = globalThis as unknown as { _wdSql?: Sql | null };

/**
 * The read-only Wealth Daily connection, or null when unconfigured.
 * Callers must handle null — the app works without it.
 */
export function sql(): Sql | null {
  if (cache._wdSql !== undefined) return cache._wdSql;

  const url = process.env.WEALTH_DAILY_DATABASE_URL;
  cache._wdSql = url ? postgres(url, { prepare: false, max: 2, idle_timeout: 20 }) : null;
  return cache._wdSql;
}

export function isConnected(): boolean {
  return sql() !== null;
}
