import { DlxService } from "../DlxService.js";
import { HandlerOutput, SessionInfo, logger } from "dynamic-mcp-server";
import { ToolDefinition } from "dynamic-mcp-server";
import { triggerOrchestrationAction } from "./triggerOrchestrationAction.js";

interface Orchestration {
  id: string;
  name: string;
  description?: string;
}

const objectSchema = {
  type: "object",
  properties: {},
  required: [],
};

/**
 * Handles the "use-orchestration" action for the DLX handler
 * This action creates a tool for triggering a specific orchestration
 * @param args The arguments passed to the tool
 * @param context The session context containing authentication information
 * @param handlerConfig The handler configuration from the tool definition
 * @returns A promise that resolves to the tool output
 */
export async function handleUseOrchestrationAction(
  args: Record<string, any>,
  context: SessionInfo,
  handlerConfig: {
    orchestrationId?: string;
    dataSchema?: Record<string, any>;
  },
): Promise<HandlerOutput> {
  try {
    const orchestrationId =
      args.orchestrationId || handlerConfig.orchestrationId;
    if (!orchestrationId) {
      throw new Error("Missing required parameter: orchestrationId");
    }

    const dataSchema = args.dataSchema || objectSchema;

    if (!context.mcpServer) {
      throw new Error("McpServer not available in context");
    }

    const dlxService = new DlxService();

    // Get orchestration details
    const orchestrationResponse = (await dlxService.executeDlxApiCall(
      {
        method: "GET",
        path: `/orchestrations/${orchestrationId}`,
      },
      context,
    )) as Orchestration;

    if (!orchestrationResponse) {
      throw new Error(`Orchestration with ID ${orchestrationId} not found`);
    }

    // Create a tool definition for triggering this orchestration using the new triggerOrchestrationAction
    const toolDefinition: ToolDefinition = {
      name: `trigger-${orchestrationResponse.name
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
      description:
        orchestrationResponse.description ||
        `Trigger the ${orchestrationResponse.name} orchestration`,
      inputSchema: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              data: dataSchema,
            },
          },
        },
      },
      annotations: {
        title: orchestrationResponse.name,
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      rolesPermitted: ["admin", "power-user", "user"],
      handler: {
        type: "dlx",
        config: {
          action: "trigger-orchestration",
          orchestrationId,
        },
      },
    };

    // Register the tool
    await context.mcpServer.toolService.addTool(
      toolDefinition,
      context.user?.email || "system",
    );

    return {
      result: {
        toolDefinition,
        message: `Created tool for triggering orchestration: ${orchestrationResponse.name}`,
      },
    };
  } catch (error) {
    logger.error(`Error in useOrchestrationAction: ${error}`);
    if (error instanceof Error) {
      // Check if the error is already a DLX API Request Error
      if (error.message.startsWith("DLX API Request Error:")) {
        throw error;
      }
      throw new Error(`DLX API Request Error: ${error.message}`);
    }
    throw new Error(`DLX API Request Error: ${String(error)}`);
  }
}
