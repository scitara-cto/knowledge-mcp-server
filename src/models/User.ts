import mongoose from "mongoose";

export interface IUser {
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
  microsoftAuth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String },
    knowledgeSources: [{ type: String }], // Array of knowledge source IDs
    sharedKnowledgeSources: [
      {
        knowledgeSourceId: { type: String, required: true },
        sharedBy: { type: String, required: true },
        accessLevel: { type: String, enum: ["read", "write"], default: "read" },
        sharedAt: { type: Date, default: Date.now },
      },
    ],
    microsoftAuth: {
      accessToken: { type: String },
      refreshToken: { type: String },
      expiresAt: { type: Date },
    },
  },
  { timestamps: true },
);

// Add a virtual 'id' field that maps to '_id'
userSchema.virtual("id").get(function (this: any) {
  return this._id.toString();
});

// Ensure virtuals are included in toJSON and toObject
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// Indexes
userSchema.index({ "sharedKnowledgeSources.knowledgeSourceId": 1 });

export const User = mongoose.model<IUser>("User", userSchema);
