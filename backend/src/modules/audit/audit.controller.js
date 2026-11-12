import AuditLog from "../../models/AuditLog.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * List audit logs with filtering and pagination
 */
export async function listAuditLogs(req, res, next) {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      status,
      search,
    } = req.query;

    const filter = {};

    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Text search across multiple fields
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { actionDescription: searchRegex },
        { userName: searchRegex },
        { userEmail: searchRegex },
        { entityIdentifier: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json(
      new ApiResponse(200, "Audit logs retrieved successfully", {
        items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single audit log by ID
 */
export async function getAuditLog(req, res, next) {
  try {
    const { id } = req.params;

    const auditLog = await AuditLog.findById(id)
      .populate("userId", "name email role")
      .lean();

    if (!auditLog) {
      throw new ApiError(404, "Audit log not found");
    }

    res.status(200).json(
      new ApiResponse(200, "Audit log retrieved successfully", auditLog)
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(req, res, next) {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AuditLog.find({ entityType, entityId })
        .populate("userId", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments({ entityType, entityId }),
    ]);

    res.status(200).json(
      new ApiResponse(200, "Entity audit trail retrieved successfully", {
        items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(req, res, next) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const filter = { userId };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json(
      new ApiResponse(200, "User audit logs retrieved successfully", {
        items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const [totalLogs, actionBreakdown, entityBreakdown, userActivity] = await Promise.all([
      AuditLog.countDocuments(filter),
      
      AuditLog.aggregate([
        { $match: filter },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      
      AuditLog.aggregate([
        { $match: filter },
        { $group: { _id: "$entityType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      
      AuditLog.aggregate([
        { $match: filter },
        { $group: { _id: "$userId", userName: { $first: "$userName" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.status(200).json(
      new ApiResponse(200, "Audit statistics retrieved successfully", {
        totalLogs,
        actionBreakdown,
        entityBreakdown,
        topUsers: userActivity,
      })
    );
  } catch (error) {
    next(error);
  }
}
