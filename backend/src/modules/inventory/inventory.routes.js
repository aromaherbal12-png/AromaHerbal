import { Router } from "express";

import * as controller from "./inventory.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { allowRoles } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { USER_ROLES } from "../users/models/User.js";

import {
  createMaterialSchema,
  updateMaterialSchema,
  createSupplierSchema,
  updateSupplierSchema,
  inventoryIdSchema,
  listInventorySchema,
  createPurchaseOrderSchema,
  listPurchaseOrdersSchema,
  purchaseOrderIdSchema,
  updatePurchaseOrderSchema,
  createGoodsReceiptSchema,
  listGoodsReceiptsSchema,
  goodsReceiptIdSchema,
  stockBalanceQuerySchema,
  stockTransactionQuerySchema,
  productionIssueSchema,
  manualIssueSchema,
} from "./inventory.validation.js";

const router = Router();

const canManageInventory = allowRoles(
  USER_ROLES.ADMINISTRATOR,
  USER_ROLES.STORE_INCHARGE
);

const canCreatePurchaseOrder = allowRoles(
  USER_ROLES.ADMINISTRATOR,
  USER_ROLES.STORE_INCHARGE
);

const canApprovePurchaseOrder = allowRoles(
  USER_ROLES.ADMINISTRATOR,
  USER_ROLES.MANAGER,
  USER_ROLES.STORE_INCHARGE
);

const canCreateGoodsReceipt = allowRoles(
  USER_ROLES.ADMINISTRATOR,
  USER_ROLES.STORE_INCHARGE
);

// Quality Incharge can change GRN status (Under Testing → Approved/Rejected) and update item statuses
const canUpdateGRNStatus = allowRoles(
  USER_ROLES.ADMINISTRATOR,
  USER_ROLES.STORE_INCHARGE,
  USER_ROLES.QUALITY_INCHARGE
);

const canUpdateGRNItemStatus = allowRoles(
  USER_ROLES.ADMINISTRATOR,
  USER_ROLES.QUALITY_INCHARGE,
  USER_ROLES.STORE_INCHARGE
);

router.use(authenticate);

// Materials
router.get("/materials", validate(listInventorySchema), controller.listMaterials);
router.get("/materials/:id", validate(inventoryIdSchema), controller.getMaterial);
router.post("/materials", canManageInventory, validate(createMaterialSchema), controller.createMaterial);
router.patch("/materials/:id", canManageInventory, validate(updateMaterialSchema), controller.updateMaterial);
router.patch("/materials/:id/deactivate", canManageInventory, validate(inventoryIdSchema), controller.deactivateMaterial);

// Suppliers
router.get("/suppliers", validate(listInventorySchema), controller.listSuppliers);
router.get("/suppliers/:id", validate(inventoryIdSchema), controller.getSupplier);
router.post("/suppliers", canManageInventory, validate(createSupplierSchema), controller.createSupplier);
router.patch("/suppliers/:id", canManageInventory, validate(updateSupplierSchema), controller.updateSupplier);
router.patch("/suppliers/:id/deactivate", canManageInventory, validate(inventoryIdSchema), controller.deactivateSupplier);

// Purchase Orders
router.get("/purchase-orders", validate(listPurchaseOrdersSchema), controller.listPurchaseOrders);
router.get("/purchase-orders/:id", validate(purchaseOrderIdSchema), controller.getPurchaseOrder);
router.post("/purchase-orders", canCreatePurchaseOrder, validate(createPurchaseOrderSchema), controller.createPurchaseOrder);
router.patch("/purchase-orders/:id", canCreatePurchaseOrder, validate(updatePurchaseOrderSchema), controller.updatePurchaseOrder);
router.patch("/purchase-orders/:id/approve", canApprovePurchaseOrder, validate(purchaseOrderIdSchema), controller.approvePurchaseOrder);
router.patch("/purchase-orders/:id/cancel", canApprovePurchaseOrder, validate(purchaseOrderIdSchema), controller.cancelPurchaseOrder);
router.patch(
  "/purchase-orders/:poId/items/:itemId/completion",
  canManageInventory,
  (req, res, next) => {
    // Simple inline validation for this endpoint
    const poIdValid = /^[a-f\d]{24}$/i.test(req.params.poId);
    const itemIdValid = /^[a-f\d]{24}$/i.test(req.params.itemId);
    const isCompleteValid = typeof req.body.isComplete === 'boolean';
    
    if (!poIdValid || !itemIdValid || !isCompleteValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameters',
        data: null
      });
    }
    
    req.validated = {
      params: { poId: req.params.poId, itemId: req.params.itemId },
      body: { isComplete: req.body.isComplete }
    };
    next();
  },
  controller.togglePurchaseOrderItemCompletion
);

// Goods Receipts
router.get("/goods-receipts", validate(listGoodsReceiptsSchema), controller.listGoodsReceipts);
router.get("/goods-receipts/:id", validate(goodsReceiptIdSchema), controller.getGoodsReceipt);
router.post("/goods-receipts", canCreateGoodsReceipt, validate(createGoodsReceiptSchema), controller.createGoodsReceipt);
router.patch("/goods-receipts/:id", canCreateGoodsReceipt, (req, res, next) => {
  if (!req.params.id || !/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid GRN ID" });
  }
  req.validated = { params: { id: req.params.id }, body: req.body };
  next();
}, controller.updateGoodsReceipt);
router.patch("/goods-receipts/:id/status", canUpdateGRNStatus, (req, res, next) => {
  const id = req.params.id;
  const validStatuses = ["Pending", "Quarantined", "Under Testing", "Approved", "Partially Approved", "Rejected"];
  if (!id || !/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ success: false, message: "Invalid GRN ID" });
  }
  if (!req.body.status || !validStatuses.includes(req.body.status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${validStatuses.join(", ")}` });
  }
  req.validated = { params: { id }, body: { status: req.body.status } };
  next();
}, controller.changeGRNStatus);
router.patch(
  "/goods-receipts/:grnId/items/:itemId/status",
  canUpdateGRNItemStatus,
  (req, res, next) => {
    // Simple inline validation for this endpoint
    const grnIdValid = /^[a-f\d]{24}$/i.test(req.params.grnId);
    const itemIdValid = /^[a-f\d]{24}$/i.test(req.params.itemId);
    const validStatuses = ['Accepted', 'Rejected'];
    const statusValid = validStatuses.includes(req.body.qualityStatus);
    
    if (!grnIdValid || !itemIdValid || !statusValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameters. qualityStatus must be "Accepted" or "Rejected"',
        data: null
      });
    }
    
    req.validated = {
      params: { grnId: req.params.grnId, itemId: req.params.itemId },
      body: req.body
    };
    next();
  },
  controller.updateGRNItemStatus
);

// Stock
router.get("/stock-balances", validate(stockBalanceQuerySchema), controller.getStockBalances);
router.get("/stock-transactions", validate(stockTransactionQuerySchema), controller.listStockTransactions);
router.post(
  "/production-issues",
  allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.PRODUCTION_INCHARGE, USER_ROLES.STORE_INCHARGE),
  validate(productionIssueSchema),
  controller.issueMaterialsToProduction
);

// Manual issue (ad-hoc deduction from inventory for production without a backend batch ID)
router.post(
  "/stock-transactions/manual-issue",
  allowRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.PRODUCTION_INCHARGE, USER_ROLES.STORE_INCHARGE),
  validate(manualIssueSchema),
  controller.manualIssue
);

export default router;
