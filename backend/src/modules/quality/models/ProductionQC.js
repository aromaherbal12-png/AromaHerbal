import mongoose from "mongoose";

export const PRODUCTION_QC_STATUS = Object.freeze({
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  ON_HOLD: "On Hold",
});

const productionQCTestSchema = new mongoose.Schema(
  {
    testName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    specification: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    actualResult: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    unit: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    result: {
      type: String,
      enum: ["Pass", "Fail", "Not Applicable"],
      required: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  { _id: true }
);

const productionQCSchema = new mongoose.Schema(
  {
    inspectionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
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

    productCode: {
      type: String,
      required: true,
      trim: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },

    sampleQuantity: {
      type: Number,
      required: true,
      min: 0.000001,
    },

    sampleUnit: {
      type: String,
      required: true,
      trim: true,
    },

    tests: {
      type: [productionQCTestSchema],
      validate: {
        validator: (tests) => tests.length > 0,
        message: "At least one quality test is required",
      },
    },

    status: {
      type: String,
      enum: Object.values(PRODUCTION_QC_STATUS),
      default: PRODUCTION_QC_STATUS.PENDING,
      required: true,
      index: true,
    },

    decisionRemarks: {
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
      required: true,
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
  {
    timestamps: true,
    versionKey: false,
  }
);

productionQCSchema.index({
  productionBatch: 1,
  createdAt: -1,
});

productionQCSchema.index({
  status: 1,
  inspectedAt: -1,
});

const ProductionQC =
  mongoose.models.ProductionQC ||
  mongoose.model("ProductionQC", productionQCSchema);

export default ProductionQC;
