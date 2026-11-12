
import mongoose from "mongoose";

export const DISPATCH_STATUS = Object.freeze({
  RESERVED: "Reserved",
  DISPATCHED: "Dispatched",
  CANCELLED: "Cancelled",
});

const dispatchSchema = new mongoose.Schema(
  {
    dispatchNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    finishedGoods: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinishedGoods",
      required: true,
      index: true,
    },

    lotNumber: {
      type: String,
      required: true,
      trim: true,
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

    bmrNumber: {
      type: String,
      trim: true,
      default: "",
    },

    dispatchDate: {
      type: Date,
      default: Date.now,
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

    customerName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    destination: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    referenceNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    status: {
      type: String,
      enum: Object.values(DISPATCH_STATUS),
      default: DISPATCH_STATUS.RESERVED,
      required: true,
      index: true,
    },

    reservedAt: {
      type: Date,
      default: Date.now,
    },

    dispatchedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    notes: {
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

    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledBy: {
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

dispatchSchema.index({ status: 1, createdAt: -1 });
dispatchSchema.index({ finishedGoods: 1, createdAt: -1 });

const Dispatch =
  mongoose.models.Dispatch ||
  mongoose.model("Dispatch", dispatchSchema);

export default Dispatch;
