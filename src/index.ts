import { DynamicMcpServer, logger } from "dynamic-mcp-server";
import knowledgeHandler from "./handlers/knowledge/index.js";
import { registerCustomRoutes } from "./http/httpServer.js";

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
    // Start the MCP server
    await server.start();
    logger.info("Knowledge MCP Server started");

    // Register custom HTTP routes (OAuth, health, etc.)
    registerCustomRoutes(server);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
