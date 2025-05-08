import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { KnowledgeService } from "./KnowledgeService.js";
import { KnowledgeActionConfig } from "./types.js";

export async function handleShareKnowledgeSourceAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { knowledgeSourceId, targetEmail, accessLevel } = args;

  if (!context.user?.email) {
    throw new Error("User email is required");
  }

  if (!knowledgeSourceId || !targetEmail) {
    throw new Error("knowledgeSourceId and targetEmail are required");
  }

  const knowledgeService = new KnowledgeService();
  await knowledgeService.initialize();

  try {
    await knowledgeService.shareKnowledgeSource(
      context.user.email,
      targetEmail,
      knowledgeSourceId,
      accessLevel,
    );

    return {
      result: {
        message: `Successfully shared knowledge source with ${targetEmail}`,
      },
    };
  } catch (error) {
    throw new Error(
      `Knowledge API Request Error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
