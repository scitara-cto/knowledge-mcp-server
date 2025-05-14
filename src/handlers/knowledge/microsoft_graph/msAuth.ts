import { UserRepository } from "dynamic-mcp-server";

const MS_REDIRECT_URI = `http://localhost:${process.env.AUTH_PORT}/onedrive/oauth/callback`;
const MS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const MS_TENANT_ID = process.env.MICROSOFT_TENANT_ID!;
const MS_AUTHORITY = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0`;
const MS_SCOPES = [
  "offline_access",
  "Files.ReadWrite.All",
  "User.Read",
  // Add more scopes as needed
].join(" ");

// Generates the Microsoft OAuth2 authorization URL for the user
export function getMicrosoftAuthUrl(userEmail: string): string {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    response_type: "code",
    redirect_uri: MS_REDIRECT_URI,
    response_mode: "query",
    scope: MS_SCOPES,
    state: userEmail, // Optionally encode user context
  });
  return `${MS_AUTHORITY}/authorize?${params.toString()}`;
}

// Exchanges an OAuth2 code for access/refresh tokens
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: MS_REDIRECT_URI,
    scope: MS_SCOPES,
  });
  const response = await fetch(`${MS_AUTHORITY}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to exchange code for tokens: ${await response.text()}`,
    );
  }
  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// Stores Microsoft tokens in the user's record (in applicationAuthentication.microsoft)
export async function storeMicrosoftTokens(
  email: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
) {
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  const userRepo = new UserRepository();
  await userRepo.updateUser(email, {
    applicationAuthentication: {
      microsoft: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
      },
    },
  });
}

// Retrieves Microsoft tokens from the user's record (from applicationAuthentication.microsoft)
export async function getMicrosoftTokens(email: string) {
  const userRepo = new UserRepository();
  const user = await userRepo.findByEmail(email);
  const msAuth = user?.applicationAuthentication?.microsoft;
  if (!msAuth) {
    throw new Error("User has not authorized Microsoft account.");
  }
  return msAuth;
}

// Ensures a valid access token, refreshing if needed
export async function ensureValidMicrosoftToken(
  email: string,
): Promise<string> {
  let { accessToken, refreshToken, expiresAt } = await getMicrosoftTokens(
    email,
  );
  if (Date.now() > new Date(expiresAt).getTime() - 60 * 1000) {
    // refresh 1 min before expiry
    const params = new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: MS_SCOPES,
    });
    const response = await fetch(`${MS_AUTHORITY}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to refresh Microsoft token: ${await response.text()}`,
      );
    }
    const data = await response.json();
    await storeMicrosoftTokens(email, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    });
    accessToken = data.access_token;
  }
  return accessToken;
}
