import mongoose from "mongoose";

export interface IEmbeddedChunk {
  knowledgeSourceId: string;
  fileId: string;
  fileName: string;
  filePath: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  mimeType?: string;
  lastModified?: string;
  size?: number;
  // Add more metadata fields as needed
}

const embeddedChunkSchema = new mongoose.Schema<IEmbeddedChunk>(
  {
    knowledgeSourceId: { type: String, required: true, index: true },
    fileId: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true, index: "2dsphere" },
    mimeType: { type: String },
    lastModified: { type: String },
    size: { type: Number },
  },
  { timestamps: true },
);

embeddedChunkSchema.index({ knowledgeSourceId: 1, fileId: 1, chunkIndex: 1 });

export const EmbeddedChunk = mongoose.model<IEmbeddedChunk>(
  "EmbeddedChunk",
  embeddedChunkSchema,
);
