import { ApiError } from "../utils/ApiError.js";

/**
 * Permission actions that can be checked
 */
export const PERMISSIONS = {
  // Purchase Orders
  CREATE_PURCHASE_ORDER: "create:purchase_order",
  APPROVE_PURCHASE_ORDER: "approve:purchase_order",
  CANCEL_PURCHASE_ORDER: "cancel:purchase_order",
  
  // Materials & Inventory
  MANAGE_INVENTORY: "manage:inventory",
  VIEW_INVENTORY: "view:inventory",
  ISSUE_MATERIALS: "issue:materials",
  
  // Quality Control
  PERFORM_QC: "perform:qc",
  APPROVE_QC: "approve:qc",
  REJECT_QC: "reject:qc",
  
  // Production
  CREATE_PRODUCTION_PLAN: "create:production_plan",
  APPROVE_PRODUCTION_PLAN: "approve:production_plan",
  MANAGE_PRODUCTION_BATCH: "manage:production_batch",
  
  // Machines
  MANAGE_MACHINES: "manage:machines",
  REPORT_DOWNTIME: "report:downtime",
  
  // Users & Access
  MANAGE_USERS: "manage:users",
  VIEW_AUDIT_LOGS: "view:audit_logs",
  
  // Dispatch
  CREATE_DISPATCH: "create:dispatch",
  CONFIRM_DISPATCH: "confirm:dispatch",
};

/**
 * Role-to-permissions mapping
 * Defines what each role can do
 */
const ROLE_PERMISSIONS = {
  Administrator: Object.values(PERMISSIONS), // Full access
  
  Manager: [
    PERMISSIONS.CREATE_PURCHASE_ORDER,
    PERMISSIONS.APPROVE_PURCHASE_ORDER,
    PERMISSIONS.CANCEL_PURCHASE_ORDER,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.ISSUE_MATERIALS,
    PERMISSIONS.PERFORM_QC,
    PERMISSIONS.APPROVE_QC,
    PERMISSIONS.REJECT_QC,
    PERMISSIONS.CREATE_PRODUCTION_PLAN,
    PERMISSIONS.APPROVE_PRODUCTION_PLAN,
    PERMISSIONS.MANAGE_PRODUCTION_BATCH,
    PERMISSIONS.MANAGE_MACHINES,
    PERMISSIONS.REPORT_DOWNTIME,
    PERMISSIONS.CREATE_DISPATCH,
    PERMISSIONS.CONFIRM_DISPATCH,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  
  "Store-Incharge": [
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.ISSUE_MATERIALS,
    PERMISSIONS.CREATE_PURCHASE_ORDER,
  ],
  
  "Quality-Incharge": [
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.PERFORM_QC,
    PERMISSIONS.APPROVE_QC,
    PERMISSIONS.REJECT_QC,
  ],
  
  "Production-Incharge": [
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.ISSUE_MATERIALS,
    PERMISSIONS.CREATE_PRODUCTION_PLAN,
    PERMISSIONS.MANAGE_PRODUCTION_BATCH,
    PERMISSIONS.REPORT_DOWNTIME,
  ],
  
  Operator: [
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.MANAGE_PRODUCTION_BATCH,
    PERMISSIONS.REPORT_DOWNTIME,
  ],
};

/**
 * Check if a user has a specific permission
 * 
 * @param {Object} user - User object with role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

/**
 * Middleware factory to require specific permission
 * 
 * Usage: router.post('/orders', requirePermission(PERMISSIONS.CREATE_PURCHASE_ORDER), controller)
 * 
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (!hasPermission(req.user, permission)) {
      throw new ApiError(
        403,
        `Insufficient permissions. Required: ${permission}`
      );
    }

    next();
  };
}

/**
 * Middleware factory to require ANY of the specified permissions
 * 
 * @param {...string} permissions - Array of permissions (any one is sufficient)
 * @returns {Function} Express middleware
 */
export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    const hasAny = permissions.some((permission) =>
      hasPermission(req.user, permission)
    );

    if (!hasAny) {
      throw new ApiError(
        403,
        `Insufficient permissions. Required any of: ${permissions.join(", ")}`
      );
    }

    next();
  };
}

/**
 * Middleware factory to require ALL of the specified permissions
 * 
 * @param {...string} permissions - Array of permissions (all required)
 * @returns {Function} Express middleware
 */
export function requireAllPermissions(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    const hasAll = permissions.every((permission) =>
      hasPermission(req.user, permission)
    );

    if (!hasAll) {
      throw new ApiError(
        403,
        `Insufficient permissions. Required all of: ${permissions.join(", ")}`
      );
    }

    next();
  };
}
