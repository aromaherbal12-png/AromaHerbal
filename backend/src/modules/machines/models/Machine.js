
import mongoose from "mongoose";

export const MACHINE_STATUS = Object.freeze({
  AVAILABLE: "Available",
  IN_USE: "In Use",
  UNDER_MAINTENANCE: "Under Maintenance",
  OUT_OF_SERVICE: "Out of Service",
  DECOMMISSIONED: "Decommissioned",
});

export const MACHINE_TYPES = Object.freeze({
  PRODUCTION: "Production",
  PACKAGING: "Packaging",
  PROCESSING: "Processing",
  QUALITY_CONTROL: "Quality Control",
  UTILITY: "Utility",
  OTHER: "Other",
});

const machineSchema = new mongoose.Schema(
  {
    machineCode: {
      type: String,
      required: [true, "Machine code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },

    machineName: {
      type: String,
      required: [true, "Machine name is required"],
      trim: true,
      maxlength: 150,
    },

    machineType: {
      type: String,
      enum: Object.values(MACHINE_TYPES),
      required: [true, "Machine type is required"],
    },

    manufacturer: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    modelNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    serialNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    location: {
      type: String,
      required: [true, "Machine location is required"],
      trim: true,
      maxlength: 200,
    },

    capacity: {
      value: {
        type: Number,
        min: 0,
        default: null,
      },
      unit: {
        type: String,
        trim: true,
        maxlength: 30,
        default: "",
      },
    },

    installationDate: {
      type: Date,
      default: null,
    },

    lastMaintenanceDate: {
      type: Date,
      default: null,
    },

    nextMaintenanceDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(MACHINE_STATUS),
      default: MACHINE_STATUS.AVAILABLE,
      required: true,
    },

    maintenanceIntervalDays: {
      type: Number,
      min: 1,
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

machineSchema.index({ status: 1, machineType: 1 });
machineSchema.index({ machineName: 1 });

const Machine =
  mongoose.models.Machine ||
  mongoose.model("Machine", machineSchema);

export default Machine;
