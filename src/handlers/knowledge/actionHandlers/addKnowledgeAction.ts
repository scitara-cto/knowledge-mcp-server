import { HandlerOutput, SessionInfo, logger } from "dynamic-mcp-server";
import { KnowledgeActionConfig } from "../types.js";
import {
  onedriveListFilesRecursive,
  retrieveOnedriveFileBuffer,
} from "../microsoft_graph/onedriveActions.js";
import { extractTextFromBuffer } from "../utils/extractText.js";
import { chunkText } from "../utils/chunkText.js";
import { embedTextsOpenAI } from "../utils/embedText.js";
import { KnowledgeSourceRepository } from "../../../db/models/repositories/KnowledgeSourceRepository.js";
import { EmbeddedChunkRepository } from "../../../db/models/repositories/EmbeddedChunkRepository.js";
import path from "path";

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

function isPlainTextMimeType(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return PLAIN_TEXT_MIMETYPES.some((pattern) => pattern.test(mimeType));
}

function isPlainTextExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return PLAIN_TEXT_EXTENSIONS.includes(ext);
}

// Helper: List all files from OneDrive path
async function listFilesFromOneDrive(userEmail: string, path: string) {
  logger.info(
    `[add-knowledge] Listing files for user ${userEmail} at path '${path}'`,
  );
  const files = await onedriveListFilesRecursive(userEmail, path);
  logger.info(
    `[add-knowledge] Found ${files.length} files under path '${path}'`,
  );
  return files;
}

// Helper: For a single file, retrieve, extract, chunk, and embed
async function extractAndEmbedFile(userEmail: string, file: any) {
  logger.info(`[add-knowledge] Processing file: ${file.name} (${file.id})`);
  const buffer = await retrieveOnedriveFileBuffer(userEmail, file.id);
  logger.info(`[add-knowledge] Downloaded file buffer for: ${file.name}`);
  let text: string;
  // Use direct UTF-8 if mimetype or extension is plain text
  if (isPlainTextMimeType(file.mimeType) || isPlainTextExtension(file.name)) {
    text = buffer.toString("utf-8");
    logger.info(
      `[add-knowledge] Used direct UTF-8 extraction for: ${file.name} (mimetype: ${file.mimeType})`,
    );
  } else {
    text = await extractTextFromBuffer(buffer, file.name);
    logger.info(
      `[add-knowledge] Extracted text from: ${file.name} (length: ${text.length})`,
    );
  }
  const chunks = chunkText(text, 1000, 200);
  logger.info(
    `[add-knowledge] Chunked text from ${file.name} into ${chunks.length} chunks`,
  );
  if (chunks.length === 0) {
    throw new Error("No text chunks produced");
  }
  let embeddings: number[][];
  try {
    embeddings = await embedTextsOpenAI(chunks);
    logger.info(
      `[add-knowledge] Embedded ${chunks.length} chunks for file: ${file.name}`,
    );
  } catch (embedErr: any) {
    logger.error(
      `[add-knowledge] Embedding error for file ${file.name}: ${embedErr.message}`,
    );
    throw new Error(`Embedding error: ${embedErr.message}`);
  }
  return chunks.map((chunk, i) => ({
    text: chunk,
    embedding: embeddings[i],
    file: {
      id: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mimeType,
      lastModified: file.lastModified,
    },
    chunkIndex: i,
  }));
}

export async function handleAddKnowledgeAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { name, description, path } = args;

  if (!name || !description || !path) {
    throw new Error(
      "Missing required parameters: name, description, and path are required",
    );
  }

  const userEmail = context.user?.email;
  if (!userEmail) {
    throw new Error(
      "User email is required for OneDrive knowledge source creation.",
    );
  }

  logger.info(
    `[add-knowledge] Starting knowledge source creation: '${name}' for user ${userEmail}`,
  );

  // 1. List files
  let files;
  try {
    files = await listFilesFromOneDrive(userEmail, path);
  } catch (err: any) {
    logger.error(`[add-knowledge] Error listing files: ${err.message}`);
    return {
      result: null,
      message: `Failed to list files: ${err.message}`,
      nextSteps: ["Check the OneDrive path and try again."],
    };
  }
  let processed = 0;
  let success = 0;
  const failed: Array<{ file: string; error: string }> = [];
  const allChunks: Array<any> = [];
  // 2. For each file, extract and embed
  for (const file of files) {
    processed++;
    try {
      const fileChunks = await extractAndEmbedFile(userEmail, file);
      allChunks.push(...fileChunks);
      logger.info(
        `[add-knowledge] Successfully processed file: ${file.name} (${fileChunks.length} chunks)`,
      );
      success++;
    } catch (err: any) {
      logger.error(
        `[add-knowledge] Failed to process file: ${file.name} - ${err.message}`,
      );
      failed.push({ file: file.name, error: err.message });
      continue;
    }
  }

  // 3. Store knowledge source record
  const knowledgeSourceRepo = new KnowledgeSourceRepository();
  const embeddedChunkRepo = new EmbeddedChunkRepository();
  let knowledgeSourceId = "";
  try {
    logger.info(
      `[add-knowledge] Storing knowledge source record for '${name}'`,
    );
    const knowledgeSource = await knowledgeSourceRepo.create({
      name,
      description,
      sourceType: "onedrive",
      sourceUrl: path,
      createdBy: userEmail,
      status: failed.length === 0 ? "ready" : "error",
      error:
        failed.length > 0
          ? `${failed.length} file(s) failed to process`
          : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    knowledgeSourceId =
      (knowledgeSource as any).id ||
      (knowledgeSource as any)._id?.toString() ||
      "";
    logger.info(
      `[add-knowledge] Knowledge source stored with ID: ${knowledgeSourceId}`,
    );
    // 4. Store all chunks with knowledgeSourceId
    const chunkDocs = allChunks.map((chunk: any) => ({
      knowledgeSourceId,
      fileId: chunk.file.id,
      fileName: chunk.file.name,
      filePath: chunk.file.path,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      embedding: chunk.embedding,
      mimeType: chunk.file.mimeType,
      lastModified: chunk.file.lastModified,
      size: chunk.file.size,
    }));
    if (chunkDocs.length > 0) {
      logger.info(
        `[add-knowledge] Storing ${chunkDocs.length} embedded chunks for knowledgeSourceId: ${knowledgeSourceId}`,
      );
      await embeddedChunkRepo.insertMany(chunkDocs);
      logger.info(`[add-knowledge] Embedded chunks stored successfully.`);
    } else {
      logger.info(
        `[add-knowledge] No chunks to store for knowledgeSourceId: ${knowledgeSourceId}`,
      );
    }
  } catch (err: any) {
    logger.error(
      `[add-knowledge] Error storing knowledge source or chunks: ${err.message}`,
    );
    return {
      result: null,
      message: `Failed to store knowledge source or chunks: ${err.message}`,
      nextSteps: ["Check database connection and try again."],
    };
  }

  logger.info(
    `[add-knowledge] Knowledge source creation complete: '${name}' (${knowledgeSourceId}) - ${allChunks.length} chunks, ${success} files succeeded, ${failed.length} failed.`,
  );

  return {
    result: {
      knowledgeSourceId,
      name,
      description,
      status: failed.length === 0 ? "ready" : "error",
      processed,
      success,
      failed,
      chunkCount: allChunks.length,
    },
    message: `Processed ${processed} files, ${success} succeeded, ${failed.length} failed. ${allChunks.length} chunks stored.`,
    nextSteps: failed.length > 0 ? ["Review failed files and try again."] : [],
  };
}
