import { SessionInfo, UserRepository } from "dynamic-mcp-server";
import { KnowledgeSourceRepository } from "../../db/models/repositories/KnowledgeSourceRepository.js";
import { IKnowledgeSource } from "../../db/models/KnowledgeSource.js";
import { AppUserRepository } from "../../db/models/repositories/AppUserRepository.js";

export interface KnowledgeSource {
  id: string;
  name: string;
  description: string;
  sourceType: "onedrive";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: "processing" | "ready" | "error";
  error?: string;
  // Add OneDrive-specific config fields as needed
}

export interface KnowledgeDocument {
  id: string;
  knowledgeSourceId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export class KnowledgeService {
  private userRepository: AppUserRepository;
  private knowledgeSourceRepository: KnowledgeSourceRepository;

  constructor(
    userRepository: AppUserRepository = new AppUserRepository(),
    knowledgeSourceRepository: KnowledgeSourceRepository = new KnowledgeSourceRepository(),
  ) {
    this.userRepository = userRepository;
    this.knowledgeSourceRepository = knowledgeSourceRepository;
  }

  async addKnowledgeSource(
    source: Partial<IKnowledgeSource>,
    sessionInfo: SessionInfo,
  ) {
    const userEmail = sessionInfo.user?.email;
    if (!userEmail) throw new Error("User email is required");
    // Create the knowledge source
    const createdSource = await this.knowledgeSourceRepository.create(source);
    // Add to user's owned knowledge sources
    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) throw new Error("User not found");
    if (!user.applicationAuthorization) user.applicationAuthorization = {};
    if (!user.applicationAuthorization.knowledge) {
      user.applicationAuthorization.knowledge = { owned: [], shared: [] };
    }
    user.applicationAuthorization.knowledge.owned.push(
      createdSource._id || createdSource.id,
    );
    await this.userRepository.updateUser(userEmail, {
      applicationAuthorization: user.applicationAuthorization,
    });
    return createdSource;
  }

  async searchDocuments(
    query: string,
    options: {
      limit?: number;
      knowledgeSourceId?: string;
      clientId?: string;
    } = {},
  ) {
    const { knowledgeSourceId } = options;
    if (!knowledgeSourceId) throw new Error("knowledgeSourceId is required");
    // Check access
    const user = await this.userRepository.findByEmail(options.clientId!);
    if (!user) throw new Error("User not found");
    const owned = user.applicationAuthorization?.knowledge?.owned || [];
    const shared = user.applicationAuthorization?.knowledge?.shared || [];
    const hasAccess =
      owned.includes(knowledgeSourceId) ||
      shared.some((s: any) => s.knowledgeSourceId === knowledgeSourceId);
    if (!hasAccess)
      throw new Error("User does not have access to this knowledge source");
    // Call the repository's searchDocuments method
    return this.knowledgeSourceRepository.searchDocuments(query, {
      ...options,
      knowledgeSourceId: options.knowledgeSourceId as string,
    });
  }

  async getKnowledgeSource(id: string): Promise<IKnowledgeSource | null> {
    return this.knowledgeSourceRepository.findById(id);
  }

  // Placeholder for future OneDrive reprocessing
  async reprocessKnowledgeSource(id: string, clientId: string): Promise<void> {
    // TODO: Implement OneDrive reprocessing
    throw new Error("Not implemented: reprocessKnowledgeSource for OneDrive");
  }

  async shareKnowledgeSource(
    ownerId: string,
    targetClientId: string,
    knowledgeSourceId: string,
    accessLevel: "read" | "write" = "read",
  ): Promise<void> {
    // Get owner and target user
    const owner = await this.userRepository.findByEmail(ownerId);
    const target = await this.userRepository.findByEmail(targetClientId);
    if (!owner || !target) throw new Error("Owner or target user not found");
    // Check that owner owns the knowledge source
    const owned = owner.applicationAuthorization?.knowledge?.owned || [];
    if (!owned.includes(knowledgeSourceId))
      throw new Error("Owner does not have access to this knowledge source");
    // Add to target's shared knowledge sources
    if (!target.applicationAuthorization) target.applicationAuthorization = {};
    if (!target.applicationAuthorization.knowledge) {
      target.applicationAuthorization.knowledge = { owned: [], shared: [] };
    }
    target.applicationAuthorization.knowledge.shared.push({
      knowledgeSourceId,
      accessLevel,
      sharedBy: ownerId,
      sharedAt: new Date(),
    });
    await this.userRepository.updateUser(targetClientId, {
      applicationAuthorization: target.applicationAuthorization,
    });
  }
}
