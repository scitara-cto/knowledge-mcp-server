import { DynamicMcpServer, logger } from "dynamic-mcp-server";
import knowledgeHandler from "./handlers/knowledge/index.js";
import { registerOnedriveAuthRoutes } from "./http/onedriveAuthRoutes.js";

// Setup server with knowledge handler
const server = new DynamicMcpServer({
  name: "knowledge-mcp-server",
  version: "1.0.0",
});

// Start the server
async function startServer() {
  try {
    // Start the MCP server
    await server.start();
    logger.info("Knowledge MCP Server started");

    // Register OneDrive OAuth routes
    registerOnedriveAuthRoutes(server);

    // Register the knowledge handler
    await server.registerHandler(knowledgeHandler);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
