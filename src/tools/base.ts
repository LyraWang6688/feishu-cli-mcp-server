import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LarkCliError, runLarkCli } from "../lark-cli.js";
import { hasScope, oauthTool } from "../oauth.js";
import { errorResult, insufficientScopeResult, requireConfirmation, successResult } from "../tool-result.js";

const token = z.string().min(1).max(512);
const fields = z.record(z.string().min(1), z.unknown());

export function registerBaseTools(server: McpServer, scopes: ReadonlySet<string>): void {
  server.registerTool(
    "feishu_base_resolve_url",
    oauthTool({
      title: "Resolve a Feishu Base URL",
      description: "Use this when the user provides a Feishu Base URL and the base token, table ID, or view ID must be resolved.",
      inputSchema: { url: z.string().url().max(4_096) },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    }, "base:read"),
    async ({ url }) => {
      if (!hasScope(scopes, "base:read")) return insufficientScopeResult("base:read");
      try {
        return successResult(await runLarkCli(["base", "+url-resolve", "--url", url, "--as", "user"]));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "feishu_base_list_records",
    oauthTool({
      title: "List Feishu Base records",
      description: "Use this when the user wants to read records from a known Feishu Base table with optional filtering, sorting, and field projection.",
      inputSchema: {
        baseToken: token,
        tableId: token,
        fieldIds: z.array(z.string().min(1).max(512)).max(100).optional(),
        filter: z.record(z.string(), z.unknown()).optional(),
        sort: z.array(z.unknown()).optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).optional(),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    }, "base:read"),
    async (input) => {
      if (!hasScope(scopes, "base:read")) return insufficientScopeResult("base:read");
      try {
        const args = [
          "base", "+record-list", "--base-token", input.baseToken,
          "--table-id", input.tableId, "--limit", String(input.limit),
          "--format", "json",
        ];
        for (const fieldId of input.fieldIds ?? []) args.push("--field-id", fieldId);
        if (input.filter) args.push("--filter-json", JSON.stringify(input.filter));
        if (input.sort) args.push("--sort-json", JSON.stringify(input.sort));
        if (input.offset !== undefined) args.push("--offset", String(input.offset));
        args.push("--as", "user");
        return successResult(await runLarkCli(args));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "feishu_base_create_records",
    oauthTool({
      title: "Create Feishu Base records",
      description: "Use this when the user explicitly asks to create one or more records in a known Feishu Base table.",
      inputSchema: {
        baseToken: token,
        tableId: token,
        records: z.array(fields).min(1).max(200),
        confirm: z.boolean().describe("Must be true only after the user confirms the target table and records"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    }, "base:write"),
    async (input) => {
      if (!hasScope(scopes, "base:write")) return insufficientScopeResult("base:write");
      try {
        requireConfirmation(input.confirm);
        const payload = JSON.stringify({ create_records: input.records });
        return successResult(await runLarkCli([
          "base", "+record-batch-create", "--base-token", input.baseToken,
          "--table-id", input.tableId, "--json", payload, "--as", "user",
        ], { write: true }));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "feishu_base_update_records",
    oauthTool({
      title: "Update Feishu Base records",
      description: "Use this when the user explicitly asks to update selected fields of known records in a Feishu Base table. Read the records first.",
      inputSchema: {
        baseToken: token,
        tableId: token,
        updates: z.array(z.object({ recordId: token, fields })).min(1).max(200),
        confirm: z.boolean().describe("Must be true only after the user confirms the exact record updates"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    }, "base:write"),
    async (input) => {
      if (!hasScope(scopes, "base:write")) return insufficientScopeResult("base:write");
      try {
        requireConfirmation(input.confirm);
        const updateRecords: Record<string, Record<string, unknown>> = {};
        for (const update of input.updates) {
          if (updateRecords[update.recordId]) {
            throw new LarkCliError(`Duplicate recordId: ${update.recordId}`);
          }
          updateRecords[update.recordId] = update.fields;
        }
        const payload = JSON.stringify({ update_records: updateRecords });
        return successResult(await runLarkCli([
          "base", "+record-batch-update", "--base-token", input.baseToken,
          "--table-id", input.tableId, "--json", payload, "--as", "user",
        ], { write: true }));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
