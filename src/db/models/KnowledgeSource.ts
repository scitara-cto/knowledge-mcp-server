import mongoose from "mongoose";

export interface IKnowledgeSource {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  sourceType: "onedrive";
  sourceUrl: string;
  createdBy: string; // References User.email
  createdAt: Date;
  updatedAt: Date;
  status: "processing" | "ready" | "error";
  error?: string;
  config?: {
    crawlDepth?: number;
    urlPatterns?: string[];
  };
}

const knowledgeSourceSchema = new mongoose.Schema<IKnowledgeSource>(
  {
    name: { type: String, required: true },
    description: { type: String },
    sourceType: {
      type: String,
      required: true,
      enum: ["onedrive"],
    },
    sourceUrl: { type: String, required: true },
    createdBy: { type: String, required: true, ref: "User" }, // References User.email
    status: {
      type: String,
      required: true,
      enum: ["processing", "ready", "error"],
    },
    error: { type: String },
    config: {
      crawlDepth: { type: Number },
      urlPatterns: [{ type: String }],
    },
  },
  { timestamps: true },
);

// Add a virtual 'id' field that maps to '_id'
knowledgeSourceSchema.virtual("id").get(function (this: any) {
  return this._id.toString();
});

// Ensure virtuals are included in toJSON and toObject
knowledgeSourceSchema.set("toJSON", { virtuals: true });
knowledgeSourceSchema.set("toObject", { virtuals: true });

// Indexes
knowledgeSourceSchema.index({ createdBy: 1 });
knowledgeSourceSchema.index({ status: 1 });
knowledgeSourceSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export const KnowledgeSource = mongoose.model<IKnowledgeSource>(
  "KnowledgeSource",
  knowledgeSourceSchema,
);
