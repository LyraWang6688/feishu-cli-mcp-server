import { LarkCliError } from "./lark-cli.js";

export function successResult(result: Record<string, unknown>) {
  return {
    structuredContent: { result },
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

export function errorResult(error: unknown) {
  const message =
    error instanceof LarkCliError
      ? error.message
      : "The requested Feishu operation failed unexpectedly.";

  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

export function requireConfirmation(confirm: boolean): void {
  if (!confirm) {
    throw new LarkCliError("Write operation rejected: set confirm=true only after the user confirms the exact target and change.");
  }
}
