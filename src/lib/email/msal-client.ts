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
      typeof window !== "undefined" ? window.location.origin + "/msal-callback.html" : "http://localhost:3000/msal-callback.html",
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

let _initialized = false;

async function ensureInitialized() {
  if (!_initialized) {
    console.log('[MSAL] initializing...')
    await msalInstance.initialize();
    console.log('[MSAL] done')
    _initialized = true;
  }
}

export async function getMailToken(): Promise<string> {
  console.log('[MSAL] getMailToken called')
  await ensureInitialized();
  console.log('[MSAL] initialized')

  const accounts: AccountInfo[] = msalInstance.getAllAccounts();
  console.log('[MSAL] accounts found:', accounts.length)
  const account = accounts[0] ?? null;

  const request = { scopes: MAIL_SCOPES, account: account ?? undefined };

  if (account) {
    try {
      console.log('[MSAL] trying silent token...')
      const result = await msalInstance.acquireTokenSilent(request);
      console.log('[MSAL] silent token success')
      return result.accessToken;
    } catch (err) {
      console.log('[MSAL] silent failed:', err)
      if (!(err instanceof InteractionRequiredAuthError)) throw err;
    }
  }

  console.log('[MSAL] opening popup...')
  try {
    const result = await msalInstance.acquireTokenPopup(request);
    console.log('[MSAL] popup success')
    return result.accessToken;
  } catch (err) {
    console.log('[MSAL] popup failed:', err)
    throw err;
  }
}
