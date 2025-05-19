import { logger } from "dynamic-mcp-server";
import { extractTextFromBuffer } from "./extractText.js";
import { chunkText } from "./chunkText.js";
import { embedTextsOpenAI } from "./embedText.js";
import { isPlainTextMimeType, isPlainTextExtension } from "./onedriveUtils.js";

export async function extractEmbedAndStoreFile(
  userEmail: string,
  file: any,
  knowledgeSourceId: string,
  embeddedChunkRepo: any,
) {
  logger.info(`[add-knowledge] Processing file: ${file.name} (${file.id})`);
  const buffer = await (
    await import("../microsoft_graph/onedriveActions.js")
  ).retrieveOnedriveFileBuffer(userEmail, file.id);
  logger.info(`[add-knowledge] Downloaded file buffer for: ${file.name}`);
  let text: string;
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
  const batchSize = 100;
  let totalEmbedded = 0;
  const totalBatches = Math.ceil(chunks.length / batchSize);
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batchChunks = chunks.slice(i, i + batchSize);
    let embeddings: number[][];
    try {
      embeddings = await embedTextsOpenAI(batchChunks);
    } catch (embedErr: any) {
      logger.error(
        `[add-knowledge] Embedding error for file ${file.name} (batch ${
          i / batchSize + 1
        }): ${embedErr.message}`,
      );
      throw new Error(`Embedding error: ${embedErr.message}`);
    }
    // Prepare chunk docs for DB
    const chunkDocs = batchChunks.map((chunk, j) => ({
      knowledgeSourceId,
      fileId: file.id,
      fileName: file.name,
      filePath: file.path,
      chunkIndex: i + j,
      text: chunk,
      embedding: embeddings[j],
      mimeType: file.mimeType,
      lastModified: file.lastModified,
      size: file.size,
    }));
    await embeddedChunkRepo.insertMany(chunkDocs);
    totalEmbedded += chunkDocs.length;
    // Log progress for this batch
    const batchNum = Math.floor(i / batchSize) + 1;
    const percent = ((totalEmbedded / chunks.length) * 100).toFixed(1);
    logger.info(
      `[add-knowledge] Processed batch ${batchNum}/${totalBatches} for file: ${file.name} (${chunkDocs.length} chunks, ${percent}% complete)`,
    );
  }
  logger.info(
    `[add-knowledge] Successfully processed file: ${file.name} (${totalEmbedded} chunks)`,
  );
  return totalEmbedded;
}
