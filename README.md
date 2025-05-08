# Knowledge MCP Server

A Model Context Protocol (MCP) server that provides tools for managing and querying knowledge bases through vector databases. This server is built on top of the [dynamic-mcp-server](https://github.com/scitara-cto/dynamic-mcp-server) framework.

## Overview

The Knowledge MCP Server provides a set of tools that allow AI models to create, manage, and query knowledge sources using vector databases. It enables semantic search capabilities and dynamic tool generation for specific knowledge domains.

## Features

- Vector database integration for storing and querying embeddings
- Document processing pipeline for content ingestion
- Text chunking and embedding generation
- Dynamic tool registration and management
- Secure access control for knowledge sources
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
```

## Available Tools

The server provides the following tools:

### 1. Add Knowledge

- **Tool Name**: `add-knowledge`
- **Purpose**: Ingests and processes new documents into a knowledge source
- **Functionality**:
  - Accepts document sources (URLs, text, or file uploads)
  - Scrapes and processes the content
  - Chunks the content into appropriate segments
  - Embeds the chunks into a vector database
  - Associates the content with a specific knowledge source

### 2. Search

- **Tool Name**: `search`
- **Purpose**: Queries a specific knowledge source for relevant information
- **Functionality**:
  - Performs semantic search against the vector database
  - Returns relevant document fragments with metadata
  - Supports filtering and ranking of results

### 3. Use Knowledge Source

- **Tool Name**: `use-knowledge-source`
- **Purpose**: Creates a new tool for interacting with a specific knowledge source
- **Functionality**:
  - Generates a new tool definition for a specific knowledge source
  - Configures the tool with appropriate parameters and constraints
  - Enables dynamic tool registration for the knowledge source

### 4. Refresh Knowledge Source

- **Tool Name**: `refresh-knowledge-source`
- **Purpose**: Refreshes a knowledge source by re-ingesting its content
- **Functionality**:
  - Updates the knowledge source status to processing
  - Clears the existing vector store
  - Re-processes the source
  - Updates the knowledge source status to ready

## Running the Server

Start the server in development mode:

```bash
npm run dev
```

Or in production mode:

```bash
npm start
```

## Knowledge Source Management

The server supports the following knowledge source types:

1. **Website**

   - Uses built-in web crawler
   - Recursively crawls websites to extract content
   - Configurable crawl depth and URL patterns
   - Processes HTML content into text chunks

2. **Microsoft OneDrive** (Future Implementation)
   - Will support various document formats (PDF, DOCX, etc.)
   - Requires Microsoft Graph API integration

## Access Control

The system implements a flexible sharing model:

1. **Ownership**

   - Users own knowledge sources they create
   - Owners have full read/write access

2. **Sharing**
   - Knowledge sources can be shared with other users
   - Two access levels: "read" and "write"
   - Shared sources are tracked with metadata

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

## Development

### Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Type Checking

Run type checking:

```bash
npm run typecheck
```

## License

[Your License Here]
