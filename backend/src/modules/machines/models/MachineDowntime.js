
import mongoose from "mongoose";

export const DOWNTIME_STATUS = Object.freeze({
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
});

export const DOWNTIME_TYPES = Object.freeze({
  BREAKDOWN: "Breakdown",
  PREVENTIVE_MAINTENANCE: "Preventive Maintenance",
  CORRECTIVE_MAINTENANCE: "Corrective Maintenance",
  CLEANING: "Cleaning",
  CHANGEOVER: "Changeover",
  OTHER: "Other",
});

const machineDowntimeSchema = new mongoose.Schema(
  {
    downtimeNumber: {
      type: String,
      required: [true, "Downtime number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 60,
    },

    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: [true, "Machine reference is required"],
      index: true,
    },

    downtimeType: {
      type: String,
      enum: Object.values(DOWNTIME_TYPES),
      required: [true, "Downtime type is required"],
    },

    reason: {
      type: String,
      required: [true, "Downtime reason is required"],
      trim: true,
      maxlength: 1000,
    },

    reportedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    expectedResolutionAt: {
      type: Date,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    downtimeMinutes: {
      type: Number,
      min: 0,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(DOWNTIME_STATUS),
      default: DOWNTIME_STATUS.OPEN,
      required: true,
    },

    productionImpact: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    relatedProductionBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionBatch",
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
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

machineDowntimeSchema.index({ status: 1, reportedAt: -1 });
machineDowntimeSchema.index({ machine: 1, reportedAt: -1 });

const MachineDowntime =
  mongoose.models.MachineDowntime ||
  mongoose.model("MachineDowntime", machineDowntimeSchema);

export default MachineDowntime;
