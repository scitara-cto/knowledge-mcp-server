import { HandlerOutput, SessionInfo, logger } from "dynamic-mcp-server";
import { tools as knowledgeTools } from "./tools.js";
import { handleAddKnowledgeAction } from "./addKnowledgeAction.js";
import { handleSearchAction } from "./searchAction.js";
import { handleUseKnowledgeSourceAction } from "./useKnowledgeSourceAction.js";
import { handleRefreshKnowledgeSourceAction } from "./refreshKnowledgeSourceAction.js";
import { handleShareKnowledgeSourceAction } from "./shareKnowledgeSourceAction.js";
import { KnowledgeActionConfig } from "./types.js";

const actionHandlers: Record<
  string,
  (
    args: Record<string, any>,
    context: SessionInfo,
    actionConfig: KnowledgeActionConfig,
  ) => Promise<HandlerOutput>
> = {
  "add-knowledge": handleAddKnowledgeAction,
  "search": handleSearchAction,
  "use-knowledge-source": handleUseKnowledgeSourceAction,
  "refresh-knowledge-source": handleRefreshKnowledgeSourceAction,
  "share-knowledge-source": handleShareKnowledgeSourceAction,
};

/**
 * Knowledge handler for managing knowledge sources and performing searches
 * @param args The arguments passed to the tool
 * @param context The session context containing authentication information
 * @param actionConfig The handler configuration from the tool definition
 * @returns A promise that resolves to the tool output
 */
export async function knowledgeHandler(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  try {
    const handler = actionHandlers[actionConfig.action];
    if (!handler) {
      throw new Error(`Unknown action: ${actionConfig.action}`);
    }
    return await handler(args, context, actionConfig);
  } catch (error) {
    logger.error(`Knowledge handler error: ${error}`);
    if (error instanceof Error) {
      // Check if the error is already a Knowledge API Request Error
      if (error.message.startsWith("Knowledge API Request Error:")) {
        throw error;
      }
      throw new Error(`Knowledge API Request Error: ${error.message}`);
    }
    throw new Error(`Knowledge API Request Error: ${String(error)}`);
  }
}

export default {
  name: "knowledge",
  tools: knowledgeTools,
  handler: knowledgeHandler,
};
