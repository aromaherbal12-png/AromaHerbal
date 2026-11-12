
import mongoose from "mongoose";

export const MATERIAL_CATEGORIES = Object.freeze({
  RAW_MATERIAL: "Raw Material",
  PACKAGING_MATERIAL: "Packaging Material",
  FINISHED_GOODS: "Finished Goods",
});

export const MATERIAL_CATEGORY_VALUES = Object.freeze(Object.values(MATERIAL_CATEGORIES));

const materialSchema = new mongoose.Schema(
  {
    materialCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      required: true,
      enum: MATERIAL_CATEGORY_VALUES,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    reorderLevel: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    // Soft delete fields for audit trail
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
  { timestamps: true, versionKey: false }
);

// Indexes for query optimization
materialSchema.index({ name: 1 });
materialSchema.index({ category: 1, isActive: 1 });
materialSchema.index({ materialCode: 1, isActive: 1 }); // For code-based lookups with active filter
materialSchema.index({ isActive: 1, createdAt: -1 }); // For listing active materials chronologically

const Material = mongoose.model("Material", materialSchema);

export default Material;
