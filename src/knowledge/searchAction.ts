import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { KnowledgeService } from "./KnowledgeService.js";
import { KnowledgeActionConfig } from "./types.js";

export async function handleSearchAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { query, limit, knowledgeSourceId } = args;

  if (!query) {
    throw new Error("Missing required parameter: query");
  }

  if (!knowledgeSourceId) {
    throw new Error("Missing required parameter: knowledgeSourceId");
  }

  if (!context.user?.email) {
    throw new Error("User email is required");
  }

  const knowledgeService = new KnowledgeService();
  await knowledgeService.initialize();

  try {
    const results = await knowledgeService.searchDocuments(query, {
      limit: limit || 5,
      knowledgeSourceId,
      clientId: context.user.email,
    });

    return {
      result: {
        message: `Found ${results.length} results for "${query}"`,
        results,
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
