import mongoose from "mongoose";
import { logger } from "dynamic-mcp-server";

let isConnected = false;

export async function connectToDatabase(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(mongoUri, {
      dbName: "knowledge",
    });

    isConnected = true;
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info("Disconnected from MongoDB");
  } catch (error) {
    logger.error("Error disconnecting from MongoDB:", error);
    throw error;
  }
}

// Handle application shutdown
process.on("SIGINT", async () => {
  await disconnectFromDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectFromDatabase();
  process.exit(0);
});
