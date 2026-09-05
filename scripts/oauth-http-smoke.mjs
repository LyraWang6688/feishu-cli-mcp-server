import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 31992;
const publicBaseUrl = "https://feishu-mcp.example";
const issuer = "https://security-test.jp.auth0.com/";
const audience = publicBaseUrl;
const origin = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ["dist/server.js"], {
  env: {
    ...process.env,
    MCP_HOST: "127.0.0.1",
    MCP_PORT: String(port),
    MCP_ALLOW_REMOTE: "true",
    MCP_PUBLIC_BASE_URL: publicBaseUrl,
    AUTH0_ISSUER: issuer,
    AUTH0_AUDIENCE: audience,
  },
  stdio: ["ignore", "ignore", "pipe"],
});

let serverLog = "";
server.stderr.setEncoding("utf8");
server.stderr.on("data", (chunk) => {
  serverLog += chunk;
});

async function waitUntilReady() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${origin}/health`);
      if (response.ok) return;
    } catch {
      // The process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`OAuth test server did not become ready.\n${serverLog}`);
}

try {
  await waitUntilReady();

  const metadataResponse = await fetch(`${origin}/.well-known/oauth-protected-resource`);
  assert.equal(metadataResponse.status, 200);
  const metadata = await metadataResponse.json();
  assert.deepEqual(metadata, {
    resource: audience,
    authorization_servers: [issuer],
    scopes_supported: ["docs:read", "docs:write", "base:read", "base:write"],
    bearer_methods_supported: ["header"],
    resource_name: "Feishu MCP",
  });

  const unauthorized = await fetch(`${origin}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(unauthorized.status, 401);
  assert.match(
    unauthorized.headers.get("www-authenticate") ?? "",
    /^Bearer .*resource_metadata="https:\/\/feishu-mcp\.example\/\.well-known\/oauth-protected-resource".*error="invalid_token"/,
  );
  assert.deepEqual(await unauthorized.json(), {
    error: "invalid_token",
    error_description: "A bearer access token is required",
  });

  console.log("PASS: OAuth HTTP security checks");
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve();
    server.once("exit", resolve);
    setTimeout(() => {
      server.kill("SIGKILL");
      resolve();
    }, 2_000).unref();
  });
}
