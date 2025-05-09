import { HandlerOutput, SessionInfo, ToolDefinition } from "dynamic-mcp-server";
import { KnowledgeService } from "../KnowledgeService.js";
import { KnowledgeActionConfig } from "../types.js";

export async function handleUseKnowledgeSourceAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { knowledgeSourceId, toolName, toolDescription } = args;

  if (!knowledgeSourceId || !toolName || !toolDescription) {
    throw new Error(
      "Missing required parameters: knowledgeSourceId, toolName, and toolDescription are required",
    );
  }

  if (!context.mcpServer) {
    throw new Error("McpServer not available in context");
  }

  const knowledgeService = new KnowledgeService();

  try {
    // Get the knowledge source to verify it exists
    const knowledgeSource = await knowledgeService.getKnowledgeSource(
      knowledgeSourceId,
    );
    if (!knowledgeSource) {
      throw new Error(
        `Knowledge source with ID '${knowledgeSourceId}' not found`,
      );
    }

    // Check for duplicate tool name
    const existingTool = context.mcpServer.toolGenerator.getTool(toolName);
    if (existingTool) {
      throw new Error(`A tool with the name '${toolName}' already exists.`);
    }

    // Create a specialized tool for this knowledge source
    const toolDefinition: ToolDefinition = {
      name: toolName,
      description: toolDescription,
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: `What would you like to know about ${knowledgeSource.name}?`,
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
            default: 5,
          },
        },
        required: ["query"],
      },
      annotations: {
        title: `Search ${knowledgeSource.name}`,
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      handler: {
        type: "knowledge",
        config: {
          action: "search",
          knowledgeSourceId,
        },
      },
    };

    // Register the tool
    await context.mcpServer.toolGenerator.registerTool(toolDefinition);

    return {
      result: {
        toolDefinition,
        message: `Created new tool '${toolName}' for knowledge source '${knowledgeSource.name}'`,
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
