import { PrismaPg } from "@prisma/adapter-pg";

type SslOption = false | { rejectUnauthorized: boolean } | undefined;

/**
 * Build a Prisma Postgres adapter with sane TLS handling for managed hosts.
 *
 * The `pg` driver verifies the full certificate chain by default, which fails
 * behind TLS-terminating proxies (and some CI sandboxes) that present a
 * self-signed chain. We honour the `sslmode` in the URL: encryption stays on
 * for `require`/`prefer`, but chain verification is relaxed. `verify-full` and
 * `verify-ca` keep strict verification. Local URLs without an `sslmode` stay
 * unencrypted, as before.
 */
export function createPgAdapter(connectionString: string): PrismaPg {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return new PrismaPg({ connectionString });
  }

  const mode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");

  let ssl: SslOption;
  if (mode === "disable") ssl = false;
  else if (mode === "verify-ca" || mode === "verify-full") ssl = { rejectUnauthorized: true };
  else if (mode) ssl = { rejectUnauthorized: false };

  const config: {
    connectionString: string;
    ssl?: SslOption;
    max: number;
    keepAlive: boolean;
    connectionTimeoutMillis: number;
    idleTimeoutMillis: number;
  } = {
    connectionString: url.toString(),
    max: 5,
    keepAlive: true,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 10_000,
  };
  if (ssl !== undefined) config.ssl = ssl;

  return new PrismaPg(config);
}
