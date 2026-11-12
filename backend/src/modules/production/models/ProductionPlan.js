
import mongoose from "mongoose";

export const PRODUCTION_PLAN_STATUS = Object.freeze({
  DRAFT: "Draft",
  APPROVED: "Approved",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
});

const plannedMaterialSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    materialCode: { type: String, required: true, trim: true },
    materialName: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    quantityPerUnit: { type: Number, required: true, min: 0.000001 },
    plannedQuantity: { type: Number, required: true, min: 0.000001 },
  },
  { _id: true }
);

const productionPlanSchema = new mongoose.Schema(
  {
    planNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    productCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },
    targetQuantity: { type: Number, required: true, min: 0.000001 },
    outputUnit: { type: String, required: true, trim: true },
    plannedStartDate: { type: Date, required: true },
    plannedEndDate: { type: Date, required: true },
    materials: {
      type: [plannedMaterialSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "At least one planned material is required.",
      },
    },
    status: {
      type: String,
      enum: Object.values(PRODUCTION_PLAN_STATUS),
      default: PRODUCTION_PLAN_STATUS.DRAFT,
      required: true,
    },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
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
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

productionPlanSchema.index({ status: 1, plannedStartDate: 1 });

const ProductionPlan =
  mongoose.models.ProductionPlan ||
  mongoose.model("ProductionPlan", productionPlanSchema);

export default ProductionPlan;
