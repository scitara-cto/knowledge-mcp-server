import { DynamicMcpServer, logger } from "dynamic-mcp-server";
import knowledgeHandler from "./knowledge/index.js";
import { connectToDatabase } from "./db/connection.js";
import { startHttpServer } from "./http/httpServer.js";

// Setup server with knowledge handler
const server = new DynamicMcpServer({
  name: "knowledge-mcp-server",
  version: "1.0.0",
});

// Register the knowledge handler
server.registerHandler(knowledgeHandler);

// Start the server
async function startServer() {
  try {
    // Connect to database first
    await connectToDatabase();

    // Then start the MCP server
    await server.start();
    logger.info("Knowledge MCP Server started");

    // Start HTTP server for OAuth and HTTP endpoints
    startHttpServer();
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
