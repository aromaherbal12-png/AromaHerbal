
import mongoose from "mongoose";

export const BMR_STATUS = Object.freeze({
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING_REVIEW: "Pending Review",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
});

const bmrMaterialSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    materialCode: { type: String, required: true, trim: true },
    materialName: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    plannedQuantity: { type: Number, required: true, min: 0 },
    issuedQuantity: { type: Number, default: 0, min: 0 },
    consumedQuantity: { type: Number, default: 0, min: 0 },
    returnedQuantity: { type: Number, default: 0, min: 0 },
    batchNumbers: [{ type: String, trim: true }],
    remarks: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { _id: true }
);

const processEntrySchema = new mongoose.Schema(
  {
    step: { type: String, required: true, trim: true, maxlength: 200 },
    recordedAt: { type: Date, required: true, default: Date.now },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    observations: { type: String, trim: true, maxlength: 2000, default: "" },
    parameters: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const bmrSchema = new mongoose.Schema(
  {
    bmrNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    productionPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionPlan",
      required: true,
    },
    productionBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionBatch",
      required: true,
      unique: true,
    },
    productCode: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    targetQuantity: { type: Number, required: true, min: 0.000001 },
    outputUnit: { type: String, required: true, trim: true },
    materials: { type: [bmrMaterialSchema], default: [] },
    processEntries: { type: [processEntrySchema], default: [] },
    actualOutputQuantity: { type: Number, default: 0, min: 0 },
    rejectedOutputQuantity: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(BMR_STATUS),
      default: BMR_STATUS.OPEN,
      required: true,
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
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
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    reviewRemarks: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  { timestamps: true }
);

bmrSchema.index({ status: 1, createdAt: -1 });

const BMR = mongoose.models.BMR || mongoose.model("BMR", bmrSchema);

export default BMR;
