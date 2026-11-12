import mongoose from "mongoose";

/**
 * Stores frontend production batch data (including BMR page data, formula, etc.)
 * as a JSON document. This replaces localStorage persistence on the frontend.
 */
const batchDataSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const BatchData =
  mongoose.models.BatchData ||
  mongoose.model("BatchData", batchDataSchema);

export default BatchData;
