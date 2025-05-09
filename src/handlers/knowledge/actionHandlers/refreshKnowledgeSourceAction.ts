import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { KnowledgeActionConfig } from "../types.js";
import { KnowledgeSourceRepository } from "../../../db/models/repositories/KnowledgeSourceRepository.js";
import { EmbeddedChunkRepository } from "../../../db/models/repositories/EmbeddedChunkRepository.js";
import { handleAddKnowledgeAction } from "./addKnowledgeAction.js";

export async function handleRefreshKnowledgeSourceAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { knowledgeSourceId } = args;
  if (!knowledgeSourceId) {
    throw new Error("'knowledgeSourceId' is required.");
  }

  // Set status to 'processing'
  const knowledgeSourceRepo = new KnowledgeSourceRepository();
  await knowledgeSourceRepo.updateStatus(knowledgeSourceId, "processing");

  // Delete all embedded chunks for this source
  const embeddedChunkRepo = new EmbeddedChunkRepository();
  await embeddedChunkRepo.deleteByKnowledgeSourceId(knowledgeSourceId);

  // Re-ingest the source (reuse add-knowledge logic)
  try {
    // Get the knowledge source details
    const knowledgeSource = await knowledgeSourceRepo.findById(
      knowledgeSourceId,
    );
    if (!knowledgeSource) {
      throw new Error("Knowledge source not found");
    }
    // Reuse add-knowledge logic (simulate as if adding again)
    const addResult = await handleAddKnowledgeAction(
      {
        name: knowledgeSource.name,
        description: knowledgeSource.description,
        path: knowledgeSource.sourceUrl,
        knowledgeSourceId,
      },
      context,
      actionConfig,
    );
    // Set status to 'ready'
    await knowledgeSourceRepo.updateStatus(knowledgeSourceId, "ready");
    return {
      ...addResult,
      message: `Knowledge source refreshed successfully.`,
    };
  } catch (error: any) {
    await knowledgeSourceRepo.updateStatus(
      knowledgeSourceId,
      "error",
      error.message,
    );
    return {
      result: null,
      message: `Error refreshing knowledge source: ${error.message}`,
    };
  }
}
