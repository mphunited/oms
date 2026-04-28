"use client";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0/me";

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function assertOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Graph API ${context} failed (${res.status}): ${body}`);
  }
}

function parseEmailAddress(e: string): { name?: string; address: string } {
  const m = /^(.+?)\s*<([^>]+)>$/.exec(e.trim())
  return m ? { name: m[1].trim(), address: m[2].trim() } : { address: e.trim() }
}

export async function createDraft(
  token: string,
  draft: { to: string[]; cc?: string[]; subject: string; bodyHtml: string; signature?: string | null }
): Promise<{ id: string; webLink: string }> {
  const body = draft.signature ? `${draft.bodyHtml}<br><br>${draft.signature}` : draft.bodyHtml
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
  await assertOk(res, "createDraft");
  const data = await res.json();
  return { id: data.id, webLink: data.webLink };
}

export async function attachFileToDraft(
  token: string,
  messageId: string,
  filename: string,
  base64Content: string
): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/messages/${messageId}/attachments`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: filename,
      contentBytes: base64Content,
    }),
  });
  await assertOk(res, "attachFileToDraft");
}

export function openDraft(webLink: string): void {
  window.open(webLink, "_blank");
}
