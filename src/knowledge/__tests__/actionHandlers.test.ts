import { jest, expect, describe, it, beforeEach } from "@jest/globals";
import { KnowledgeService } from "../KnowledgeService.js";
import { UserRepository } from "../../repositories/UserRepository.js";
import { KnowledgeSourceRepository } from "../../repositories/KnowledgeSourceRepository.js";
import { SessionInfo } from "dynamic-mcp-server";
import mongoose from "mongoose";

// Mock MongoDB
jest.mock("mongoose", () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  connection: {
    dropDatabase: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock embedjs-mongodb
jest.mock("@llm-tools/embedjs-mongodb", () => ({
  MongoDb: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    addDocument: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
    reset: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
  })),
}));

// Mock OpenAI embeddings
jest.mock("@llm-tools/embedjs-openai", () => ({
  OpenAiEmbeddings: jest.fn().mockImplementation(() => ({
    embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    initialize: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock WebLoader
jest.mock("@llm-tools/embedjs-loader-web", () => ({
  WebLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue([]),
    initialize: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock RAG application
jest.mock("@llm-tools/embedjs", () => ({
  RAGApplicationBuilder: jest.fn().mockImplementation(() => ({
    setEmbeddingModel: jest.fn().mockReturnThis(),
    setVectorDatabase: jest.fn().mockReturnThis(),
    build: jest.fn().mockResolvedValue({
      addLoader: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
      reset: jest.fn().mockResolvedValue(undefined),
      initialize: jest.fn().mockResolvedValue(undefined),
    }),
  })),
}));

// Create mock instances
const mockUserRepo = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  addKnowledgeSource: jest.fn(),
  shareKnowledgeSource: jest.fn(),
  hasAccessToKnowledgeSource: jest.fn(),
  getUserByEmail: jest.fn(),
};

const mockKnowledgeSourceRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  searchDocuments: jest.fn(),
  createKnowledgeSource: jest.fn(),
  getKnowledgeSourceById: jest.fn(),
};

// Mock the repositories and OpenAI embeddings
jest.mock("../../repositories/UserRepository.js", () => ({
  UserRepository: jest.fn().mockImplementation(() => mockUserRepo),
}));

jest.mock("../../repositories/KnowledgeSourceRepository.js", () => ({
  KnowledgeSourceRepository: jest
    .fn()
    .mockImplementation(() => mockKnowledgeSourceRepo),
}));

// Mock process.env for OpenAI API key and MongoDB connection
process.env.OPENAI_API_KEY = "test-api-key";
process.env.MONGODB_URI = "mongodb://localhost:27017/test";

describe("Knowledge Action Handlers", () => {
  let service: KnowledgeService;
  const mockSessionInfo: SessionInfo = {
    user: {
      email: "test@example.com",
      name: "Test User",
      active: true,
      sub: "test-sub",
      clientId: "test-client",
      scopes: [],
    },
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Clear the database
    await mongoose.connection.dropDatabase();

    // Create and initialize service
    service = new KnowledgeService();
    await service.initialize();
  }, 30000);

  describe("addKnowledgeSource", () => {
    it("should handle adding a new knowledge source", async () => {
      const mockUser = {
        email: "test@example.com",
        name: "Test User",
        sharedKnowledgeSources: [],
      };

      const mockKnowledgeSource = {
        _id: "test-id",
        id: "test-id",
        name: "Test Knowledge Source",
        description: "Test Description",
        sourceType: "website",
        sourceUrl: "https://example.com",
        createdBy: "test@example.com",
        status: "ready",
      };

      mockUserRepo.getUserByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockKnowledgeSourceRepo.createKnowledgeSource.mockResolvedValue(
        mockKnowledgeSource,
      );

      const result = await service.addKnowledgeSource(
        {
          name: "Test Knowledge Source",
          description: "Test Description",
          sourceType: "website",
          sourceUrl: "https://example.com",
        },
        mockSessionInfo,
      );

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Knowledge Source");
      expect(result.description).toBe("Test Description");
      expect(result.sourceType).toBe("website");
      expect(result.sourceUrl).toBe("https://example.com");
      expect(result.createdBy).toBe("test@example.com");
      expect(result.status).toBe("ready");
    }, 10000);

    it("should throw error if user email is missing", async () => {
      await expect(
        service.addKnowledgeSource(
          {
            name: "Test Knowledge Source",
            description: "Test Description",
            sourceType: "website",
            sourceUrl: "https://example.com",
          },
          { user: { email: "" } } as SessionInfo,
        ),
      ).rejects.toThrow("User email is required");
    }, 10000);
  });

  describe("shareKnowledgeSource", () => {
    it("should handle sharing a knowledge source", async () => {
      const mockOwner = {
        email: "owner@example.com",
        name: "Owner User",
        sharedKnowledgeSources: [],
        knowledgeSources: ["test-id"],
      };

      const mockTarget = {
        email: "target@example.com",
        name: "Target User",
        sharedKnowledgeSources: [],
      };

      const mockKnowledgeSource = {
        _id: "test-id",
        id: "test-id",
        name: "Test Knowledge Source",
        createdBy: "owner@example.com",
      };

      mockUserRepo.getUserByEmail.mockImplementation((email) => {
        if (email === "owner@example.com") return Promise.resolve(mockOwner);
        if (email === "target@example.com") return Promise.resolve(mockTarget);
        return Promise.resolve(null);
      });

      mockKnowledgeSourceRepo.getKnowledgeSourceById.mockResolvedValue(
        mockKnowledgeSource,
      );
      mockUserRepo.shareKnowledgeSource.mockResolvedValue(mockTarget);
      mockUserRepo.hasAccessToKnowledgeSource.mockResolvedValue(true);

      await service.shareKnowledgeSource(
        "owner@example.com",
        "target@example.com",
        "test-id",
        "read",
      );

      expect(mockUserRepo.shareKnowledgeSource).toHaveBeenCalledWith(
        "target@example.com",
        "test-id",
        "read",
      );
    }, 10000);

    it("should throw error if owner does not have access to the knowledge source", async () => {
      const mockOwner = {
        email: "owner@example.com",
        name: "Owner User",
        sharedKnowledgeSources: [],
        knowledgeSources: [],
      };

      const mockKnowledgeSource = {
        _id: "test-id",
        id: "test-id",
        name: "Test Knowledge Source",
        createdBy: "different@example.com",
      };

      mockUserRepo.getUserByEmail.mockResolvedValue(mockOwner);
      mockKnowledgeSourceRepo.getKnowledgeSourceById.mockResolvedValue(
        mockKnowledgeSource,
      );
      mockUserRepo.hasAccessToKnowledgeSource.mockResolvedValue(false);

      await expect(
        service.shareKnowledgeSource(
          "owner@example.com",
          "target@example.com",
          "test-id",
          "read",
        ),
      ).rejects.toThrow("Owner does not have access to this knowledge source");
    }, 10000);
  });

  describe("searchDocuments", () => {
    it("should handle searching documents", async () => {
      const mockUser = {
        email: "test@example.com",
        name: "Test User",
        sharedKnowledgeSources: [
          {
            knowledgeSourceId: "test-id",
            accessLevel: "read",
          },
        ],
      };

      const mockResults = [
        {
          id: "doc1",
          content: "Test content 1",
          metadata: {},
        },
        {
          id: "doc2",
          content: "Test content 2",
          metadata: {},
        },
      ];

      mockUserRepo.getUserByEmail.mockResolvedValue(mockUser);
      mockKnowledgeSourceRepo.searchDocuments.mockResolvedValue(mockResults);
      mockUserRepo.hasAccessToKnowledgeSource.mockResolvedValue(true);

      const results = await service.searchDocuments("test query", {
        knowledgeSourceId: "test-id",
        clientId: "test-client",
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      expect(results[0].content).toBe("Test content 1");
      expect(results[1].content).toBe("Test content 2");
    }, 10000);

    it("should throw error if user does not have access to the knowledge source", async () => {
      const mockUser = {
        email: "test@example.com",
        name: "Test User",
        sharedKnowledgeSources: [],
      };

      mockUserRepo.getUserByEmail.mockResolvedValue(mockUser);
      mockUserRepo.hasAccessToKnowledgeSource.mockResolvedValue(false);

      await expect(
        service.searchDocuments("test query", {
          knowledgeSourceId: "test-id",
          clientId: "test-client",
        }),
      ).rejects.toThrow("User does not have access to this knowledge source");
    }, 10000);
  });
});
