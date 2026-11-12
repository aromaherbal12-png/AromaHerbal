
import mongoose from "mongoose";

export const PRODUCTION_ENTRY_STATUS = Object.freeze({
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVIEWED: "Reviewed",
  VOIDED: "Voided",
});

const productionEntrySchema = new mongoose.Schema(
  {
    entryNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    productionBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionBatch",
      required: true,
      index: true,
    },

    bmr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BMR",
      required: true,
      index: true,
    },

    sequenceNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    operation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    stage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startedAt: {
      type: Date,
      required: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    inputQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    outputQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    rejectedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    processParameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    observations: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },

    deviation: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },

    status: {
      type: String,
      enum: Object.values(PRODUCTION_ENTRY_STATUS),
      default: PRODUCTION_ENTRY_STATUS.SUBMITTED,
      required: true,
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    voidReason: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

productionEntrySchema.index(
  { productionBatch: 1, sequenceNumber: 1 },
  { unique: true }
);

productionEntrySchema.index({ bmr: 1, createdAt: 1 });

const ProductionEntry =
  mongoose.models.ProductionEntry ||
  mongoose.model("ProductionEntry", productionEntrySchema);

export default ProductionEntry;
