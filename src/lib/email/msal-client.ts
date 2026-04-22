"use client";

import {
  PublicClientApplication,
  type AccountInfo,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";

const MAIL_SCOPES = ["Mail.ReadWrite", "Mail.Send"];

const msalConfig = {
  auth: {
    clientId: "2785bb21-50cc-4e45-a996-c0aec39b13bd",
    authority:
      "https://login.microsoftonline.com/3abf2937-e518-43e5-b2a4-456eecfa8b00",
    redirectUri:
      typeof window !== "undefined" ? `${window.location.origin}/msal-callback` : "http://localhost:3000/msal-callback",
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

let _initialized = false;

async function ensureInitialized() {
  if (!_initialized) {
    await msalInstance.initialize();
    _initialized = true;
  }
}

export async function getMailToken(): Promise<string> {
  await ensureInitialized();

  const accounts: AccountInfo[] = msalInstance.getAllAccounts();
  const account = accounts[0] ?? null;

  const request = { scopes: MAIL_SCOPES, account: account ?? undefined };

  if (account) {
    try {
      const result = await msalInstance.acquireTokenSilent(request);
      return result.accessToken;
    } catch (err) {
      if (!(err instanceof InteractionRequiredAuthError)) throw err;
    }
  }

  const result = await msalInstance.acquireTokenPopup(request);
  return result.accessToken;
}
