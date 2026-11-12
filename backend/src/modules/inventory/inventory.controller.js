import * as service from "./inventory.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

function handler(action, message, status = 200) {
  return async (req, res, next) => {
    try {
      const data = await action(req);
      res.status(status).json(new ApiResponse(status, message, data));
    } catch (error) {
      next(error);
    }
  };
}

// Materials
export const createMaterial = handler(
  (req) => service.createMaterial(req.validated.body, req.user._id),
  "Material created successfully",
  201
);
export const listMaterials = handler(
  (req) => service.listMaterials(req.validated.query),
  "Materials retrieved successfully"
);
export const getMaterial = handler(
  (req) => service.getMaterial(req.validated.params.id),
  "Material retrieved successfully"
);
export const updateMaterial = handler(
  (req) => service.updateMaterial(req.validated.params.id, req.validated.body, req.user._id),
  "Material updated successfully"
);
export const deactivateMaterial = handler(
  (req) => service.deactivateMaterial(req.validated.params.id, req.user._id),
  "Material deactivated successfully"
);

// Suppliers
export const createSupplier = handler(
  (req) => service.createSupplier(req.validated.body, req.user._id),
  "Supplier created successfully",
  201
);
export const listSuppliers = handler(
  (req) => service.listSuppliers(req.validated.query),
  "Suppliers retrieved successfully"
);
export const getSupplier = handler(
  (req) => service.getSupplier(req.validated.params.id),
  "Supplier retrieved successfully"
);
export const updateSupplier = handler(
  (req) => service.updateSupplier(req.validated.params.id, req.validated.body, req.user._id),
  "Supplier updated successfully"
);
export const deactivateSupplier = handler(
  (req) => service.deactivateSupplier(req.validated.params.id, req.user._id),
  "Supplier deactivated successfully"
);

// Purchase Orders
export const createPurchaseOrder = handler(
  (req) => service.createPurchaseOrder(req.validated.body, req.user._id),
  "Purchase order created successfully",
  201
);
export const listPurchaseOrders = handler(
  (req) => service.listPurchaseOrders(req.validated.query),
  "Purchase orders retrieved successfully"
);
export const getPurchaseOrder = handler(
  (req) => service.getPurchaseOrder(req.validated.params.id),
  "Purchase order retrieved successfully"
);
export const updatePurchaseOrder = handler(
  (req) => service.updatePurchaseOrder(req.validated.params.id, req.validated.body, req.user._id),
  "Purchase order updated successfully"
);
export const approvePurchaseOrder = handler(
  (req) => service.approvePurchaseOrder(req.validated.params.id, req.user._id),
  "Purchase order approved successfully"
);
export const cancelPurchaseOrder = handler(
  (req) => service.cancelPurchaseOrder(req.validated.params.id, req.user._id),
  "Purchase order cancelled successfully"
);

// Goods Receipts
export const createGoodsReceipt = handler(
  (req) => service.createGoodsReceipt(req.validated.body, req.user._id),
  "Goods Receipt Note created successfully.",
  201
);
export const listGoodsReceipts = handler(
  (req) => service.listGoodsReceipts(req.validated.query),
  "Goods Receipt Notes retrieved successfully."
);
export const getGoodsReceipt = handler(
  (req) => service.getGoodsReceipt(req.validated.params.id),
  "Goods Receipt Note retrieved successfully."
);
export const updateGoodsReceipt = handler(
  (req) => service.updateGoodsReceipt(req.validated.params.id, req.validated.body, req.user._id),
  "Goods Receipt Note updated successfully."
);
export const changeGRNStatus = handler(
  (req) => service.changeGRNStatus(req.validated.params.id, req.validated.body.status, req.user._id),
  "GRN status updated successfully."
);
export const updateGRNItemStatus = handler(
  (req) => service.updateGRNItemStatus(req.validated.params.grnId, req.validated.params.itemId, req.validated.body, req.user._id),
  "GRN item status updated successfully."
);

// Purchase Order Item Completion
export const togglePurchaseOrderItemCompletion = handler(
  (req) => service.togglePurchaseOrderItemCompletion(
    req.validated.params.poId,
    req.validated.params.itemId,
    req.validated.body.isComplete,
    req.user._id
  ),
  "Purchase order item completion status updated successfully"
);

// Stock
export const getStockBalances = handler(
  (req) => service.getStockBalances(req.validated.query),
  "Stock balances retrieved successfully."
);
export const listStockTransactions = handler(
  (req) => service.listStockTransactions(req.validated.query),
  "Stock transactions retrieved successfully."
);
export const issueMaterialsToProduction = handler(
  (req) => service.issueMaterialsToProduction(req.validated.body, req.user._id),
  "Materials issued to production successfully.",
  201
);

export const manualIssue = handler(
  (req) => service.manualIssue(req.validated.body.items, req.validated.body.remarks, req.user._id),
  "Materials issued successfully.",
  201
);
