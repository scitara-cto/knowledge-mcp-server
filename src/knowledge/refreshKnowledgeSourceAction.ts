import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { KnowledgeService } from "./KnowledgeService.js";
import { KnowledgeActionConfig } from "./types.js";

export async function handleRefreshKnowledgeSourceAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { name, documents } = args;

  if (!name || !documents) {
    throw new Error(
      "Missing required parameters: name and documents are required",
    );
  }

  if (!context.user?.email) {
    throw new Error("User email is required");
  }

  const knowledgeService = new KnowledgeService();
  await knowledgeService.initialize();

  try {
    await knowledgeService.reprocessKnowledgeSource(name, context.user.email);

    return {
      result: {
        message: `Successfully refreshed knowledge source "${name}"`,
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
