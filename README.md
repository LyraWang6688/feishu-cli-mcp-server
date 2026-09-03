# Feishu CLI MCP Server

A modular, tool-only MCP server that lets compatible AI clients use controlled
Feishu/Lark document and Base operations through the official
[`lark-cli`](https://github.com/larksuite/cli).

The project is designed as one MCP server with many focused tools. New domains
can be added as modules without creating another domain, certificate, process,
or ChatGPT plugin.

## Status

Version `0.1.0` is a localhost-only foundation for protocol and CLI validation.
It must not be exposed publicly until OAuth 2.1 support is added.

Implemented tools:

- `feishu_docs_read`
- `feishu_docs_create`
- `feishu_docs_update`
- `feishu_base_resolve_url`
- `feishu_base_list_records`
- `feishu_base_create_records`
- `feishu_base_update_records`

Deletion, arbitrary shell execution, and raw `lark-cli api` access are not
available.

## Architecture

```text
MCP client -> /mcp -> validated tool -> execFile(lark-cli) -> Feishu Open Platform
```

Feishu credentials remain in the server user's existing `lark-cli` credential
store. They are never passed through MCP arguments or committed to Git.

## Requirements

- Node.js 20+
- `lark-cli` 1.0.93+ installed and authenticated
- A working user profile with the required Feishu scopes

## Install

```bash
git clone https://github.com/LyraWang6688/feishu-cli-mcp-server.git
cd feishu-cli-mcp-server
npm ci
cp .env.example .env
```

Set `LARK_PROFILE` in `.env` to an authenticated local profile. Do not commit
`.env`.

## Build and run locally

```bash
npm run typecheck
npm run build
set -a
. ./.env
set +a
npm start
```

The safe defaults bind to `127.0.0.1:3100`. Check health from the same server:

```bash
curl http://127.0.0.1:3100/health
```

Use MCP Inspector against `http://127.0.0.1:3100/mcp` for protocol testing.

## Production safety

Do not set `MCP_ALLOW_REMOTE=true` for ChatGPT deployment. ChatGPT expects a
standards-compliant OAuth 2.1 flow for customer-specific data and write actions.
The included Nginx example deliberately returns `503` for `/mcp` until that
authentication layer is implemented.

See [SECURITY.md](SECURITY.md) before adding tools or deploying.

## Verified lark-cli commands

The wrappers are based on the official `larksuite/cli` repository documentation:

- `docs +fetch`
- `docs +create`
- `docs +update`
- `base +url-resolve`
- `base +record-list`
- `base +record-batch-create`
- `base +record-batch-update`

Run each command's `--help` on the deployment host when upgrading `lark-cli`.

## References

- [OpenAI: Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [OpenAI: Authentication](https://developers.openai.com/plugins/build/auth)
- [Official lark-cli repository](https://github.com/larksuite/cli)

## License

MIT
