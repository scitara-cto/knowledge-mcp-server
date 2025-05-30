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
        path: {
          type: "string",
          description: "OneDrive folder or file path to ingest",
        },
      },
      required: ["name", "description", "path"],
    },
    rolesPermitted: ["power-user", "admin"],
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
    rolesPermitted: ["user", "power-user", "admin"],
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
    description:
      "Create a specialized tool for a specific knowledge source. To use this, first call the list-knowledge-sources tool to retrieve available sources and their details. Then, provide a user-friendly toolName (e.g., 'search-acme-co') and a toolDescription (e.g., 'Use this tool to find information on Acme Co.') that clearly describe the tool's purpose.",
    inputSchema: {
      type: "object" as const,
      properties: {
        knowledgeSourceId: {
          type: "string",
          description: "ID of the knowledge source to create a tool for",
        },
        toolName: {
          type: "string",
          description:
            "A clear, user-friendly name for the new tool (e.g., 'search-acme-co').",
        },
        toolDescription: {
          type: "string",
          description:
            "A description explaining what the tool does (e.g., 'Use this tool to find information on Acme Co.').",
        },
      },
      required: ["knowledgeSourceId", "toolName", "toolDescription"],
    },
    rolesPermitted: ["power-user", "admin"],
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
    description:
      "Refresh a knowledge source by re-ingesting its original content from the source (e.g., OneDrive).",
    inputSchema: {
      type: "object" as const,
      properties: {
        knowledgeSourceId: {
          type: "string",
          description: "ID of the knowledge source to refresh",
        },
        name: {
          type: "string",
          description:
            "(Optional) Name of the knowledge source (for display/logging)",
        },
      },
      required: ["knowledgeSourceId"],
    },
    rolesPermitted: ["power-user", "admin"],
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
    rolesPermitted: ["power-user", "admin"],
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
  {
    name: "search-onedrive-files",
    description: "Search for files in the user's OneDrive account.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query for file names or contents.",
        },
        path: {
          type: "string",
          description: "(Optional) OneDrive folder path to search within.",
          nullable: true,
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return.",
          nullable: true,
        },
      },
      required: ["query"],
    },
    rolesPermitted: ["user", "power-user", "admin"],
    handler: {
      type: "knowledge",
      config: {
        action: "search-onedrive-files",
      },
    },
  },
  {
    name: "retrieve-onedrive-file",
    description:
      "Retrieve and extract text from a file in the user's OneDrive account.",
    inputSchema: {
      type: "object" as const,
      properties: {
        fileId: {
          type: "string",
          description: "The OneDrive file ID to retrieve.",
        },
        maxLength: {
          type: "number",
          description: "Maximum number of characters to extract from the file.",
          nullable: true,
        },
      },
      required: ["fileId"],
    },
    rolesPermitted: ["user", "power-user", "admin"],
    handler: {
      type: "knowledge",
      config: {
        action: "retrieve-onedrive-file",
      },
    },
  },
  {
    name: "delete-knowledge-source",
    description: "Delete a knowledge source and all its data",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Name of the knowledge source" },
      },
      required: ["name"],
    },
    rolesPermitted: ["power-user", "admin"],
    annotations: {
      title: "Delete Knowledge Source",
      destructiveHint: true,
    },
    handler: {
      type: "knowledge",
      config: { action: "delete-knowledge-source" },
    },
  },
  {
    name: "list-knowledge-sources",
    description:
      "List available knowledge sources, optionally filtered by name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        nameContains: {
          type: "string",
          description:
            "Filter knowledge sources by name substring (case-insensitive)",
        },
        limit: {
          type: "number",
          description: "Maximum number of sources to return",
          default: 10,
        },
      },
      required: [],
    },
    rolesPermitted: ["power-user", "admin"],
    annotations: {
      title: "List Knowledge Sources",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: {
      type: "knowledge",
      config: {
        action: "list-knowledge-sources",
      },
    },
  },
];
