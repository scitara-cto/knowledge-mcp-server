import { HandlerOutput, SessionInfo, ToolDefinition } from "dynamic-mcp-server";
import { KnowledgeService } from "./KnowledgeService.js";
import { KnowledgeActionConfig } from "./types.js";

export async function handleUseKnowledgeSourceAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { name, description } = args;

  if (!name || !description) {
    throw new Error(
      "Missing required parameters: name and description are required",
    );
  }

  if (!context.mcpServer) {
    throw new Error("McpServer not available in context");
  }

  const knowledgeService = new KnowledgeService();
  await knowledgeService.initialize();

  try {
    // Get the knowledge source to verify it exists
    const knowledgeSource = await knowledgeService.getKnowledgeSource(name);
    if (!knowledgeSource) {
      throw new Error(`Knowledge source "${name}" not found`);
    }

    // Create a specialized tool for this knowledge source
    const toolDefinition: ToolDefinition = {
      name: `search-${name.toLowerCase().replace(/\s+/g, "-")}`,
      description: `Search for information about ${name}. ${description}`,
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: `What would you like to know about ${name}?`,
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
        title: `Search ${name}`,
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      handler: {
        type: "knowledge",
        config: {
          action: "search",
          knowledgeSourceId: name,
          successMessage: `Found information about ${name}`,
        },
      },
    };

    // Register the tool
    await context.mcpServer.toolGenerator.registerTool(toolDefinition);

    return {
      result: {
        toolDefinition,
        message: `Created new tool for knowledge source "${name}"`,
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
