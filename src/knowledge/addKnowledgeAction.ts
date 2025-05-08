import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { KnowledgeService } from "./KnowledgeService.js";
import { KnowledgeActionConfig } from "./types.js";

export async function handleAddKnowledgeAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { name, description, type, options } = args;

  if (!name || !description || !type || !options) {
    throw new Error(
      "Missing required parameters: name, description, type, and options are required",
    );
  }

  const knowledgeService = new KnowledgeService();
  await knowledgeService.initialize();

  try {
    const knowledgeSource = await knowledgeService.addKnowledgeSource(
      {
        name,
        description,
        sourceType: type,
        sourceUrl: type === "website" ? options.url : undefined,
        // Add more fields as needed for other types
      },
      context,
    );

    return {
      result: {
        message: `Successfully added knowledge source \"${name}\"`,
        knowledgeSource,
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
