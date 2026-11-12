import mongoose from "mongoose";

export const AUDIT_ACTION = Object.freeze({
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  CANCEL: "CANCEL",
  START: "START",
  COMPLETE: "COMPLETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REVIEW: "REVIEW",
  ISSUE: "ISSUE",
  RETURN: "RETURN",
  DISPATCH: "DISPATCH",
});

export const AUDIT_ENTITY = Object.freeze({
  PURCHASE_ORDER: "PurchaseOrder",
  GOODS_RECEIPT: "GoodsReceipt",
  MATERIAL: "Material",
  SUPPLIER: "Supplier",
  PRODUCTION_PLAN: "ProductionPlan",
  PRODUCTION_BATCH: "ProductionBatch",
  PRODUCTION_ENTRY: "ProductionEntry",
  BMR: "BMR",
  MATERIAL_QC: "MaterialQC",
  PRODUCTION_QC: "ProductionQC",
  FINISHED_GOODS: "FinishedGoods",
  DISPATCH: "Dispatch",
  STOCK_TRANSACTION: "StockTransaction",
  MACHINE: "Machine",
  MACHINE_DOWNTIME: "MachineDowntime",
  USER: "User",
});

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
    },
    userRole: {
      type: String,
      required: true,
      trim: true,
    },

    // What action was performed
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTION),
      required: true,
      index: true,
    },
    actionDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // What entity was affected
    entityType: {
      type: String,
      enum: Object.values(AUDIT_ENTITY),
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityIdentifier: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    // Before and after snapshots (for UPDATE actions)
    beforeSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Changes made (for UPDATE actions)
    changes: {
      type: [
        {
          field: { type: String, required: true },
          oldValue: { type: mongoose.Schema.Types.Mixed },
          newValue: { type: mongoose.Schema.Types.Mixed },
        },
      ],
      default: [],
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Request information
    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },
    userAgent: {
      type: String,
      trim: true,
      default: "",
    },

    // Status and result
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE", "PARTIAL"],
      default: "SUCCESS",
      required: true,
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    // Timestamp
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      // Note: index added via TTL index below
    },
  },
  {
    timestamps: false, // Using custom timestamp field
    versionKey: false,
  }
);

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
// Note: timestamp already has single-field index from individual field index definition above

// TTL index - automatically delete audit logs older than 2 years (configurable)
// Remove this if you want to keep logs indefinitely
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
