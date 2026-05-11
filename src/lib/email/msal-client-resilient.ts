"use client";

import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance } from "@/lib/email/msal-client";

const MAIL_SCOPES = ["Mail.ReadWrite", "Mail.Send"];

let _initialized = false;

async function ensureInitialized() {
  if (!_initialized) {
    console.log("[MSAL Resilient] initializing...");
    await msalInstance.initialize();
    console.log("[MSAL Resilient] initialized");
    _initialized = true;
  }
}

type TokenErrorCode = "SILENT_FAILED" | "USER_CANCELLED" | "POPUP_TIMEOUT" | "POPUP_FAILED";

export class TokenAcquisitionError extends Error {
  code: TokenErrorCode;
  retryable: boolean;

  constructor(code: TokenErrorCode, retryable: boolean, message: string) {
    super(message);
    this.name = "TokenAcquisitionError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function isTokenError(err: unknown): err is TokenAcquisitionError {
  return err instanceof TokenAcquisitionError;
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Popup timed out")), ms)
  );
}

function isUserCancelledError(msg: string): boolean {
  return (
    msg.includes("user_cancelled") ||
    msg.includes("User cancelled") ||
    msg.includes("popup_window_error") ||
    msg.includes("Popup window closed") ||
    msg.includes("AADB2C90118")
  );
}

export async function getMailTokenResilient(): Promise<string> {
  console.log("[MSAL Resilient] getMailTokenResilient called");
  await ensureInitialized();

  const accounts = msalInstance.getAllAccounts();
  console.log("[MSAL Resilient] accounts found:", accounts.length);
  const account = accounts[0] ?? null;

  const request = { scopes: MAIL_SCOPES, account: account ?? undefined };

  // Attempt silent token first
  console.log("[MSAL Resilient] attempting silent token...");
  try {
    const result = await msalInstance.acquireTokenSilent(request);
    console.log("[MSAL Resilient] silent token success");
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      console.log("[MSAL Resilient] silent failed — interaction required, falling through to popup");
    } else {
      console.log("[MSAL Resilient] silent failed with non-interaction error:", err);
      throw new TokenAcquisitionError(
        "SILENT_FAILED",
        false,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // Popup with retry (up to 2 attempts)
  for (let popupAttempt = 0; popupAttempt <= 1; popupAttempt++) {
    console.log(`[MSAL Resilient] popup attempt ${popupAttempt + 1}...`);
    try {
      const result = await Promise.race([
        msalInstance.acquireTokenPopup(request),
        timeoutPromise(30_000),
      ]);
      console.log("[MSAL Resilient] popup success");
      return result.accessToken;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[MSAL Resilient] popup attempt ${popupAttempt + 1} failed:`, msg);

      if (isUserCancelledError(msg)) {
        throw new TokenAcquisitionError("USER_CANCELLED", true, msg);
      }

      if (msg.includes("Popup timed out")) {
        throw new TokenAcquisitionError("POPUP_TIMEOUT", true, msg);
      }

      if (popupAttempt === 0) {
        console.log("[MSAL Resilient] waiting 1000ms before retry...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      throw new TokenAcquisitionError("POPUP_FAILED", true, msg);
    }
  }

  // Unreachable — TypeScript needs this
  throw new TokenAcquisitionError("POPUP_FAILED", true, "Unexpected exit from popup loop");
}
