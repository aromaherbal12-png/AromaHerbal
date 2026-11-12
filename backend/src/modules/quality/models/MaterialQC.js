import mongoose from "mongoose";

export const MATERIAL_QC_STATUS = Object.freeze({
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  PARTIALLY_ACCEPTED: "Partially Accepted",
  REJECTED: "Rejected",
});

const materialQCSchema = new mongoose.Schema(
  {
    qcNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    goodsReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoodsReceipt",
      required: true,
      index: true,
    },
    grnNumber: {
      type: String,
      required: true,
      trim: true,
    },
    goodsReceiptItemId: {
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
    batchNumber: {
      type: String,
      trim: true,
      default: "",
    },
    receivedQty: {
      type: Number,
      required: true,
      min: 0.000001,
    },
    inspectedQty: {
      type: Number,
      required: true,
      min: 0.000001,
    },
    acceptedQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    rejectedQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(MATERIAL_QC_STATUS),
      default: MATERIAL_QC_STATUS.PENDING,
      required: true,
    },
    testResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inspectedAt: {
      type: Date,
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

materialQCSchema.index(
  { goodsReceipt: 1, goodsReceiptItemId: 1 },
  { unique: true }
);

materialQCSchema.index({ status: 1, createdAt: -1 });

const MaterialQC =
  mongoose.models.MaterialQC ||
  mongoose.model("MaterialQC", materialQCSchema);

export default MaterialQC;
