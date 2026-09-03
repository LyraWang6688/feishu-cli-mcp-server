import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { registerBaseTools } from "./tools/base.js";
import { registerDocsTools } from "./tools/docs.js";

function buildMcpServer(): McpServer {
  const server = new McpServer(
    { name: "feishu-cli-mcp-server", version: "0.1.0" },
    {
      instructions:
        "Use read tools before updates. Write tools require confirm=true only after the user confirms the exact target and change. Deletion and arbitrary CLI execution are unavailable.",
    },
  );
  registerDocsTools(server);
  registerBaseTools(server);
  return server;
}

function isLocalHostHeader(req: Request): boolean {
  const hostname = req.hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function authorize(req: Request, res: Response): boolean {
  if (!config.allowRemote) {
    if (isLocalHostHeader(req)) return true;
    res.status(403).json({ error: "Remote MCP access is disabled until OAuth is configured." });
    return false;
  }

  const expected = `Bearer ${config.bearerToken}`;
  if (req.get("authorization") !== expected) {
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "feishu-cli-mcp-server", version: "0.1.0" });
});

app.post("/mcp", async (req, res) => {
  if (!authorize(req, res)) return;

  const server = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed", error);
    if (!res.headersSent) res.status(500).json({ error: "MCP request failed" });
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).setHeader("Allow", "POST").json({ error: "Method not allowed in stateless mode" });
});

app.delete("/mcp", (_req, res) => {
  res.status(405).setHeader("Allow", "POST").json({ error: "Method not allowed in stateless mode" });
});

app.listen(config.port, config.host, () => {
  console.error(`feishu-cli-mcp-server listening on http://${config.host}:${config.port}`);
});
