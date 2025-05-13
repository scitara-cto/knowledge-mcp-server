import mongoose from "mongoose";
import { IUser } from "dynamic-mcp-server";

const userSchema = new mongoose.Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String },
    roles: [{ type: String }],
    allowedTools: [{ type: String }],
    sharedTools: [
      {
        toolId: { type: String, required: true },
        sharedBy: { type: String, required: true },
        accessLevel: { type: String, enum: ["read", "write"], default: "read" },
        sharedAt: { type: Date, default: Date.now },
      },
    ],
    applicationAuthentication: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    applicationAuthorization: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
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

// Indexes for app-specific fields can be added as needed in downstream projects

export const User = mongoose.model<IUser>("User", userSchema);
