# Knowledge MCP Server

A Model Context Protocol (MCP) server for managing and querying knowledge bases through vector databases, built on top of the [dynamic-mcp-server (DMS)](https://github.com/scitara-cto/dynamic-mcp-server) framework.

## Overview

Knowledge MCP Server leverages the dynamic-mcp-server (DMS) as its core, providing a robust, extensible platform for secure, user-aware, and dynamic AI tool servers. All user, tool, and database management is handled by DMS, with extension points for project-specific logic (e.g., knowledge sources, Microsoft auth).

## Architecture

- **Core Integration:** Uses DMS for all authentication, user management, tool registration, and MongoDB/Mongoose connection management.
- **Centralized DB Connection:** All models and repositories use the shared MongoDB connection provided by DMS.
- **User & Tool Management:** User and tool models are aligned with DMS, with project-specific extensions via subclassing (see `AppUserRepository`).
- **Custom HTTP Routes:** All custom routes (OAuth, health, etc.) are registered on the DMS-exported Express server using DMS APIs (e.g., `addAuthHttpRoute`).
- **Extensibility:** Extend user models, repositories, and add new tools or routes by subclassing or using DMS extension points.

## Features

- Vector database integration for storing and querying embeddings
- Document processing pipeline for content ingestion
- Text chunking and embedding generation
- Dynamic tool registration and management (via DMS APIs)
- Secure access control and sharing for knowledge sources
- Support for website crawling and content extraction
- MongoDB integration for metadata and vector storage

## Prerequisites

- Node.js 18 or later
- MongoDB Atlas M10 or higher instance (for vector search capabilities)
- OpenAI API key

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/knowledge-mcp-server.git
   cd knowledge-mcp-server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
PORT=4001
HOST=localhost

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Admin Bootstrapping (required by DMS)
MCP_ADMIN_EMAIL=your_admin_email@example.com
```

## Running the Server

Start the server in development mode:

```bash
npm run dev
```

Or in production mode:

```bash
npm start
```

> **Note:** The server is started via DMS, and all custom routes are registered on the DMS-exported Express server. There is no local Express server startup logic.

## Tool Registration & Sharing

- All tool registration and sharing is managed via DMS APIs (`addTool`, sharing endpoints, etc.).
- Legacy tool registration logic has been removed.
- Tools are registered per user/session as needed, supporting dynamic extensibility.

## User & Access Model

- User access to knowledge sources is managed via `applicationAuthorization.knowledge.owned` and `applicationAuthorization.knowledge.shared` fields on the user record.
- Sharing is handled via the DMS sharing model and APIs, supporting "read" and "write" access levels.
- The user repository is extended as `AppUserRepository` for project-specific logic (e.g., custom sharing/access methods).

## Knowledge Source Management

The server currently supports the following knowledge source type:

1. **Microsoft OneDrive**
   - Ingests files and folders from OneDrive
   - Supports various document formats (PDF, DOCX, etc.)
   - Requires Microsoft Graph API integration

> **Note:** Website knowledge source support (web crawling, HTML extraction, etc.) is not yet implemented, but is planned for a future release.

## Extending the Server

- **User Model Extension:** Subclass `AppUserRepository` to add project-specific user logic or fields.
- **Custom HTTP Routes:** Register new routes using DMS APIs (e.g., `addAuthHttpRoute`).
- **Tool Registration:** Add new tools using DMS's `addTool` and related APIs.
- **Model/Repository Extension:** Prefer subclassing or wrapping DMS repositories for custom logic.

## Available Tools

The server provides the following tools:

### 1. Add Knowledge

- **Tool Name**: `add-knowledge`
- **Purpose**: Ingests and processes new documents into a knowledge source
- **Functionality**: Accepts document sources (URLs, text, or file uploads), scrapes/processes content, chunks and embeds into a vector database, associates with a knowledge source

### 2. Search

- **Tool Name**: `search`
- **Purpose**: Queries a specific knowledge source for relevant information
- **Functionality**: Semantic search against the vector database, returns relevant document fragments with metadata, supports filtering/ranking

### 3. Use Knowledge Source

- **Tool Name**: `use-knowledge-source`
- **Purpose**: Creates a new tool for interacting with a specific knowledge source
- **Functionality**: Generates a new tool definition, configures with parameters/constraints, enables dynamic tool registration

### 4. Refresh Knowledge Source

- **Tool Name**: `refresh-knowledge-source`
- **Purpose**: Refreshes a knowledge source by re-ingesting its content
- **Functionality**: Updates status, clears vector store, re-processes source, updates status

## Access Control & Sharing

- **Ownership:** Users own knowledge sources they create and have full access.
- **Sharing:** Knowledge sources can be shared with other users ("read" or "write" access), tracked in `applicationAuthorization.knowledge.shared`.

## Dependencies

The project uses the following key dependencies:

```json
{
  "@llm-tools/embedjs": "latest",
  "@llm-tools/embedjs-mongodb": "latest",
  "@llm-tools/embedjs-openai": "latest",
  "@llm-tools/embedjs-loader-web": "latest",
  "mongodb": "latest",
  "dynamic-mcp-server": "github:scitara-cto/dynamic-mcp-server"
}
```

## Testing

- Run the test suite:
  ```bash
  npm test
  ```
- Run tests in watch mode:
  ```bash
  npm run test:watch
  ```
- Type checking:
  ```bash
  npm run typecheck
  ```
- **Mocking:** Use the mocking strategies and test patterns recommended in the DMS documentation. Tests should use the extended repositories (e.g., `AppUserRepository`).

## Migration Status

- All migration and refactor steps are complete except for documentation.
- All tests and build pass.
- The codebase is fully aligned with the new DMS architecture and repository model.

## License

[Your License Here]
