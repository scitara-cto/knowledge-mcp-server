import { KnowledgeSource, IKnowledgeSource } from "../KnowledgeSource.js";
import { EmbeddedChunkRepository } from "./EmbeddedChunkRepository.js";
import { embedTextOpenAI } from "../../../handlers/knowledge/utils/embedText.js";

export class KnowledgeSourceRepository {
  async findById(id: string): Promise<IKnowledgeSource> {
    const doc = await KnowledgeSource.findOne({ _id: id });
    if (!doc) {
      throw new Error(`KnowledgeSource with id ${id} not found`);
    }
    return doc.toJSON();
  }

  async findByNameAndUser(
    name: string,
    createdBy: string,
  ): Promise<IKnowledgeSource | null> {
    const doc = await KnowledgeSource.findOne({ name, createdBy });
    return doc ? doc.toJSON() : null;
  }

  async deleteByNameAndUser(name: string, createdBy: string): Promise<boolean> {
    const result = await KnowledgeSource.deleteOne({ name, createdBy });
    return result.deletedCount > 0;
  }

  async create(
    knowledgeSource: Partial<IKnowledgeSource>,
  ): Promise<IKnowledgeSource> {
    const newKnowledgeSource = new KnowledgeSource(knowledgeSource);
    const saved = await newKnowledgeSource.save();
    return saved.toJSON();
  }

  async updateStatus(
    id: string,
    status: IKnowledgeSource["status"],
    error?: string,
  ): Promise<IKnowledgeSource | null> {
    const doc = await KnowledgeSource.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          status,
          ...(error && { error }),
          updatedAt: new Date(),
        },
      },
      { new: true },
    );
    return doc ? doc.toJSON() : null;
  }

  async findByCreator(clientId: string): Promise<IKnowledgeSource[]> {
    const docs = await KnowledgeSource.find({ createdBy: clientId });
    return docs.map((doc) => doc.toJSON());
  }

  async update(
    id: string,
    updates: Partial<IKnowledgeSource>,
  ): Promise<IKnowledgeSource | null> {
    const doc = await KnowledgeSource.findOneAndUpdate(
      { _id: id },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true },
    );
    return doc ? doc.toJSON() : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await KnowledgeSource.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  /**
   * List knowledge sources with optional nameContains filter and pagination.
   * @param params { nameContains?: string, skip?: number, limit?: number }
   */
  async list(
    params: { nameContains?: string; skip?: number; limit?: number } = {},
  ): Promise<IKnowledgeSource[]> {
    const { nameContains, skip = 0, limit = 20 } = params;
    const filter: any = {};
    if (nameContains) {
      filter.name = { $regex: nameContains, $options: "i" };
    }
    const docs = await KnowledgeSource.find(filter).skip(skip).limit(limit);
    return docs.map((doc) => doc.toJSON());
  }

  /**
   * Search documents for a knowledge source using vector search.
   */
  async searchDocuments(
    query: string,
    options: {
      knowledgeSourceId: string;
      limit?: number;
      skip?: number;
      minScore?: number;
    },
  ): Promise<any[]> {
    const { knowledgeSourceId, limit = 5, skip = 0, minScore } = options;
    if (!query || !knowledgeSourceId)
      throw new Error("Both 'query' and 'knowledgeSourceId' are required.");
    // 1. Embed the query
    const embedding = await embedTextOpenAI(query);
    // 2. Vector search
    const embeddedChunkRepo = new EmbeddedChunkRepository();
    const { results } = await embeddedChunkRepo.findSimilarChunks(
      embedding,
      knowledgeSourceId,
      limit,
      skip,
      minScore,
    );
    return results;
  }
}
