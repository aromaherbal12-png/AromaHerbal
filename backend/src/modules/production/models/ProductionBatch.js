
import mongoose from "mongoose";

export const PRODUCTION_BATCH_STATUS = Object.freeze({
  PLANNED: "Planned",
  READY: "Ready",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  PENDING_REVIEW: "Pending Review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
});

const productionBatchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    productionPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionPlan",
      required: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    productCode: {
      type: String,
      required: true,
      trim: true,
    },

    plannedQuantity: {
      type: Number,
      required: true,
      min: 0.000001,
    },

    actualOutputQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    rejectedOutputQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    outputUnit: {
      type: String,
      required: true,
      trim: true,
    },

    plannedStartDate: {
      type: Date,
      default: null,
    },

    plannedEndDate: {
      type: Date,
      default: null,
    },

    actualStartDate: {
      type: Date,
      default: null,
    },

    actualEndDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(PRODUCTION_BATCH_STATUS),
      default: PRODUCTION_BATCH_STATUS.PLANNED,
      required: true,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    completedBy: {
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

// Indexes for query optimization
productionBatchSchema.index({ productionPlan: 1, createdAt: -1 });
productionBatchSchema.index({ status: 1, plannedStartDate: 1 });
productionBatchSchema.index({ status: 1, createdAt: -1 }); // For status-based filtering with recency
productionBatchSchema.index({ productCode: 1, status: 1 }); // For product-based queries

const ProductionBatch =
  mongoose.models.ProductionBatch ||
  mongoose.model("ProductionBatch", productionBatchSchema);

export default ProductionBatch;
