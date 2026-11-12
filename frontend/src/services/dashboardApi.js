/**
 * dashboardApi.js
 * API service for dashboard and reporting
 */

import api from "./api.js";

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export const dashboardApi = {
  /**
   * Get overall system dashboard summary
   */
  getSummary: () => api.get("/dashboard"),

  /**
   * Get production-specific dashboard
   */
  getProductionDashboard: () => api.get("/dashboard/production"),

  /**
   * Get inventory-specific dashboard
   */
  getInventoryDashboard: () => api.get("/dashboard/inventory"),

  /**
   * Get quality-specific dashboard
   */
  getQualityDashboard: () => api.get("/dashboard/quality"),

  /**
   * Get machines-specific dashboard
   */
  getMachineDashboard: () => api.get("/dashboard/machines"),

  /**
   * Get dispatch-specific dashboard
   */
  getDispatchDashboard: () => api.get("/dashboard/dispatch"),
};

export default dashboardApi;
