# Security policy

## Never commit credentials

Do not commit Feishu/Lark app secrets, OAuth tokens, SSH keys, MCP bearer tokens,
real document URLs, or exported business data. The server intentionally reuses
the local `lark-cli` credential store instead of accepting Feishu credentials in
MCP tool arguments.

If a secret is committed, revoke and rotate it immediately. Removing the file in
a later commit does not remove the secret from Git history.

## Remote exposure

Version 0.1 binds to loopback and rejects non-local Host headers by default.
Do not expose `/mcp` through Nginx until OAuth 2.1 authentication is configured.
A static bearer token may help test compatible non-ChatGPT clients, but it is not
a substitute for the OAuth flow expected by ChatGPT.

## Tool surface

This project uses `execFile` with fixed argument arrays. It does not invoke a
shell and does not expose arbitrary `lark-cli api` or delete operations. Keep new
tools equally narrow and validate every argument.
