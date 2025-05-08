import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { KnowledgeActionConfig } from "../types.js";
import { KnowledgeSourceRepository } from "../../repositories/KnowledgeSourceRepository.js";

export async function handleListKnowledgeSourcesAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: KnowledgeActionConfig,
): Promise<HandlerOutput> {
  const { nameContains, limit = 10 } = args;
  const userEmail = context.user?.email;
  if (!userEmail) {
    throw new Error("User email is required to list knowledge sources.");
  }
  const repo = new KnowledgeSourceRepository();
  // List all sources for this user, filtered by nameContains if provided
  const allSources = await repo.list({ nameContains, limit: limit || 10 });
  // Only include sources created by this user
  const sources = allSources.filter((src) => src.createdBy === userEmail);
  return {
    result: sources.map((src) => ({
      id: (src as any).id || (src as any)._id?.toString() || "",
      name: src.name,
      description: src.description,
      status: src.status,
      createdAt: src.createdAt,
      updatedAt: src.updatedAt,
      error: src.error,
    })),
    message: `Found ${sources.length} knowledge source(s).`,
  };
}
