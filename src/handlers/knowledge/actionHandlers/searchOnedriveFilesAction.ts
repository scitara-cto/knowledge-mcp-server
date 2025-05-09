import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { KnowledgeActionConfig } from "../types.js";
import {
  ensureValidMicrosoftToken,
  getMicrosoftAuthUrl,
} from "../microsoft_graph/msAuth.js";

export default async function searchOnedriveFilesAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { query, path, limit = 20 } = args;
  const email = context.user?.email;
  if (!email) {
    return {
      result: null,
      message: "User email is required for OneDrive search.",
      nextSteps: ["Ensure the user is authenticated and has an email address."],
    };
  }
  try {
    const accessToken = await ensureValidMicrosoftToken(email);
    let url = "";
    if (path) {
      // List files in a specific folder
      url = `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURI(
        path,
      )}:/children?$top=${limit}`;
    } else if (query) {
      // Search files by name/content
      url = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(
        query,
      )}')?$top=${limit}`;
    } else {
      return {
        result: null,
        message: "Either query or path must be provided.",
        nextSteps: ["Provide a search query or a OneDrive path to list files."],
      };
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return {
        result: null,
        message: `OneDrive API error: ${await response.text()}`,
        nextSteps: ["Check the query/path and try again."],
      };
    }
    const data = await response.json();
    const files = (data.value || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      size: item.size,
      lastModifiedDateTime: item.lastModifiedDateTime,
      folder: !!item.folder,
    }));
    return {
      result: {
        files,
        count: files.length,
      },
      message: `Found ${files.length} file(s) matching your search.`,
      nextSteps:
        files.length > 0
          ? ["Select a file to retrieve or view details."]
          : ["Try a different search query or path."],
    };
  } catch (error: any) {
    if (
      error.message &&
      error.message.includes("User has not authorized Microsoft account")
    ) {
      // Provide the OAuth URL for the user to authorize
      return {
        result: { authUrl: getMicrosoftAuthUrl(email) },
        message:
          "Please follow this authentication link to authorize OneDrive access.",
        nextSteps: [
          "Instruct the user to follow this authentication link.",
          "Re-try the last tool after the user has provided feedback that they have successfully authenticated.",
        ],
      };
    }
    return {
      result: null,
      message: `Unexpected error: ${error.message}`,
      nextSteps: ["Check server logs or contact support."],
    };
  }
}
