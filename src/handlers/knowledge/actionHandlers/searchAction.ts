import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { KnowledgeActionConfig } from "../types.js";
import { EmbeddedChunkRepository } from "../../../db/models/repositories/EmbeddedChunkRepository.js";
import { embedTextsOpenAI } from "../utils/embedText.js";

export async function handleSearchAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { query, knowledgeSourceId, limit = 5, skip = 0, minScore } = args;
  if (!query || !knowledgeSourceId) {
    throw new Error("Both 'query' and 'knowledgeSourceId' are required.");
  }

  // Embed the query
  const [embedding] = await embedTextsOpenAI([query]);

  // Find similar chunks (with pagination and minScore)
  const embeddedChunkRepo = new EmbeddedChunkRepository();
  const { results, total } = await embeddedChunkRepo.findSimilarChunks(
    embedding,
    knowledgeSourceId,
    limit,
    skip,
    minScore,
  );

  let nextSteps = undefined;
  if (skip + limit < total) {
    nextSteps = `If the information you need is not in these results, you can re-submit your request with skip=${
      skip + limit
    } to receive the next batch of search results.`;
  }

  return {
    result: {
      results,
      total,
      limit,
      skip,
      minScore,
      nextSteps,
    },
    message: `Found ${total} relevant chunks${
      minScore ? ` (minScore: ${minScore})` : ""
    }. Showing ${results.length} results from ${skip + 1} to ${
      skip + results.length
    }.`,
  };
}
