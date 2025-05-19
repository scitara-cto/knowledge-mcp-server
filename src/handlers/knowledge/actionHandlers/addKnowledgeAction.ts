import { HandlerOutput, SessionInfo, logger } from "dynamic-mcp-server";
import { KnowledgeActionConfig } from "../types.js";
import { KnowledgeSourceRepository } from "../../../db/models/repositories/KnowledgeSourceRepository.js";
import { EmbeddedChunkRepository } from "../../../db/models/repositories/EmbeddedChunkRepository.js";
import { listFilesFromOneDrive } from "../utils/onedriveUtils.js";
import { extractEmbedAndStoreFile } from "../utils/chunkEmbedStore.js";

function validateAddKnowledgeInput(args: Record<string, any>) {
  const { name, description, path } = args;
  if (!name || !description || !path) {
    throw new Error(
      "Missing required parameters: name, description, and path are required",
    );
  }
}

function getUserEmail(context: SessionInfo): string {
  const userEmail = context.user?.email;
  if (!userEmail) {
    throw new Error(
      "User email is required for OneDrive knowledge source creation.",
    );
  }
  return userEmail;
}

async function createOrUpdateKnowledgeSource({
  name,
  description,
  path,
  userEmail,
  knowledgeSourceId,
  knowledgeSourceRepo,
}: {
  name: string;
  description: string;
  path: string;
  userEmail: string;
  knowledgeSourceId: string;
  knowledgeSourceRepo: any;
}) {
  // Check for existing source with same name and user
  const existingByName = await knowledgeSourceRepo.findByNameAndUser(
    name,
    userEmail,
  );
  const existingById = knowledgeSourceId
    ? await knowledgeSourceRepo.findById(knowledgeSourceId)
    : null;

  // If updating (knowledgeSourceId provided and exists), update the record
  if (knowledgeSourceId && existingById) {
    // If the name is being changed to one that already exists for this user (and is not this source), throw error
    if (
      existingByName &&
      existingByName.id !== knowledgeSourceId &&
      existingByName._id?.toString() !== knowledgeSourceId
    ) {
      throw new Error(
        `A knowledge source with the name '${name}' already exists for this user. Name must be unique.`,
      );
    }
    await knowledgeSourceRepo.update(knowledgeSourceId, {
      name,
      description,
      sourceUrl: path,
      updatedAt: new Date(),
    });
    return knowledgeSourceId;
  }

  // If a different source with the same name exists for this user, throw uniqueness error
  if (existingByName) {
    throw new Error(
      `A knowledge source with the name '${name}' already exists for this user. Name must be unique.`,
    );
  }

  // Otherwise, create a new record
  logger.info(`[add-knowledge] Storing knowledge source record for '${name}'`);
  const knowledgeSource = await knowledgeSourceRepo.create({
    name,
    description,
    sourceType: "onedrive",
    sourceUrl: path,
    createdBy: userEmail,
    status: "processing",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const id =
    (knowledgeSource as any).id ||
    (knowledgeSource as any)._id?.toString() ||
    knowledgeSourceId;
  logger.info(`[add-knowledge] Knowledge source stored with ID: ${id}`);
  return id;
}

async function cleanupExistingChunks(
  embeddedChunkRepo: any,
  knowledgeSourceId: string,
) {
  if (knowledgeSourceId) {
    logger.info(
      `[add-knowledge] Cleaning up existing embedded chunks for knowledgeSourceId: ${knowledgeSourceId}`,
    );
    await embeddedChunkRepo.deleteByKnowledgeSourceId(knowledgeSourceId);
  }
}

async function processAllFiles(
  {
    files,
    userEmail,
    knowledgeSourceId,
    embeddedChunkRepo,
  }: {
    files: any[];
    userEmail: string;
    knowledgeSourceId: string;
    embeddedChunkRepo: any;
  },
  progress?: (current: number, total?: number, message?: string) => void,
) {
  const { retrieveOnedriveFileBuffer } = await import(
    "../microsoft_graph/onedriveActions.js"
  );
  const { extractTextFromBuffer } = await import("../utils/extractText.js");
  const { chunkText } = await import("../utils/chunkText.js");
  const { embedTextsOpenAI } = await import("../utils/embedText.js");
  const { isPlainTextMimeType, isPlainTextExtension } = await import(
    "../utils/onedriveUtils.js"
  );

  let processed = 0;
  let success = 0;
  const failed: Array<{ file: string; error: string }> = [];
  let totalChunks = 0;
  const allChunks: Array<{
    knowledgeSourceId: string;
    fileId: string;
    fileName: string;
    filePath: string;
    chunkIndex: number;
    text: string;
    mimeType: string;
    lastModified: string;
    size: number;
  }> = [];

  // Phase 1: Extract and chunk all files
  logger.info(
    `[add-knowledge] Creating text chunks from ${files.length} files...`,
  );
  for (const file of files) {
    processed++;
    try {
      const buffer = await retrieveOnedriveFileBuffer(userEmail, file.id);
      let text: string;
      if (
        isPlainTextMimeType(file.mimeType) ||
        isPlainTextExtension(file.name)
      ) {
        text = buffer.toString("utf-8");
      } else {
        text = await extractTextFromBuffer(buffer, file.name);
      }
      const chunks = chunkText(text, 1000, 200);
      if (chunks.length === 0) {
        throw new Error("No text chunks produced");
      }
      for (let i = 0; i < chunks.length; i++) {
        allChunks.push({
          knowledgeSourceId,
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          chunkIndex: i,
          text: chunks[i],
          mimeType: file.mimeType,
          lastModified: file.lastModified,
          size: file.size,
        });
      }
      totalChunks += chunks.length;
      success++;
    } catch (err: any) {
      failed.push({ file: file.name, error: err.message });
      continue;
    }
    if (progress)
      progress(
        processed,
        files.length,
        `Processed file ${processed} of ${files.length}: ${file.name}`,
      );
  }

  // Phase 2: Batch embed and store all chunks
  logger.info(`[add-knowledge] Embedding ${totalChunks} chunks...`);
  const batchSize = 100;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const texts = batch.map((chunk) => chunk.text);
    let embeddings: number[][];
    try {
      embeddings = await embedTextsOpenAI(texts);
    } catch (embedErr: any) {
      // Mark all files in this batch as failed
      for (const chunk of batch) {
        failed.push({
          file: chunk.fileName,
          error: `Embedding error: ${embedErr.message}`,
        });
      }
      continue;
    }
    // Prepare chunk docs for DB
    const chunkDocs = batch.map((chunk, j) => ({
      ...chunk,
      embedding: embeddings[j],
    }));
    await embeddedChunkRepo.insertMany(chunkDocs);
    // Log progress for this batch
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(allChunks.length / batchSize);
    const percent = (((i + batch.length) / allChunks.length) * 100).toFixed(1);
    logger.info(
      `[add-knowledge] Processed batch ${batchNum}/${totalBatches} (${batch.length} chunks, ${percent}% complete)`,
    );
    if (progress)
      progress(
        i + batch.length,
        allChunks.length,
        `Embedded batch ${batchNum}/${totalBatches} (${percent}% complete)`,
      );
  }
  if (progress)
    progress(
      allChunks.length,
      allChunks.length,
      "Completed knowledge source ingestion.",
    );
  return { processed, success, failed, totalChunks };
}

export async function handleAddKnowledgeAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
  progress?: (current: number, total?: number, message?: string) => void,
): Promise<HandlerOutput> {
  validateAddKnowledgeInput(args);
  const userEmail = getUserEmail(context);
  logger.info(
    `[add-knowledge] Starting knowledge source creation: '${args.name}' for user ${userEmail}`,
  );

  // 1. List files
  let files;
  try {
    files = await listFilesFromOneDrive(userEmail, args.path);
  } catch (err: any) {
    logger.error(`[add-knowledge] Error listing files: ${err.message}`);
    if (
      err.message &&
      err.message.includes("User has not authorized Microsoft account")
    ) {
      const { getMicrosoftAuthUrl } = await import(
        "../microsoft_graph/msAuth.js"
      );
      return {
        result: { authUrl: getMicrosoftAuthUrl(userEmail) },
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
      message: `Failed to list files: ${err.message}`,
      nextSteps: ["Check the OneDrive path and try again."],
    };
  }

  // 2. Prepare repos
  const knowledgeSourceRepo = new KnowledgeSourceRepository();
  const embeddedChunkRepo = new EmbeddedChunkRepository();
  let knowledgeSourceId = args.knowledgeSourceId || "";

  // 3. Clean up existing chunks if updating
  await cleanupExistingChunks(embeddedChunkRepo, knowledgeSourceId);

  // 4. Create or update knowledge source record
  knowledgeSourceId = await createOrUpdateKnowledgeSource({
    name: args.name,
    description: args.description,
    path: args.path,
    userEmail,
    knowledgeSourceId,
    knowledgeSourceRepo,
  });

  // 5. Process all files
  const { processed, success, failed, totalChunks } = await processAllFiles(
    {
      files,
      userEmail,
      knowledgeSourceId,
      embeddedChunkRepo,
    },
    progress,
  );

  // 6. Update knowledge source status and error if needed
  try {
    await knowledgeSourceRepo.updateStatus(
      knowledgeSourceId,
      failed.length === 0 ? "ready" : "error",
      failed.length > 0
        ? `${failed.length} file(s) failed to process`
        : undefined,
    );
  } catch (err: any) {
    logger.error(
      `[add-knowledge] Error updating knowledge source status: ${err.message}`,
    );
  }

  logger.info(
    `[add-knowledge] Knowledge source creation complete: '${args.name}' (${knowledgeSourceId}) - ${totalChunks} chunks, ${success} files succeeded, ${failed.length} failed.`,
  );

  return {
    result: {
      knowledgeSourceId,
      name: args.name,
      description: args.description,
      status: failed.length === 0 ? "ready" : "error",
      processed,
      success,
      failed,
      chunkCount: totalChunks,
    },
    message: `Processed ${processed} files, ${success} succeeded, ${failed.length} failed. ${totalChunks} chunks stored.`,
    nextSteps: failed.length > 0 ? ["Review failed files and try again."] : [],
  };
}
