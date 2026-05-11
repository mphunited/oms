"use client";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0/me";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function parseEmailAddress(e: string): { name?: string; address: string } {
  const m = /^(.+?)\s*<([^>]+)>$/.exec(e.trim());
  return m ? { name: m[1].trim(), address: m[2].trim() } : { address: e.trim() };
}

export class GraphAPIError extends Error {
  status: number;
  retryable: boolean;
  context: string;

  constructor(context: string, status: number, body: string) {
    super(`Graph API ${context} failed (${status}): ${body}`);
    this.name = "GraphAPIError";
    this.context = context;
    this.status = status;
    this.retryable = RETRYABLE_STATUSES.has(status);
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof GraphAPIError && !err.retryable) {
        throw err;
      }
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.warn(
          `[Graph API] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          err instanceof Error ? err.message : err
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function createDraftResilient(
  token: string,
  draft: { to: string[]; cc?: string[]; subject: string; bodyHtml: string; signature?: string | null }
): Promise<{ id: string; webLink: string }> {
  return retryWithBackoff(async () => {
    const body = draft.signature ? `${draft.bodyHtml}<br><br>${draft.signature}` : draft.bodyHtml;
    const res = await fetch(`${GRAPH_BASE}/messages`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        subject: draft.subject,
        body: { contentType: "HTML", content: body },
        toRecipients: draft.to.map((e) => ({ emailAddress: parseEmailAddress(e) })),
        ccRecipients: (draft.cc ?? []).map((e) => ({ emailAddress: parseEmailAddress(e) })),
      }),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new GraphAPIError("createDraft", res.status, bodyText);
    }
    const data = await res.json();
    return { id: data.id, webLink: data.webLink };
  });
}

export async function attachFileToDraftResilient(
  token: string,
  messageId: string,
  filename: string,
  base64Content: string
): Promise<void> {
  return retryWithBackoff(async () => {
    const res = await fetch(`${GRAPH_BASE}/messages/${messageId}/attachments`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: filename,
        contentBytes: base64Content,
      }),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new GraphAPIError("attachFileToDraft", res.status, bodyText);
    }
  });
}
