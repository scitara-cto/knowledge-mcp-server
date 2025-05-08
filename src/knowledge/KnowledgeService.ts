import { SessionInfo } from "dynamic-mcp-server";
import { RAGApplicationBuilder } from "@llm-tools/embedjs";
import { OpenAiEmbeddings } from "@llm-tools/embedjs-openai";
import { MongoDb } from "@llm-tools/embedjs-mongodb";
import { SitemapLoader } from "@llm-tools/embedjs-loader-sitemap";
import { UserRepository } from "../repositories/UserRepository.js";
import { KnowledgeSourceRepository } from "../repositories/KnowledgeSourceRepository.js";
import { IKnowledgeSource } from "../models/KnowledgeSource.js";

export interface KnowledgeSource {
  id: string;
  name: string;
  description: string;
  sourceType: "website" | "onedrive";
  sourceUrl: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: "processing" | "ready" | "error";
  error?: string;
  config?: {
    crawlDepth?: number;
    urlPatterns?: string[];
  };
}

export interface KnowledgeDocument {
  id: string;
  knowledgeSourceId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export class KnowledgeService {
  private ragApp: any;
  private userRepository: UserRepository;
  private knowledgeSourceRepository: KnowledgeSourceRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.knowledgeSourceRepository = new KnowledgeSourceRepository();
  }

  async initialize() {
    // Initialize RAG application with MongoDB
    this.ragApp = await new RAGApplicationBuilder()
      .setEmbeddingModel(new OpenAiEmbeddings())
      .setVectorDatabase(
        new MongoDb({
          connectionString: process.env.MONGODB_URI || "",
          dbName: "knowledge",
          collectionName: "embeddings",
        }),
      )
      .build();
  }

  async addKnowledgeSource(
    source: Partial<IKnowledgeSource>,
    sessionInfo: SessionInfo,
  ) {
    if (!sessionInfo.user?.email) {
      throw new Error("User email is required");
    }

    // Get or create user
    let user = await this.userRepository.findByEmail(sessionInfo.user.email);
    if (!user) {
      user = await this.userRepository.create({
        email: sessionInfo.user.email,
        name: sessionInfo.user.name,
      });
    }

    // Create knowledge source
    const knowledgeSource = (await this.knowledgeSourceRepository.create({
      ...source,
      createdBy: user.email,
      status: "processing",
    })) as any;

    try {
      // Use appropriate loader based on source type
      if (source.sourceType === "website") {
        const loader = new SitemapLoader({ url: source.sourceUrl || "" });
        await this.ragApp.addLoader(loader);
      }

      // Update status and add to user's knowledge sources
      await this.knowledgeSourceRepository.updateStatus(
        knowledgeSource.id,
        "ready",
      );
      await this.userRepository.addKnowledgeSource(
        user.email,
        knowledgeSource.id,
      );

      return knowledgeSource;
    } catch (error) {
      await this.knowledgeSourceRepository.updateStatus(
        knowledgeSource.id,
        "error",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async searchKnowledge(query: string) {
    const results = await this.ragApp.query(query);
    if (!Array.isArray(results)) {
      return results ? [results] : [];
    }
    return results;
  }

  async getKnowledgeSource(id: string): Promise<IKnowledgeSource | null> {
    return this.knowledgeSourceRepository.findById(id);
  }

  async searchDocuments(
    query: string,
    options: {
      limit?: number;
      knowledgeSourceId?: string;
      clientId?: string;
    } = {},
  ) {
    if (!options.knowledgeSourceId) {
      throw new Error("knowledgeSourceId is required for search");
    }

    if (!options.clientId) {
      throw new Error("clientId is required for search");
    }

    // Check if user has access to this knowledge source
    const hasAccess = await this.userRepository.hasAccessToKnowledgeSource(
      options.clientId,
      options.knowledgeSourceId,
    );

    if (!hasAccess) {
      throw new Error("User does not have access to this knowledge source");
    }

    const results = await this.searchKnowledge(query);

    // Convert results to KnowledgeDocument format
    return results.map((doc: any) => ({
      id: doc.id,
      knowledgeSourceId: options.knowledgeSourceId,
      content: doc.content,
      metadata: doc.metadata,
    }));
  }

  async reprocessKnowledgeSource(id: string, clientId: string): Promise<void> {
    // Check if user has write access
    const hasAccess = await this.userRepository.hasAccessToKnowledgeSource(
      clientId,
      id,
      "write",
    );

    if (!hasAccess) {
      throw new Error(
        "User does not have write access to this knowledge source",
      );
    }

    const knowledgeSource = await this.knowledgeSourceRepository.findById(id);
    if (!knowledgeSource) {
      throw new Error("Knowledge source not found");
    }

    // Update status to processing
    await this.knowledgeSourceRepository.updateStatus(id, "processing");

    try {
      // Clear existing vector store
      await this.ragApp.reset();

      // Re-process the source based on type
      if (knowledgeSource.sourceType === "website") {
        const loader = new SitemapLoader({
          urlOrContent: knowledgeSource.sourceUrl,
          chunkSize: 1000,
          chunkOverlap: 200,
        });
        await this.ragApp.addLoader(loader);
      }

      // Update status to ready
      await this.knowledgeSourceRepository.updateStatus(id, "ready");
    } catch (error) {
      await this.knowledgeSourceRepository.updateStatus(
        id,
        "error",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async shareKnowledgeSource(
    ownerId: string,
    targetClientId: string,
    knowledgeSourceId: string,
    accessLevel: "read" | "write" = "read",
  ): Promise<void> {
    await this.userRepository.shareKnowledgeSource(
      ownerId,
      targetClientId,
      knowledgeSourceId,
      accessLevel,
    );
  }
}
