import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.env.MCP_URL ?? "http://127.0.0.1:3100/mcp");
const headers = {};
if (process.env.MCP_BEARER_TOKEN) {
  headers.authorization = `Bearer ${process.env.MCP_BEARER_TOKEN}`;
}

const transport = new StreamableHTTPClientTransport(endpoint, {
  requestInit: { headers },
});
const client = new Client({ name: "feishu-cli-mcp-smoke", version: "0.1.0" });

function printToolResult(label, result) {
  const failed = result.isError === true;
  console.log(`${failed ? "FAIL" : "PASS"}: ${label}`);
  console.log(JSON.stringify(result, null, 2));
  if (failed) process.exitCode = 1;
}

try {
  await client.connect(transport);

  const listed = await client.listTools();
  console.log(`PASS: MCP handshake; discovered ${listed.tools.length} tools`);
  console.log(listed.tools.map((tool) => tool.name).sort().join("\n"));

  if (process.env.SMOKE_DOC_URL) {
    const result = await client.callTool({
      name: "feishu_docs_read",
      arguments: {
        doc: process.env.SMOKE_DOC_URL,
        format: "markdown",
        detail: "simple",
      },
    });
    printToolResult("Feishu document read", result);
  }

  if (process.env.SMOKE_BASE_URL) {
    const result = await client.callTool({
      name: "feishu_base_resolve_url",
      arguments: { url: process.env.SMOKE_BASE_URL },
    });
    printToolResult("Feishu Base URL resolve", result);
  }
} finally {
  await transport.close();
}
