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
import { tools } from "./tools.js";
import { handleApiCallAction } from "./actionHandlers/apiCallAction.js";
import { handleUseConnectionAction } from "./actionHandlers/useConnectionAction.js";
import { handleUseOrchestrationAction } from "./actionHandlers/useOrchestrationAction.js";
import { triggerOrchestrationAction } from "./actionHandlers/triggerOrchestrationAction.js";
import { logger } from "dynamic-mcp-server";

const dlxHandler: HandlerFunction = async (
  args: Record<string, any>,
  context: any,
  config: any,
) => {
  const actualToolName = args.__toolName || context?.toolName;
  const action = config.action;

  try {
    if (action === "api-call") {
      return await handleApiCallAction(args, context, config);
    } else if (action === "use-connection") {
      return await handleUseConnectionAction(args, context, config);
    } else if (action === "use-orchestration") {
      return await handleUseOrchestrationAction(args, context, config);
    } else if (action === "trigger-orchestration") {
      return await triggerOrchestrationAction(args, context, config);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    logger.error(`DLX handler error: ${error}`);
    throw error;
  }
};

const dlxHandlerPackage: HandlerPackage = {
  name: "dlx",
  tools,
  handler: dlxHandler,
};

export default dlxHandlerPackage;
