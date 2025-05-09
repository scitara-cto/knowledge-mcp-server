import { HandlerOutput, SessionInfo, logger } from "dynamic-mcp-server";
import { KnowledgeActionConfig } from "../types.js";
import { KnowledgeSourceRepository } from "../../../db/models/repositories/KnowledgeSourceRepository.js";
import { EmbeddedChunkRepository } from "../../../db/models/repositories/EmbeddedChunkRepository.js";

export async function handleDeleteKnowledgeSourceAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { name } = args;
  const userEmail = context.user?.email;
  if (!name || !userEmail) {
    return {
      result: null,
      message:
        "Both name and user email are required to delete a knowledge source.",
      nextSteps: [
        "Provide a knowledge source name and ensure you are authenticated.",
      ],
    };
  }
  const knowledgeSourceRepo = new KnowledgeSourceRepository();
  const embeddedChunkRepo = new EmbeddedChunkRepository();
  try {
    logger.info(
      `[delete-knowledge-source] Looking up knowledge source '${name}' for user ${userEmail}`,
    );
    const source = await knowledgeSourceRepo.findByNameAndUser(name, userEmail);
    if (!source) {
      return {
        result: null,
        message: `No knowledge source named '${name}' found for this user.`,
        nextSteps: ["Check the name and try again."],
      };
    }
    const sourceId =
      (source as any).id || (source as any)._id?.toString() || "";
    logger.info(
      `[delete-knowledge-source] Deleting knowledge source '${name}' (ID: ${sourceId})`,
    );
    await knowledgeSourceRepo.deleteByNameAndUser(name, userEmail);
    logger.info(
      `[delete-knowledge-source] Deleting all embedded chunks for knowledgeSourceId: ${sourceId}`,
    );
    await embeddedChunkRepo.deleteByKnowledgeSourceId(sourceId);
    logger.info(
      `[delete-knowledge-source] Successfully deleted knowledge source and all associated chunks.`,
    );
    return {
      result: { knowledgeSourceId: sourceId, name },
      message: `Knowledge source '${name}' and all associated data deleted.`,
      nextSteps: [],
    };
  } catch (err: any) {
    logger.error(
      `[delete-knowledge-source] Error deleting knowledge source: ${err.message}`,
    );
    return {
      result: null,
      message: `Failed to delete knowledge source: ${err.message}`,
      nextSteps: ["Check server logs or contact support."],
    };
  }
}
