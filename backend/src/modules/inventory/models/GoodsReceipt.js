
import mongoose from "mongoose";
import { MATERIAL_CATEGORY_VALUES } from "./Material.js";

export const GOODS_RECEIPT_STATUS = Object.freeze({
  PENDING: "Pending",
  QUARANTINED: "Quarantined",
  UNDER_TESTING: "Under Testing",
  APPROVED: "Approved",
  PARTIALLY_APPROVED: "Partially Approved",
  REJECTED: "Rejected",
  // Legacy statuses (kept for backward compatibility with old GRNs)
  RECEIVED: "Received",
  QC_PENDING: "QC Pending",
  QC_COMPLETED: "QC Completed",
});

const goodsReceiptItemSchema = new mongoose.Schema(
  {
    purchaseOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
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
    category: {
      type: String,
      required: true,
      enum: MATERIAL_CATEGORY_VALUES,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    orderedQty: {
      type: Number,
      required: true,
      min: 0,
    },
    previouslyReceivedQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    receivedQty: {
      type: Number,
      required: true,
      min: 0.000001,
    },
    receivedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    batchNumber: {
      type: String,
      trim: true,
      default: "",
    },
    invoiceChallan: {
      type: String,
      trim: true,
      default: "",
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    qualityStatus: {
      type: String,
      enum: ["Pending Inspection", "Under Testing", "Accepted", "Partially Accepted", "Rejected"],
      default: "Pending Inspection",
      required: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    qcApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    qcApprovedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const goodsReceiptSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },
    poNumber: {
      type: String,
      required: true,
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    supplierCode: {
      type: String,
      required: true,
      trim: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    supplierDeliveryNumber: {
      type: String,
      trim: true,
      default: "",
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: {
      type: [goodsReceiptItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "A goods receipt must contain at least one item.",
      },
    },
    status: {
      type: String,
      enum: Object.values(GOODS_RECEIPT_STATUS),
      default: GOODS_RECEIPT_STATUS.PENDING,
      required: true,
    },
    quarantineSticker: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    approvedSticker: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    quarantinedAt: {
      type: Date,
      default: null,
    },
    quarantinedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

goodsReceiptSchema.index({ purchaseOrder: 1, createdAt: -1 });
goodsReceiptSchema.index({ supplier: 1, receivedAt: -1 });
goodsReceiptSchema.index({ status: 1, createdAt: -1 });

const GoodsReceipt =
  mongoose.models.GoodsReceipt ||
  mongoose.model("GoodsReceipt", goodsReceiptSchema);

export default GoodsReceipt;
