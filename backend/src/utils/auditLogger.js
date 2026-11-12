import AuditLog, { AUDIT_ACTION, AUDIT_ENTITY } from "../models/AuditLog.js";

/**
 * Utility function to log audit events
 * 
 * @param {Object} params - Audit log parameters
 * @param {Object} params.user - User object (must have _id, name, email, role)
 * @param {string} params.action - Action performed (from AUDIT_ACTION enum)
 * @param {string} params.entityType - Entity type (from AUDIT_ENTITY enum)
 * @param {string} params.entityId - ID of the affected entity
 * @param {string} params.entityIdentifier - Human-readable identifier (e.g., PO number, GRN number)
 * @param {string} params.actionDescription - Description of the action
 * @param {Object} [params.beforeSnapshot] - Entity state before the action (for UPDATE)
 * @param {Object} [params.afterSnapshot] - Entity state after the action (for UPDATE)
 * @param {Array} [params.changes] - Array of {field, oldValue, newValue} objects
 * @param {Object} [params.metadata] - Additional metadata
 * @param {Object} [params.request] - Express request object (for IP, user agent)
 * @param {string} [params.status] - Status: SUCCESS, FAILURE, or PARTIAL
 * @param {string} [params.errorMessage] - Error message if status is FAILURE
 */
export async function logAudit({
  user,
  action,
  entityType,
  entityId,
  entityIdentifier = "",
  actionDescription,
  beforeSnapshot = null,
  afterSnapshot = null,
  changes = [],
  metadata = {},
  request = null,
  status = "SUCCESS",
  errorMessage = "",
}) {
  try {
    const auditEntry = {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action,
      actionDescription,
      entityType,
      entityId,
      entityIdentifier,
      beforeSnapshot,
      afterSnapshot,
      changes,
      metadata,
      status,
      errorMessage,
      timestamp: new Date(),
    };

    // Extract request information if available
    if (request) {
      auditEntry.ipAddress = request.ip || request.connection?.remoteAddress || "";
      auditEntry.userAgent = request.get("user-agent") || "";
    }

    await AuditLog.create(auditEntry);
  } catch (error) {
    // Don't throw errors from audit logging - it should never break the main flow
    console.error("Failed to log audit event:", error);
  }
}

/**
 * Helper to compute changes between two objects
 * @param {Object} before - Object before changes
 * @param {Object} after - Object after changes
 * @param {Array<string>} [fieldsToTrack] - Specific fields to track (optional, defaults to all)
 * @returns {Array} Array of changes
 */
export function computeChanges(before, after, fieldsToTrack = null) {
  const changes = [];
  
  if (!before || !after) return changes;

  const beforeObj = before.toObject ? before.toObject() : before;
  const afterObj = after.toObject ? after.toObject() : after;

  const fields = fieldsToTrack || Object.keys({ ...beforeObj, ...afterObj });

  for (const field of fields) {
    // Skip internal Mongoose fields
    if (["_id", "__v", "createdAt", "updatedAt"].includes(field)) continue;

    const oldValue = beforeObj[field];
    const newValue = afterObj[field];

    // Deep comparison for nested objects/arrays
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        oldValue: sanitizeValue(oldValue),
        newValue: sanitizeValue(newValue),
      });
    }
  }

  return changes;
}

/**
 * Sanitize values before storing in audit log
 * - Remove sensitive fields like passwordHash
 * - Truncate very long strings/arrays
 */
function sanitizeValue(value) {
  if (value === null || value === undefined) return value;

  // Remove password fields
  if (typeof value === "object" && value !== null) {
    const sanitized = { ...value };
    delete sanitized.passwordHash;
    delete sanitized.password;
    return sanitized;
  }

  // Truncate very long strings
  if (typeof value === "string" && value.length > 1000) {
    return value.substring(0, 1000) + "... (truncated)";
  }

  return value;
}

/**
 * Convenience functions for common audit actions
 */

export async function logCreate({ user, entityType, entity, entityIdentifier, request }) {
  return logAudit({
    user,
    action: AUDIT_ACTION.CREATE,
    entityType,
    entityId: entity._id,
    entityIdentifier,
    actionDescription: `Created ${entityType}: ${entityIdentifier}`,
    afterSnapshot: sanitizeValue(entity.toObject ? entity.toObject() : entity),
    request,
  });
}

export async function logUpdate({ user, entityType, before, after, entityIdentifier, request }) {
  const changes = computeChanges(before, after);
  
  return logAudit({
    user,
    action: AUDIT_ACTION.UPDATE,
    entityType,
    entityId: after._id,
    entityIdentifier,
    actionDescription: `Updated ${entityType}: ${entityIdentifier}`,
    beforeSnapshot: sanitizeValue(before.toObject ? before.toObject() : before),
    afterSnapshot: sanitizeValue(after.toObject ? after.toObject() : after),
    changes,
    request,
  });
}

export async function logDelete({ user, entityType, entity, entityIdentifier, request }) {
  return logAudit({
    user,
    action: AUDIT_ACTION.DELETE,
    entityType,
    entityId: entity._id,
    entityIdentifier,
    actionDescription: `Deleted ${entityType}: ${entityIdentifier}`,
    beforeSnapshot: sanitizeValue(entity.toObject ? entity.toObject() : entity),
    request,
  });
}

export async function logApprove({ user, entityType, entity, entityIdentifier, request, metadata = {} }) {
  return logAudit({
    user,
    action: AUDIT_ACTION.APPROVE,
    entityType,
    entityId: entity._id,
    entityIdentifier,
    actionDescription: `Approved ${entityType}: ${entityIdentifier}`,
    metadata,
    request,
  });
}

export async function logReject({ user, entityType, entity, entityIdentifier, request, metadata = {} }) {
  return logAudit({
    user,
    action: AUDIT_ACTION.REJECT,
    entityType,
    entityId: entity._id,
    entityIdentifier,
    actionDescription: `Rejected ${entityType}: ${entityIdentifier}`,
    metadata,
    request,
  });
}

export { AUDIT_ACTION, AUDIT_ENTITY };
