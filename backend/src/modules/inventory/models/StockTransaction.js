
import mongoose from "mongoose";

export const STOCK_TRANSACTION_TYPE = Object.freeze({
  QC_ACCEPTANCE: "QC_ACCEPTANCE",
  QC_REJECTION: "QC_REJECTION",
  PRODUCTION_ISSUE: "PRODUCTION_ISSUE",
});

const stockTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true,
    },
    materialCode: {
      type: String,
      required: true,
      trim: true,
    },
    materialName: {
      type: String,
      required: true,
      trim: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(STOCK_TRANSACTION_TYPE),
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.000001,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },

    goodsReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoodsReceipt",
      default: null,
    },

    goodsReceiptItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, 
    },

    productionBatch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductionBatch",
        default: null,
        index: true,
    },

    materialQC: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaterialQC",
      default: null,
    },

    batchNumber: {
      type: String,
      trim: true,
      default: "",
    },
    stockBucket: {
      type: String,
      enum: ["Usable", "Rejected"],
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
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
  },
  { timestamps: true }
);

// Indexes for query optimization
stockTransactionSchema.index({
  material: 1,
  stockBucket: 1,
  transactionDate: -1,
});

stockTransactionSchema.index(
  { materialQC: 1, transactionType: 1 },
  { 
    unique: true,
    partialFilterExpression: {
      materialQC: { $type: "objectId" },
    },
  }
);

// Additional indexes for common query patterns
stockTransactionSchema.index({ transactionType: 1, transactionDate: -1 }); // For filtering by type
stockTransactionSchema.index({ transactionDate: -1 }); // For chronological listing
stockTransactionSchema.index({ goodsReceipt: 1, transactionDate: -1 }); // For GRN-related queries

const StockTransaction =
  mongoose.models.StockTransaction ||
  mongoose.model("StockTransaction", stockTransactionSchema);

export default StockTransaction;
