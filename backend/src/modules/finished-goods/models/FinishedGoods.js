
import mongoose from "mongoose";

export const FINISHED_GOODS_STATUS = Object.freeze({
  PENDING_RELEASE: "Pending Release",
  AVAILABLE: "Available",
  ON_HOLD: "On Hold",
  REJECTED: "Rejected",
  DEPLETED: "Depleted",
});

const finishedGoodsSchema = new mongoose.Schema(
  {
    lotNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    productionBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionBatch",
      index: true,
    },

    bmr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BMR",
      index: true,
    },

    bmrNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    productionQC: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionQC",
      index: true,
    },

    productCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    producedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    rejectedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    availableQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    dispatchedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(FINISHED_GOODS_STATUS),
      default: FINISHED_GOODS_STATUS.PENDING_RELEASE,
      required: true,
      index: true,
    },

    releasedAt: {
      type: Date,
      default: null,
    },

    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    holdReason: {
      type: String,
      trim: true,
      maxlength: 2000,
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

finishedGoodsSchema.index({ status: 1, createdAt: -1 });
finishedGoodsSchema.index({ productCode: 1, status: 1 });

const FinishedGoods =
  mongoose.models.FinishedGoods ||
  mongoose.model("FinishedGoods", finishedGoodsSchema);

export default FinishedGoods;
