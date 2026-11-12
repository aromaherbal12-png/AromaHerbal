
import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: {
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
      maxlength: 200,
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    taxId: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 50,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
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
supplierSchema.index({ name: 1, isActive: 1 });
// Note: supplierCode already has unique index from schema definition
supplierSchema.index({ isActive: 1, createdAt: -1 }); // For listing active suppliers

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;
