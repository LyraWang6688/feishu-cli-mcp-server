function integerFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

function booleanFromEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false`);
}

export const config = {
  host: process.env.MCP_HOST ?? "127.0.0.1",
  port: integerFromEnv("MCP_PORT", 3100, 1, 65535),
  larkCliBin: process.env.LARK_CLI_BIN ?? "lark-cli",
  larkProfile: process.env.LARK_PROFILE ?? "mcp",
  cliTimeoutMs: integerFromEnv("LARK_CLI_TIMEOUT_MS", 60_000, 1_000, 120_000),
  cliMaxBufferBytes: integerFromEnv(
    "LARK_CLI_MAX_BUFFER_BYTES",
    5 * 1024 * 1024,
    64 * 1024,
    20 * 1024 * 1024,
  ),
  allowRemote: booleanFromEnv("MCP_ALLOW_REMOTE", false),
  bearerToken: process.env.MCP_BEARER_TOKEN ?? "",
} as const;

if (config.allowRemote && config.bearerToken.length < 32) {
  throw new Error("MCP_BEARER_TOKEN must be at least 32 characters when MCP_ALLOW_REMOTE=true");
}
