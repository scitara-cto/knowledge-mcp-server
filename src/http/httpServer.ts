import express from "express";
import onedriveAuthRoutes from "./onedriveAuthRoutes.js";
import { logger } from "dynamic-mcp-server";

export function startHttpServer() {
  const app = express();
  const PORT = process.env.KNOWLEDGE_HTTP_PORT || 3000;
  app.use(express.json());
  app.get("/health", (req: express.Request, res: express.Response) => {
    res.json({ status: "ok" });
  });
  app.use(onedriveAuthRoutes);
  app.listen(PORT, () => {
    logger.info(`Knowledge HTTP API server listening on port ${PORT}`);
  });
}
