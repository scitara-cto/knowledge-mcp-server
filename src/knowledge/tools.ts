import type { ToolDefinition } from "dynamic-mcp-server";

export const tools: ToolDefinition[] = [
  {
    name: "add-knowledge",
    description: "Add a new knowledge source to the system",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Unique identifier for the knowledge source",
        },
        description: {
          type: "string",
          description: "Human-readable description of the knowledge source",
        },
        type: {
          type: "string",
          description: "Type of the knowledge source (e.g., website)",
        },
        options: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the website (for website type)",
            },
          },
          required: ["url"],
          description:
            "Options for the knowledge source (e.g., url for website)",
        },
      },
      required: ["name", "description", "type", "options"],
    },
    annotations: {
      title: "Add Knowledge",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: {
      type: "knowledge",
      config: {
        action: "add-knowledge",
      },
    },
  },
  {
    name: "search",
    description: "Search across all knowledge sources for relevant information",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        knowledgeSourceId: {
          type: "string",
          description: "ID of the knowledge source to search",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return",
          default: 5,
        },
      },
      required: ["query", "knowledgeSourceId"],
    },
    annotations: {
      title: "Search Knowledge",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: {
      type: "knowledge",
      config: {
        action: "search",
      },
    },
  },
  {
    name: "use-knowledge-source",
    description: "Create a specialized tool for a specific knowledge source",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Name of the knowledge source to create a tool for",
        },
        description: {
          type: "string",
          description: "Description of what the specialized tool does",
        },
      },
      required: ["name", "description"],
    },
    annotations: {
      title: "Use Knowledge Source",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: {
      type: "knowledge",
      config: {
        action: "use-knowledge-source",
      },
    },
  },
  {
    name: "refresh-knowledge-source",
    description: "Refresh the documents in a knowledge source",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Name of the knowledge source to refresh",
        },
        documents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "The content of the document",
              },
              metadata: {
                type: "object",
                description: "Optional metadata about the document",
                additionalProperties: true,
              },
            },
            required: ["content"],
          },
          description: "Array of documents to update in the knowledge source",
        },
      },
      required: ["name", "documents"],
    },
    annotations: {
      title: "Refresh Knowledge Source",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    handler: {
      type: "knowledge",
      config: {
        action: "refresh-knowledge-source",
      },
    },
  },
  {
    name: "share-knowledge-source",
    description: "Share a knowledge source with another user",
    inputSchema: {
      type: "object" as const,
      properties: {
        knowledgeSourceId: {
          type: "string",
          description: "ID of the knowledge source to share",
        },
        targetEmail: {
          type: "string",
          description: "Email of the user to share with",
        },
        accessLevel: {
          type: "string",
          enum: ["read", "write"],
          description: "Access level to grant (read or write)",
          default: "read",
        },
      },
      required: ["knowledgeSourceId", "targetEmail"],
    },
    annotations: {
      title: "Share Knowledge Source",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: {
      type: "knowledge",
      config: {
        action: "share-knowledge-source",
      },
    },
  },
];
