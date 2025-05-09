import { EmbeddedChunk, IEmbeddedChunk } from "../EmbeddedChunk.js";

export class EmbeddedChunkRepository {
  async insertMany(chunks: IEmbeddedChunk[]): Promise<void> {
    await EmbeddedChunk.insertMany(chunks);
  }

  async findByKnowledgeSourceId(
    knowledgeSourceId: string,
  ): Promise<IEmbeddedChunk[]> {
    return EmbeddedChunk.find({ knowledgeSourceId }).lean();
  }

  async deleteByKnowledgeSourceId(knowledgeSourceId: string): Promise<void> {
    await EmbeddedChunk.deleteMany({ knowledgeSourceId });
  }

  /**
   * Find the most similar embedded chunks for a given knowledge source using vector search.
   * Supports pagination (skip) and minimum similarity score (minScore).
   * Returns { results, total }
   */
  async findSimilarChunks(
    embedding: number[],
    knowledgeSourceId: string,
    limit: number = 5,
    skip: number = 0,
    minScore?: number,
  ) {
    const collection = EmbeddedChunk.collection;
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          queryVector: embedding,
          path: "embedding",
          k: skip + limit, // fetch enough to allow skipping
          limit: skip + limit, // required by MongoDB Atlas
          filter: { knowledgeSourceId },
          similarity: "cosine",
          numCandidates: 100,
        },
      },
      {
        $project: {
          _id: 1,
          text: 1,
          fileName: 1,
          filePath: 1,
          fileType: 1,
          knowledgeSourceId: 1,
          similarity: { $meta: "vectorSearchScore" },
        },
      },
    ];
    let results = await collection.aggregate(pipeline).toArray();
    if (minScore !== undefined) {
      results = results.filter((r: any) => r.similarity >= minScore);
    }
    const total = results.length;
    results = results.slice(skip, skip + limit);
    return { results, total };
  }
}
