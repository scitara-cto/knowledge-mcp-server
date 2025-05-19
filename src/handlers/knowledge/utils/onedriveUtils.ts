import path from "path";
import { logger } from "dynamic-mcp-server";
import { onedriveListFilesRecursive } from "../microsoft_graph/onedriveActions.js";

const PLAIN_TEXT_MIMETYPES = [
  /^text\//,
  /^application\/(json|xml|csv|yaml|x-yaml|javascript|typescript)$/i,
];
const PLAIN_TEXT_EXTENSIONS = [
  ".txt",
  ".json",
  ".xml",
  ".csv",
  ".yaml",
  ".yml",
  ".js",
  ".ts",
];

export function isPlainTextMimeType(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return PLAIN_TEXT_MIMETYPES.some((pattern) => pattern.test(mimeType));
}

export function isPlainTextExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return PLAIN_TEXT_EXTENSIONS.includes(ext);
}

export async function listFilesFromOneDrive(userEmail: string, path: string) {
  logger.info(
    `[add-knowledge] Listing files for user ${userEmail} at path '${path}'`,
  );
  const files = await onedriveListFilesRecursive(userEmail, path);
  logger.info(
    `[add-knowledge] Found ${files.length} files under path '${path}'`,
  );
  return files;
}
