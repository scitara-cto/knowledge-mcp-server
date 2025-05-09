import { ensureValidMicrosoftToken } from "./msAuth.js";
import fetch from "node-fetch";

export async function microsoftGraphApiCall(
  userEmail: string,
  endpoint: string,
  options: {
    method?: string;
    headers?: any;
    body?: any;
    responseType?: "json" | "buffer";
  } = {},
) {
  const accessToken = await ensureValidMicrosoftToken(userEmail);
  const url = endpoint.startsWith("https://")
    ? endpoint
    : `https://graph.microsoft.com/v1.0${endpoint}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
    body: options.body,
  });
  if (!res.ok) {
    throw new Error(`Microsoft Graph API error: ${await res.text()}`);
  }
  if (options.responseType === "buffer") {
    return Buffer.from(await res.arrayBuffer());
  }
  return await res.json();
}
