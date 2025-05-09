import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { KnowledgeActionConfig } from "../types.js";
import { getMicrosoftAuthUrl } from "../microsoft_graph/msAuth.js";
import { extractTextFromBuffer } from "../utils/extractText.js";
import {
  retrieveOnedriveFileBuffer,
  getOnedriveFileMetadata,
} from "../microsoft_graph/onedriveActions.js";

export default async function retrieveOnedriveFileAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { fileId, maxLength = 1000 } = args;
  const email = context.user?.email;
  if (!email) {
    return {
      result: null,
      message: "User email is required for OneDrive file retrieval.",
      nextSteps: ["Ensure the user is authenticated and has an email address."],
    };
  }
  if (!fileId) {
    return {
      result: null,
      message: "fileId is required.",
      nextSteps: ["Provide a valid fileId to retrieve a file from OneDrive."],
    };
  }
  try {
    // Use shared utilities for metadata and buffer
    const metadata = await getOnedriveFileMetadata(email, fileId);
    const buffer = await retrieveOnedriveFileBuffer(email, fileId);
    let text = "";
    try {
      text = await extractTextFromBuffer(buffer, metadata.name);
    } catch (extractErr: any) {
      return {
        result: null,
        message: `Could not extract text: ${extractErr.message}`,
        nextSteps: ["Try a different file type or check file contents."],
      };
    }
    // Truncate text to maxLength
    if (text.length > maxLength) {
      text = text.slice(0, maxLength);
    }
    return {
      result: {
        file: {
          id: metadata.id,
          name: metadata.name,
          size: metadata.size,
          webUrl: metadata.webUrl,
          lastModifiedDateTime: metadata.lastModifiedDateTime,
        },
        text,
      },
      message: `Successfully extracted text from '${metadata.name}'.`,
      nextSteps: ["Use the extracted text for further processing or analysis."],
    };
  } catch (error: any) {
    if (
      error.message &&
      error.message.includes("User has not authorized Microsoft account")
    ) {
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
