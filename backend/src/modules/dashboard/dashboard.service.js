import ProductionPlan from "../production/models/ProductionPlan.js";
import ProductionBatch from "../production/models/ProductionBatch.js";
import Material from "../inventory/models/Material.js";
import GoodsReceipt from "../inventory/models/GoodsReceipt.js";
import PurchaseOrder from "../inventory/models/PurchaseOrder.js";
import MaterialQC from "../quality/models/MaterialQC.js";
import ProductionQC from "../quality/models/ProductionQC.js";
import Machine from "../machines/models/Machine.js";
import MachineDowntime, { DOWNTIME_STATUS } from "../machines/models/MachineDowntime.js";
import FinishedGoods from "../finished-goods/models/FinishedGoods.js";
import Dispatch from "../dispatch/models/Dispatch.js";

const safeCount = (Model, filter = {}) => Model.countDocuments(filter);

const activeDowntimeFilter = { status: { $in: [DOWNTIME_STATUS.OPEN, DOWNTIME_STATUS.IN_PROGRESS] } };

export const getDashboardSummary = async () => {
  const [
    totalMachines, availableMachines, machinesUnderMaintenance, machinesOutOfService, activeDowntimes,
    totalMaterials, totalPurchaseOrders, pendingGoodsReceipts,
    totalProductionPlans, activeProductionBatches,
    pendingProductionQC, pendingMaterialQC,
    totalFinishedGoodsLots, availableFinishedGoodsLots,
    pendingDispatches, completedDispatches,
  ] = await Promise.all([
    safeCount(Machine),
    safeCount(Machine, { status: "Available" }),
    safeCount(Machine, { status: "Under Maintenance" }),
    safeCount(Machine, { status: "Out of Service" }),
    safeCount(MachineDowntime, activeDowntimeFilter),
    safeCount(Material),
    safeCount(PurchaseOrder),
    safeCount(GoodsReceipt, { status: { $in: ["QC Pending", "Received"] } }),
    safeCount(ProductionPlan),
    safeCount(ProductionBatch, { status: { $in: ["Planned", "Ready", "In Progress", "On Hold"] } }),
    safeCount(ProductionQC, { status: "Pending" }),
    safeCount(MaterialQC, { status: "Pending" }),
    safeCount(FinishedGoods),
    safeCount(FinishedGoods, { status: "Available" }),
    safeCount(Dispatch, { status: "Reserved" }),
    safeCount(Dispatch, { status: "Dispatched" }),
  ]);

  return {
    machines:      { total: totalMachines, available: availableMachines, underMaintenance: machinesUnderMaintenance, outOfService: machinesOutOfService, activeDowntimes },
    inventory:     { totalMaterials, totalPurchaseOrders, pendingGoodsReceipts },
    production:    { totalPlans: totalProductionPlans, activeBatches: activeProductionBatches },
    quality:       { pendingProductionQC, pendingMaterialQC, totalPendingInspections: pendingProductionQC + pendingMaterialQC },
    finishedGoods: { totalLots: totalFinishedGoodsLots, availableLots: availableFinishedGoodsLots },
    dispatch:      { pendingDispatches, completedDispatches },
    generatedAt:   new Date().toISOString(),
  };
};

export const getProductionDashboard = async () => {
  const [totalPlans, activeBatches, completedBatches, batchesOnHold, batchesPendingReview] = await Promise.all([
    safeCount(ProductionPlan),
    safeCount(ProductionBatch, { status: { $in: ["Planned", "Ready", "In Progress"] } }),
    safeCount(ProductionBatch, { status: "Completed" }),
    safeCount(ProductionBatch, { status: "On Hold" }),
    safeCount(ProductionBatch, { status: "Pending Review" }),
  ]);
  return { totalPlans, activeBatches, completedBatches, batchesOnHold, batchesPendingReview, generatedAt: new Date().toISOString() };
};

export const getInventoryDashboard = async () => {
  const [totalMaterials, totalPurchaseOrders, pendingGoodsReceipts, totalFinishedGoodsLots, availableFinishedGoodsLots] = await Promise.all([
    safeCount(Material),
    safeCount(PurchaseOrder),
    safeCount(GoodsReceipt, { status: { $in: ["QC Pending", "Received"] } }),
    safeCount(FinishedGoods),
    safeCount(FinishedGoods, { status: "Available" }),
  ]);
  return { totalMaterials, totalPurchaseOrders, pendingGoodsReceipts, totalFinishedGoodsLots, availableFinishedGoodsLots, generatedAt: new Date().toISOString() };
};

export const getQualityDashboard = async () => {
  const [pendingMaterialQC, pendingProductionQC, acceptedProductionQC, rejectedProductionQC, onHoldProductionQC] = await Promise.all([
    safeCount(MaterialQC, { status: "Pending" }),
    safeCount(ProductionQC, { status: "Pending" }),
    safeCount(ProductionQC, { status: "Accepted" }),
    safeCount(ProductionQC, { status: "Rejected" }),
    safeCount(ProductionQC, { status: "On Hold" }),
  ]);
  return { pendingMaterialQC, pendingProductionQC, acceptedProductionQC, rejectedProductionQC, onHoldProductionQC, generatedAt: new Date().toISOString() };
};

export const getMachineDashboard = async () => {
  const [totalMachines, availableMachines, machinesUnderMaintenance, machinesOutOfService, activeDowntimes] = await Promise.all([
    safeCount(Machine),
    safeCount(Machine, { status: "Available" }),
    safeCount(Machine, { status: "Under Maintenance" }),
    safeCount(Machine, { status: "Out of Service" }),
    safeCount(MachineDowntime, activeDowntimeFilter),
  ]);
  return { totalMachines, availableMachines, machinesUnderMaintenance, machinesOutOfService, activeDowntimes, generatedAt: new Date().toISOString() };
};

export const getDispatchDashboard = async () => {
  const [reservedDispatches, completedDispatches, cancelledDispatches] = await Promise.all([
    safeCount(Dispatch, { status: "Reserved" }),
    safeCount(Dispatch, { status: "Dispatched" }),
    safeCount(Dispatch, { status: "Cancelled" }),
  ]);
  return { reservedDispatches, completedDispatches, cancelledDispatches, generatedAt: new Date().toISOString() };
};
