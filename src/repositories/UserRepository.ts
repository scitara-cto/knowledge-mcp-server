import { User, IUser } from "../models/User.js";

export class UserRepository {
  async findByEmail(email: string): Promise<IUser> {
    const doc = await User.findOne({ email });
    if (!doc) {
      throw new Error(`User with email ${email} not found`);
    }
    return doc.toJSON();
  }

  async create(user: Partial<IUser>): Promise<IUser> {
    if (!user.email) {
      throw new Error("User email is required");
    }
    const newUser = new User(user);
    const saved = await newUser.save();
    return saved.toJSON();
  }

  async addKnowledgeSource(
    email: string,
    knowledgeSourceId: string,
  ): Promise<IUser | null> {
    const doc = await User.findOneAndUpdate(
      { email },
      { $addToSet: { knowledgeSources: knowledgeSourceId } },
      { new: true },
    );
    return doc ? doc.toJSON() : null;
  }

  async removeKnowledgeSource(
    email: string,
    knowledgeSourceId: string,
  ): Promise<IUser | null> {
    const doc = await User.findOneAndUpdate(
      { email },
      { $pull: { knowledgeSources: knowledgeSourceId } },
      { new: true },
    );
    return doc ? doc.toJSON() : null;
  }

  async hasAccessToKnowledgeSource(
    email: string,
    knowledgeSourceId: string,
    requiredAccessLevel: "read" | "write" = "read",
  ): Promise<boolean> {
    const user = await User.findOne({
      email,
      $or: [
        { knowledgeSources: knowledgeSourceId }, // Owner has full access
        {
          sharedKnowledgeSources: {
            $elemMatch: {
              knowledgeSourceId,
              accessLevel:
                requiredAccessLevel === "read"
                  ? { $in: ["read", "write"] }
                  : "write",
            },
          },
        },
      ],
    });

    return !!user;
  }

  async shareKnowledgeSource(
    ownerEmail: string,
    targetEmail: string,
    knowledgeSourceId: string,
    accessLevel: "read" | "write" = "read",
  ): Promise<void> {
    // First verify that the owner has this knowledge source
    const owner = await this.findByEmail(ownerEmail);
    if (!owner || !owner.knowledgeSources.includes(knowledgeSourceId)) {
      throw new Error("Owner does not have access to this knowledge source");
    }

    // Then add the sharing record
    await User.findOneAndUpdate(
      { email: targetEmail },
      {
        $addToSet: {
          sharedKnowledgeSources: {
            knowledgeSourceId,
            sharedBy: ownerEmail,
            accessLevel,
            sharedAt: new Date(),
          },
        },
      },
    );
  }

  async removeSharedAccess(
    ownerEmail: string,
    targetEmail: string,
    knowledgeSourceId: string,
  ): Promise<void> {
    await User.findOneAndUpdate(
      { email: targetEmail },
      {
        $pull: {
          sharedKnowledgeSources: {
            knowledgeSourceId,
            sharedBy: ownerEmail,
          },
        },
      },
    );
  }

  async getSharedKnowledgeSources(email: string): Promise<
    {
      knowledgeSourceId: string;
      sharedBy: string;
      accessLevel: "read" | "write";
      sharedAt: Date;
    }[]
  > {
    const user = await User.findOne({ email });
    return user?.sharedKnowledgeSources || [];
  }

  async updateUser(
    email: string,
    updates: Partial<IUser>,
  ): Promise<IUser | null> {
    const doc = await User.findOneAndUpdate(
      { email },
      { $set: updates },
      { new: true },
    );
    return doc ? doc.toJSON() : null;
  }

  /**
   * List users with optional nameContains filter and pagination.
   * @param params { nameContains?: string, skip?: number, limit?: number }
   */
  async list(
    params: { nameContains?: string; skip?: number; limit?: number } = {},
  ): Promise<IUser[]> {
    const { nameContains, skip = 0, limit = 20 } = params;
    const filter: any = {};
    if (nameContains) {
      filter.name = { $regex: nameContains, $options: "i" };
    }
    const docs = await User.find(filter).skip(skip).limit(limit);
    return docs.map((doc) => doc.toJSON());
  }
}
