# Knowledge MCP Server Specification

## Overview

The Knowledge MCP Server is an extension of the dynamic-mcp-server framework that provides tools for managing and querying knowledge bases through vector databases. This server enables users to create, populate, and search knowledge sources, making it easy to build AI-powered applications that can access and utilize specific knowledge domains.

---

## OneDrive Integration (Enhanced)

### Microsoft OneDrive Authorization & Token Management

- **User Authorization Flow:**
  - On a user's first attempt to access OneDrive features, the MCP server responds with an "unauthorized" error and provides a URL for the user to authenticate and grant access.
  - The user follows the URL, authenticates with Microsoft, and grants the MCP server the necessary permissions.
  - The MCP server receives and securely stores the user's authentication tokens in their user account record.
  - The server manages token refreshes as needed, ensuring continued access without repeated user intervention.

### Creating a Knowledge Source from OneDrive (Revised)

### Overview

When a user creates a knowledge source from a OneDrive path, the Knowledge MCP Server will:

- Authenticate and authorize access to the user's OneDrive via Microsoft Graph API.
- Recursively enumerate all files under the specified path.
- For each file, extract text using [officeParser](https://github.com/harshankur/officeParser) (for office files) or other appropriate extractors (for PDFs, plain text, etc.).
- Chunk and embed the extracted text, associating all embeddings with the knowledge source ID for efficient search.
- Track and report any files that could not be processed.

### Detailed Flow

1. **User Initiates Knowledge Source Creation**

   - User provides a OneDrive path (folder or file) and a name/description for the knowledge source.

2. **Authorization Check**

   - The server checks if the user has valid Microsoft Graph tokens.
   - If not, the server returns an authorization error and a URL for the user to complete the OAuth2 flow.

3. **File Enumeration**

   - Using the Microsoft Graph API, the server recursively lists all files under the specified OneDrive path.
   - For each file, the server retrieves metadata (name, path, size, type, last modified).

4. **Text Extraction**

   - For each file:
     - If the file is an Office document (`.docx`, `.pptx`, `.xlsx`, `.odt`, `.odp`, `.ods`), use [officeParser](https://github.com/harshankur/officeParser) to extract text.
       ```js
       const officeParser = require("officeparser");
       const text = await officeParser.parseOfficeAsync(fileBuffer);
       ```
     - For PDFs, use a PDF extraction library (e.g., `pdf-parse`).
     - For plain text files, read as UTF-8.
     - If extraction fails, add the file to an "unable to extract" list with the error reason.

5. **Chunking and Embedding**

   - Chunk the extracted text into manageable segments (e.g., 500–1000 characters per chunk).
   - Generate vector embeddings for each chunk using the configured embedding model (e.g., OpenAI, HuggingFace, etc.).
   - Store each embedding in the MongoDB vector collection, associating it with the knowledge source ID and file metadata.

6. **Indexing and Metadata**

   - Each embedding record includes:
     - The chunked text
     - The knowledge source ID
     - File metadata (name, path, type, etc.)
     - Embedding vector

7. **Completion and Reporting**
   - After all files are processed:
     - The server returns a summary to the user, including:
       - Number of files processed
       - Number of files successfully extracted and embedded
       - List of files that could not be processed, with error messages

### Example Pseudocode

```js
// 1. List files recursively from OneDrive
const files = await listFilesFromOneDrivePath(user, path);

// 2. For each file, extract text
const results = await Promise.all(
  files.map(async (file) => {
    try {
      let text;
      if (isOfficeFile(file.name)) {
        text = await officeParser.parseOfficeAsync(file.buffer);
      } else if (isPdf(file.name)) {
        text = await pdfParse(file.buffer);
      } else if (isTextFile(file.name)) {
        text = file.buffer.toString("utf-8");
      } else {
        throw new Error("Unsupported file type");
      }
      // 3. Chunk and embed
      const chunks = chunkText(text);
      await Promise.all(
        chunks.map((chunk) =>
          storeEmbedding(chunk, knowledgeSourceId, file.metadata),
        ),
      );
      return { file: file.name, status: "success" };
    } catch (err) {
      return { file: file.name, status: "error", error: err.message };
    }
  }),
);

// 4. Summarize results
const summary = {
  processed: results.length,
  success: results.filter((r) => r.status === "success").length,
  failed: results.filter((r) => r.status === "error"),
};
```

### Implementation Notes

- **Text Extraction:**
  - [officeParser](https://github.com/harshankur/officeParser) is used for all supported office file types and PDFs.
  - For other formats, use specialized extractors as needed.
- **Chunking:**
  - Use a configurable chunk size and overlap for optimal embedding and search.
- **Embeddings:**
  - Use a pluggable embedding model; store vectors in MongoDB, indexed by knowledge source ID.
- **Error Handling:**
  - All extraction and embedding errors are logged and reported to the user.
- **Performance:**
  - Extraction and embedding can be parallelized for large file sets.
- **Security:**
  - All file buffers are processed in-memory and not written to disk unless necessary.

### Example: Using officeParser

```js
const officeParser = require("officeparser");
const fs = require("fs");

const fileBuffer = fs.readFileSync("/path/to/file.docx");
officeParser
  .parseOfficeAsync(fileBuffer)
  .then((text) => {
    // Use extracted text
  })
  .catch((err) => {
    // Handle extraction error
  });
```

See [officeParser GitHub](https://github.com/harshankur/officeParser) for more details.

### Searching Knowledge Sources

- **Search API:**
  - Users can search one or more knowledge sources by specifying their IDs, search terms, and a minimum similarity score.
  - The server queries the vector database, filtering by knowledge source ID(s) and returning chunks with vector proximity above the specified score.
  - Results are returned as an array of matching text chunks, each with its score and metadata.

### Use-Knowledge-Source Tool Publishing

- **Tool Generation:**
  - The server provides a "use-knowledge-source" tool, allowing users to create custom tools that search a specific knowledge source.
  - These tools abstract away the need for users to remember knowledge source IDs or specify search parameters, providing a streamlined and intuitive interface.

### OneDrive File Access Tools

#### search-onedrive-files

- **Purpose:** Allow users to search their OneDrive for files by name within a specified path.
- **Functionality:**
  - Accepts a OneDrive path (folder) and a file name pattern (supports substring or regex).
  - Returns a list of matching files, including their names, paths, sizes, and last modified dates.

#### retrieve-onedrive-file

- **Purpose:** Retrieve a file from OneDrive by name/path, extract its text, and return the text (with a length limit).
- **Functionality:**
  - Accepts a OneDrive file path (or unique file ID).
  - Extracts text from the file using the server's extraction pipeline.
  - Returns the extracted text, truncated to a default length (e.g., 1,000 characters), unless a larger limit is specified by the user (up to a maximum allowed by the server).
  - If the file cannot be extracted, returns an error or a message indicating the file type is unsupported.

### Integration Notes and Example User Flows

- **Authentication:** These tools require the user to have authorized OneDrive access. If not, the server will return an authorization error and a URL for the user to authenticate.
- **Text Extraction:** The server uses its existing extraction pipeline (e.g., officeParser, pdf-parse, etc.) to extract text from supported file types.
- **Length Limit:** The server enforces a default and maximum length for returned text to prevent excessive payloads and ensure performance.
- **Error Handling:** If a file cannot be found, accessed, or extracted, the tool returns a clear error message.

#### Example User Flow

1. **User searches for files:**

   - Calls `search-onedrive-files` with a path and name pattern.
   - Receives a list of matching files.

2. **User retrieves a file:**
   - Calls `retrieve-onedrive-file` with the file path and (optionally) a length limit.
   - Receives the extracted text (truncated as needed).

---

## Core Functionality

The server provides three main tools that work together to create a complete knowledge management system:

1. **add-knowledge**

   - Purpose: Ingests and processes new documents into a knowledge source
   - Functionality:
     - Accepts document sources (URLs, text, or file uploads)
     - Scrapes and processes the content
     - Chunks the content into appropriate segments
     - Embeds the chunks into a vector database
     - Associates the content with a specific knowledge source

2. **search**

   - Purpose: Queries a specific knowledge source for relevant information
   - Functionality:
     - Accepts search terms and a knowledge source identifier
     - Performs semantic search against the vector database
     - Returns relevant document fragments with metadata
     - Supports filtering and ranking of results

3. **use-knowledge-source**

   - Purpose: Creates a new tool for interacting with a specific knowledge source
   - Functionality:
     - Generates a new tool definition for a specific knowledge source
     - Configures the tool with appropriate parameters and constraints
     - Enables dynamic tool registration for the knowledge source
     - Provides a consistent interface for knowledge source interaction

4. **refresh-knowledge-source**

   - Purpose: Refreshes a knowledge source by re-ingesting its content
   - Functionality:
     - Accepts a knowledge source identifier
     - Updates the knowledge source status to processing
     - Clears the existing vector store
     - Re-processes the source
     - Updates the knowledge source status to ready

5. **search-onedrive-files**

   - Purpose: Search for files in your Microsoft OneDrive by name within a specified path.
   - Functionality:
     - Accepts a OneDrive path and a file name pattern
     - Returns a list of matching files with metadata

6. **retrieve-onedrive-file**
   - Purpose: Retrieve a file from your Microsoft OneDrive, extract its text, and return the text (with a length limit).
   - Functionality:
     - Accepts a OneDrive file path and an optional length limit
     - Extracts and returns the file's text, truncated as needed

## Technical Requirements

- Vector database integration for storing and querying embeddings
- Document processing pipeline for content ingestion
- Text chunking and embedding generation
- Dynamic tool registration and management
- Secure access control for knowledge sources
- API endpoints for tool interaction

## Implementation Details

### Project Structure

The project will follow a similar structure to the dlx-mcp-server, with the following key components:

```
src/
  knowledge/
    index.ts           # Main handler and tool exports
    tools.ts           # Tool definitions
    KnowledgeService.ts # Core service for knowledge operations
    addKnowledgeAction.ts    # Handler for adding knowledge
    searchAction.ts          # Handler for searching
    useKnowledgeSourceAction.ts # Handler for creating new tools
    refreshKnowledgeSourceAction.ts # Handler for refreshing knowledge sources
    __tests__/         # Test files
```

### Tool Definitions

The server will implement the following tools:

1. **add-knowledge**

```typescript
{
  name: "add-knowledge",
  description: "Add new content to a knowledge source",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "URL or text content to add to the knowledge source"
      },
      knowledgeSourceId: {
        type: "string",
        description: "ID of the knowledge source to add to"
      }
    },
    required: ["source", "knowledgeSourceId"]
  },
  annotations: {
    title: "Add Knowledge",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  handler: {
    type: "knowledge",
    config: {
      action: "add-knowledge"
    }
  }
}
```

2. **search**

```typescript
{
  name: "search",
  description: "Search a knowledge source for relevant information",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query"
      },
      knowledgeSourceId: {
        type: "string",
        description: "ID of the knowledge source to search"
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return",
        default: 5
      }
    },
    required: ["query", "knowledgeSourceId"]
  },
  annotations: {
    title: "Search Knowledge",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  handler: {
    type: "knowledge",
    config: {
      action: "search"
    }
  }
}
```

3. **use-knowledge-source**

```typescript
{
  name: "use-knowledge-source",
  description: "Create a new tool for a specific knowledge source",
  inputSchema: {
    type: "object",
    properties: {
      knowledgeSourceId: {
        type: "string",
        description: "ID of the knowledge source to create a tool for"
      }
    },
    required: ["knowledgeSourceId"]
  },
  annotations: {
    title: "Use Knowledge Source",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  handler: {
    type: "knowledge",
    config: {
      action: "use-knowledge-source"
    }
  }
}
```

4. **refresh-knowledge-source**

```typescript
{
  name: "refresh-knowledge-source",
  description: "Refresh a knowledge source by re-ingesting its content",
  inputSchema: {
    type: "object",
    properties: {
      knowledgeSourceId: {
        type: "string",
        description: "ID of the knowledge source to refresh"
      }
    },
    required: ["knowledgeSourceId"]
  },
  annotations: {
    title: "Refresh Knowledge Source",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false
  },
  handler: {
    type: "knowledge",
    config: {
      action: "refresh-knowledge-source"
    }
  }
}
```

5. **search-onedrive-files**

```typescript
{
  name: "search-onedrive-files",
  description: "Search for files in your Microsoft OneDrive by name within a specified path.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The OneDrive folder path to search within."
      },
      namePattern: {
        type: "string",
        description: "File name or pattern to search for (substring or regex)."
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return.",
        default: 20
      }
    },
    required: ["path", "namePattern"]
  },
  handler: {
    type: "onedrive",
    config: {
      action: "search-files"
    }
  }
}
```

6. **retrieve-onedrive-file**

```typescript
{
  name: "retrieve-onedrive-file",
  description: "Retrieve a file from your Microsoft OneDrive, extract its text, and return the text (with a length limit).",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The OneDrive file path to retrieve."
      },
      lengthLimit: {
        type: "number",
        description: "Maximum number of characters to return from the extracted text.",
        default: 1000,
        maximum: 10000
      }
    },
    required: ["path"]
  },
  handler: {
    type: "onedrive",
    config: {
      action: "retrieve-file"
    }
  }
}
```

### Tool Generation Example

The `use-knowledge-source` tool creates a specialized search tool for a specific knowledge source. This enables a more intuitive and streamlined user experience. Here's a concrete example:

1. **Initial Knowledge Source Creation**

   ```typescript
   // User creates a knowledge source about Acme Corp
   const knowledgeSource = await knowledgeService.createKnowledgeSource({
     name: "Acme Corporation Information",
     description:
       "Information about Acme Corp, including leadership, products, and company history",
     sourceType: "website",
     sourceUrl: "https://acme-corp.com/about",
     createdBy: "user123",
   });
   ```

2. **Creating a Specialized Tool**

   ```typescript
   // User creates a specialized tool for Acme Corp
   const acmeTool = await knowledgeService.createKnowledgeSourceTool(
     knowledgeSource.id,
   );
   ```

3. **Generated Tool Definition**

   ```typescript
   {
     name: "search-acme-corporation",
     description: "Search for information about Acme Corporation, including leadership, products, and company history",
     inputSchema: {
       type: "object",
       properties: {
         query: {
           type: "string",
           description: "What would you like to know about Acme Corporation?"
         },
         limit: {
           type: "number",
           description: "Maximum number of results to return",
           default: 5
         }
       },
       required: ["query"]
     },
     handler: {
       type: "knowledge",
       config: {
         action: "search",
         knowledgeSourceId: "acme-corp-123"
       }
     }
   }
   ```

4. **User Experience Flow**

   ```
   User: "Who is the CEO of Acme Corporation?"

   MCP Client: [Sees available tools]
   - search-acme-corporation: "Search for information about Acme Corporation..."
   - [Other tools...]

   MCP Client: [Selects search-acme-corporation tool]
   [Tool automatically uses the correct knowledge source]

   Result: "John Smith has been the CEO of Acme Corporation since 2020..."
   ```

### Benefits of Dynamic Tool Generation

1. **Improved User Experience**

   - Users don't need to know about knowledge source IDs
   - Tools have clear, specific purposes
   - Natural language queries are more intuitive

2. **Better Tool Discovery**

   - Tools are named and described based on their content
   - Users can easily find relevant tools
   - Tools can be organized by topic or domain

3. **Simplified Integration**

   - MCP clients can present tools in a more user-friendly way
   - No need to manage knowledge source IDs
   - Tools can be cached and reused

4. **Domain-Specific Tools**
   - Tools can be created for specific use cases
   - Multiple tools can be created for the same knowledge source
   - Tools can be tailored to different user needs

### Implementation Details

The `use-knowledge-source` action handler:

```typescript
async function handleUseKnowledgeSourceAction(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: any,
): Promise<HandlerOutput> {
  const { knowledgeSourceId } = args;

  // 1. Get knowledge source details
  const knowledgeSource = await knowledgeService.getKnowledgeSource(
    knowledgeSourceId,
  );

  // 2. Create a specialized tool definition
  const toolDefinition = {
    name: `search-${knowledgeSource.name.toLowerCase().replace(/\s+/g, "-")}`,
    description: `Search for information about ${knowledgeSource.name}. ${knowledgeSource.description}`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: `What would you like to know about ${knowledgeSource.name}?`,
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return",
          default: 5,
        },
      },
      required: ["query"],
    },
    handler: {
      type: "knowledge",
      config: {
        action: "search",
        knowledgeSourceId,
      },
    },
  };

  return {
    result: toolDefinition,
    message: `Created new tool for knowledge source "${knowledgeSource.name}"`,
  };
}
```

### Handler Implementation

The main handler will follow the pattern from dlx-mcp-server:

```typescript
const actionHandlers: Record<
  string,
  (
    args: Record<string, any>,
    context: SessionInfo,
    actionConfig: any,
  ) => Promise<HandlerOutput>
> = {
  "add-knowledge": handleAddKnowledgeAction,
  "search": handleSearchAction,
  "use-knowledge-source": handleUseKnowledgeSourceAction,
  "refresh-knowledge-source": handleRefreshKnowledgeSourceAction,
};

export async function knowledgeHandler(
  args: Record<string, any>,
  context: SessionInfo,
  actionConfig: any,
): Promise<HandlerOutput> {
  try {
    const handler = actionHandlers[actionConfig.action];
    if (!handler) {
      throw new Error(`Unknown action: ${actionConfig.action}`);
    }
    return await handler(args, context, actionConfig);
  } catch (error) {
    logger.error(`Knowledge handler error: ${error}`);
    throw error;
  }
}
```

### Service Layer

The `KnowledgeService` class will handle the core functionality:

- Document processing and chunking
- Vector database operations
- Knowledge source management
- Tool generation for knowledge sources

### Testing Strategy

The project will use Jest for testing with the following test categories:

1. Unit tests for individual actions
2. Integration tests for the KnowledgeService
3. End-to-end tests for the complete tool workflow
4. Mock tests for vector database interactions

### Dependencies

The project will use the following key dependencies:

- `officeParser` - For text extraction from office files and PDFs
- `mongodb` - For vector storage and querying
- `dynamic-mcp-server` - Base MCP server framework

### Document Source Support

The server will initially support the following document sources:

1. **Microsoft OneDrive** (Future Implementation)
   - Will require custom document loader implementation
   - Recursively traverses OneDrive directory structure
   - Supports various document formats (PDF, DOCX, etc.)
   - Requires Microsoft Graph API integration
   - Authentication and authorization handling

### Knowledge Source Management

The server will use the following for the following operations:

1. **Document Processing**

   - Automatic content extraction from supported sources
   - Text chunking with configurable parameters
   - Metadata extraction and preservation
   - Content deduplication

2. **Vector Storage**

   - Uses MongoDB's vector search capabilities
   - Store document chunks and their embeddings
   - Index metadata for filtering and sorting

3. **Search and Retrieval**
   - Semantic search using the vector database
   - Configurable similarity thresholds
   - Metadata-based filtering
   - Result ranking and scoring

### Implementation Phases

1. **Phase 1: Basic OneDrive Support**

   - Implement core MCP server structure
   - Integrate a web crawler for website crawling
   - Implement basic knowledge source management
   - Add search functionality
   - Create initial tool definitions

2. **Phase 2: OneDrive Integration**
   - Design OneDrive document loader
   - Implement Microsoft Graph API integration
   - Add authentication handling
   - Extend tool definitions for OneDrive support
   - Add document format support

### Knowledge Service Implementation

The `KnowledgeService` class will integrate with the vector database:

```typescript
import { EmbedJs } from "embedJs";

class KnowledgeService {
  private embedJs: EmbedJs;

  constructor(config: KnowledgeServiceConfig) {
    this.embedJs = new EmbedJs({
      // embedJs configuration
    });
  }

  async addKnowledgeSource(source: string, options: AddKnowledgeOptions) {
    // Use embedJs to process and store the knowledge source
  }

  async searchKnowledgeSource(query: string, sourceId: string) {
    // Use embedJs to search the knowledge source
  }

  async createKnowledgeSourceTool(sourceId: string) {
    // Generate a new tool definition for the knowledge source
  }

  async refreshKnowledgeSource(
    knowledgeSourceId: string,
  ): Promise<KnowledgeSource> {
    // 1. Get the knowledge source
    const knowledgeSource = await this.db
      .collection("knowledgeSources")
      .findOne({ _id: knowledgeSourceId });

    if (!knowledgeSource) {
      throw new Error("Knowledge source not found");
    }

    // 2. Update status to processing
    await this.db.collection("knowledgeSources").updateOne(
      { _id: knowledgeSourceId },
      {
        $set: {
          status: "processing",
          updatedAt: new Date(),
        },
      },
    );

    try {
      // 3. Create new embedJs application
      const app = await new RAGApplicationBuilder()
        .setEmbeddingModel(new OpenAiEmbeddings())
        .setVectorDatabase(
          new MongoDb({
            connectionString: process.env.MONGODB_URI,
            collection: `knowledge_${knowledgeSourceId}`,
          }),
        )
        .build();

      // 4. Clear existing vector store
      await app.clear();

      // 5. Re-process the source
      if (knowledgeSource.sourceType === "website") {
        await app.addLoader(
          new WebLoader({
            urlOrContent: knowledgeSource.sourceUrl,
            maxDepth: knowledgeSource.config?.crawlDepth,
            urlPatterns: knowledgeSource.config?.urlPatterns,
          }),
        );
      }

      // 6. Update status to ready
      await this.db.collection("knowledgeSources").updateOne(
        { _id: knowledgeSourceId },
        {
          $set: {
            status: "ready",
            updatedAt: new Date(),
          },
        },
      );

      return knowledgeSource;
    } catch (error) {
      // 7. Handle errors
      await this.db.collection("knowledgeSources").updateOne(
        { _id: knowledgeSourceId },
        {
          $set: {
            status: "error",
            error: error.message,
            updatedAt: new Date(),
          },
        },
      );
      throw error;
    }
  }
}
```

### Database Integration

The server uses MongoDB for two purposes:

1. **Knowledge Source Metadata**

   ```typescript
   interface KnowledgeSource {
     id: string; // Unique identifier
     name: string; // Display name
     description: string; // Description of the knowledge source
     sourceType: "website" | "onedrive"; // Type of source
     sourceUrl: string; // URL or path to source
     createdBy: string; // References User.email
     createdAt: Date; // Creation timestamp
     updatedAt: Date; // Last update timestamp
     status: "processing" | "ready" | "error"; // Current status
     error?: string; // Error message if status is 'error'
     config?: {
       crawlDepth?: number; // For website sources
       urlPatterns?: string[]; // For website sources
     };
   }

   interface User {
     email: string; // Primary identifier
     name?: string;
     createdAt: Date;
     updatedAt: Date;
     knowledgeSources: string[]; // Array of knowledge source IDs
     sharedKnowledgeSources: {
       knowledgeSourceId: string;
       sharedBy: string;
       accessLevel: "read" | "write";
       sharedAt: Date;
     }[];
   }
   ```

2. **Vector Storage**
   - Uses MongoDB's vector search capabilities
   - Store document chunks and their embeddings
   - Index metadata for efficient filtering

### Access Control

The system implements a flexible sharing model:

1. **Ownership**

   - Users own knowledge sources they create
   - Owners have full read/write access
   - Knowledge sources are tracked in the user's `knowledgeSources` array

2. **Sharing**

   - Knowledge sources can be shared with other users
   - Two access levels: "read" and "write"
   - Shared sources are tracked in the user's `sharedKnowledgeSources` array
   - Each sharing record includes:
     - `knowledgeSourceId`: The shared knowledge source
     - `sharedBy`: Email of the user who shared it
     - `accessLevel`: "read" or "write" permission
     - `sharedAt`: Timestamp of when it was shared

3. **Access Verification**
   - System checks both ownership and sharing records
   - Write operations require either ownership or "write" access
   - Read operations require either ownership or any level of access

### Indexes

The system uses the following MongoDB indexes for efficient querying:

1. **User Collection**

   - `email`: Unique index for user identification
   - `sharedKnowledgeSources.knowledgeSourceId`: For efficient lookup of shared sources

2. **Knowledge Source Collection**
   - `id`: Unique index for knowledge source identification
   - `createdBy`: For finding knowledge sources by creator
   - `status`: For filtering by processing status

### Configuration

The server will require the following configuration:

```typescript
interface ServerConfig {
  mongodb: {
    uri: string;
    database: string;
  };
  openai: {
    apiKey: string;
  };
  embedJs: {
    chunking: {
      chunkSize: number;
      chunkOverlap: number;
    };
  };
}
```

### Dependencies

The project will use the following key dependencies:

```json
{
  "dependencies": {
    "@llm-tools/embedjs": "latest",
    "@llm-tools/embedjs-mongodb": "latest",
    "@llm-tools/embedjs-openai": "latest",
    "@llm-tools/embedjs-loader-web": "latest",
    "mongodb": "latest",
    "dynamic-mcp-server": "github:scitara-cto/dynamic-mcp-server"
  }
}
```

### Notes on Implementation

1. **MongoDB Requirements**

   - Must use MongoDB Atlas with M10 or higher instance
   - Vector search capabilities are only available in Atlas
   - Each knowledge source gets its own collection for vector storage

2. **Embedding Model**

   - Using OpenAI's embedding model by default
   - Can be configured to use other models supported by embedJs

3. **Document Processing**

   - WebLoader handles website crawling and content extraction
   - Content is automatically chunked and embedded
   - Metadata is preserved with each chunk

4. **Search Results**
   - Results include relevance scores
   - Each result includes the original source URL
   - Metadata is preserved for filtering and sorting

### Microsoft Graph Authentication Token Management

### 1. Storing Tokens in the User Repository

When a user completes the OAuth2 flow, the server receives an access token, refresh token, and expiration information. These are securely stored in the user's record in the database.

**Example User Schema Addition:**

```typescript
interface User {
  email: string;
  name?: string;
  // ...other fields...
  microsoftAuth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date; // When the access token expires
  };
}
```

**Storing Tokens After OAuth Callback:**

```typescript
async function storeMicrosoftTokens(
  email: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // seconds
  },
) {
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  await userRepository.updateByEmail(email, {
    microsoftAuth: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
    },
  });
}
```

### 2. Retrieving Tokens for API Calls

Before making a Microsoft Graph API call, retrieve the user's tokens from the repository:

```typescript
async function getMicrosoftTokens(email: string) {
  const user = await userRepository.findByEmail(email);
  if (!user?.microsoftAuth) {
    throw new Error("User has not authorized Microsoft account.");
  }
  return user.microsoftAuth;
}
```

### 3. Refreshing Expired Tokens

If the access token is expired (or about to expire), use the refresh token to obtain a new access token, then update the user's record.

**Token Refresh Logic:**

```typescript
async function ensureValidMicrosoftToken(email: string) {
  let { accessToken, refreshToken, expiresAt } = await getMicrosoftTokens(
    email,
  );

  if (Date.now() > new Date(expiresAt).getTime() - 60 * 1000) {
    // refresh 1 min before expiry
    // Call Microsoft token endpoint to refresh
    const newTokens = await refreshMicrosoftToken(refreshToken);
    await storeMicrosoftTokens(email, newTokens);
    accessToken = newTokens.accessToken;
  }

  return accessToken;
}
```

**Example: Refreshing the Token**

```typescript
async function refreshMicrosoftToken(refreshToken: string) {
  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MS_CLIENT_ID,
        client_secret: process.env.MS_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "https://graph.microsoft.com/.default offline_access",
      }),
    },
  );
  if (!response.ok) throw new Error("Failed to refresh Microsoft token");
  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}
```

### 4. Using the Token for Graph API Calls

When making a Graph API call, always use the valid access token:

```typescript
async function makeGraphApiCall(
  email: string,
  endpoint: string,
  method = "GET",
  body?: any,
) {
  const accessToken = await ensureValidMicrosoftToken(email);
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error("Graph API call failed");
  return await response.json();
}
```

### 5. User Repository Example (updateByEmail)

```typescript
class UserRepository {
  // ...other methods...
  async updateByEmail(email: string, update: Partial<User>) {
    return UserModel.findOneAndUpdate(
      { email },
      { $set: update },
      { new: true },
    );
  }
}
```

---

This section details how tokens are securely managed, refreshed, and used for Microsoft Graph API calls, leveraging the user repository for persistence.
