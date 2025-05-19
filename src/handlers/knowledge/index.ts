// If import fails, define types locally as a workaround
// import type { HandlerFunction, HandlerPackage } from "dynamic-mcp-server/dist/mcp/types";
type HandlerFunction = (
  args: Record<string, any>,
  context: any,
  config: any,
) => Promise<any>;
interface HandlerPackage {
  name: string;
  tools: any[];
  handler: HandlerFunction;
}
import { tools as knowledgeTools } from "./tools.js";
import { handleAddKnowledgeAction } from "./actionHandlers/addKnowledgeAction.js";
import { handleSearchAction } from "./actionHandlers/searchAction.js";
import { handleUseKnowledgeSourceAction } from "./actionHandlers/useKnowledgeSourceAction.js";
import { handleRefreshKnowledgeSourceAction } from "./actionHandlers/refreshKnowledgeSourceAction.js";
import { handleShareKnowledgeSourceAction } from "./actionHandlers/shareKnowledgeSourceAction.js";
import searchOnedriveFilesAction from "./actionHandlers/searchOnedriveFilesAction.js";
import retrieveOnedriveFileAction from "./actionHandlers/retrieveOnedriveFileAction.js";
import { handleDeleteKnowledgeSourceAction } from "./actionHandlers/deleteKnowledgeSourceAction.js";
import { handleListKnowledgeSourcesAction } from "./actionHandlers/listKnowledgeSourcesAction.js";
import { logger } from "dynamic-mcp-server";

const knowledgeHandler: HandlerFunction = async (
  args: Record<string, any>,
  context: any,
  config: any,
) => {
  const action = config.action;
  try {
    if (action === "add-knowledge") {
      return await handleAddKnowledgeAction(args, context, config);
    } else if (action === "search") {
      return await handleSearchAction(args, context, config);
    } else if (action === "use-knowledge-source") {
      return await handleUseKnowledgeSourceAction(args, context, config);
    } else if (action === "refresh-knowledge-source") {
      return await handleRefreshKnowledgeSourceAction(args, context, config);
    } else if (action === "share-knowledge-source") {
      return await handleShareKnowledgeSourceAction(args, context, config);
    } else if (action === "search-onedrive-files") {
      return await searchOnedriveFilesAction(args, context, config);
    } else if (action === "retrieve-onedrive-file") {
      return await retrieveOnedriveFileAction(args, context, config);
    } else if (action === "delete-knowledge-source") {
      return await handleDeleteKnowledgeSourceAction(args, context, config);
    } else if (action === "list-knowledge-sources") {
      return await handleListKnowledgeSourcesAction(args, context, config);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    logger.error(`Knowledge handler error: ${error}`);
    throw error;
  }
};

const knowledgeHandlerPackage: HandlerPackage = {
  name: "knowledge",
  tools: knowledgeTools,
  handler: knowledgeHandler,
};

export default knowledgeHandlerPackage;
