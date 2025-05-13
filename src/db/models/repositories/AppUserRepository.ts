import { UserRepository } from "dynamic-mcp-server";
import { IUser } from "dynamic-mcp-server";

export class AppUserRepository extends UserRepository {
  async hasAccessToKnowledgeSource(
    user: IUser,
    knowledgeSourceId: string,
  ): Promise<boolean> {
    const owned = user.applicationAuthorization?.knowledge?.owned || [];
    const shared = user.applicationAuthorization?.knowledge?.shared || [];
    return (
      owned.includes(knowledgeSourceId) ||
      shared.some((s: any) => s.knowledgeSourceId === knowledgeSourceId)
    );
  }

  async shareKnowledgeSource(
    owner: IUser,
    target: IUser,
    knowledgeSourceId: string,
    accessLevel: "read" | "write" = "read",
  ): Promise<IUser | null> {
    if (!target.applicationAuthorization) target.applicationAuthorization = {};
    if (!target.applicationAuthorization.knowledge) {
      target.applicationAuthorization.knowledge = { owned: [], shared: [] };
    }
    target.applicationAuthorization.knowledge.shared.push({
      knowledgeSourceId,
      accessLevel,
      sharedBy: owner.email,
      sharedAt: new Date(),
    });
    // Persist the update
    return this.updateUser(target.email, {
      applicationAuthorization: target.applicationAuthorization,
    });
  }

  // Add any other app-specific methods here
}
