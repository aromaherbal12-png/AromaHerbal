import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Material from "./models/Material.js";
import Supplier from "./models/Supplier.js";
import PurchaseOrder, { PURCHASE_ORDER_STATUS } from "./models/PurchaseOrder.js";
import GoodsReceipt, { GOODS_RECEIPT_STATUS } from "./models/GoodsReceipt.js";
import StockTransaction, { STOCK_TRANSACTION_TYPE } from "./models/StockTransaction.js";
import ProductionBatch from "../production/models/ProductionBatch.js";
import { ApiError } from "../../utils/ApiError.js";

function handleDuplicate(error, fieldLabel) {
  if (error?.code === 11000) throw new ApiError(409, `${fieldLabel} already exists`);
  throw error;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listRecords(Model, query, searchableFields) {
  const filter = {};
  if (query.active !== undefined) filter.isActive = query.active === "true";
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = searchableFields.map((field) => ({ [field]: regex }));
  }
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    Model.countDocuments(filter),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

// ── Materials ─────────────────────────────────────────────────────────────────

export async function createMaterial(data, actorId) {
  try {
    return await Material.create({ ...data, materialCode: data.materialCode.toUpperCase(), unit: data.unit.toUpperCase(), createdBy: actorId });
  } catch (error) { handleDuplicate(error, "Material code"); }
}

export async function listMaterials(query) {
  return listRecords(Material, query, ["materialCode", "name", "category"]);
}

export async function getMaterial(id) {
  const material = await Material.findById(id).lean();
  if (!material) throw new ApiError(404, "Material not found");
  return material;
}

export async function updateMaterial(id, data, actorId) {
  try {
    const material = await Material.findByIdAndUpdate(
      id,
      { $set: { ...data, ...(data.materialCode && { materialCode: data.materialCode.toUpperCase() }), ...(data.unit && { unit: data.unit.toUpperCase() }), updatedBy: actorId } },
      { new: true, runValidators: true }
    );
    if (!material) throw new ApiError(404, "Material not found");
    return material;
  } catch (error) { handleDuplicate(error, "Material code"); }
}

export async function deactivateMaterial(id, actorId) {
  const material = await Material.findByIdAndUpdate(id, { $set: { isActive: false, updatedBy: actorId } }, { new: true, runValidators: true });
  if (!material) throw new ApiError(404, "Material not found");
  return material;
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function createSupplier(data, actorId) {
  try {
    return await Supplier.create({ ...data, supplierCode: data.supplierCode.toUpperCase(), createdBy: actorId });
  } catch (error) { handleDuplicate(error, "Supplier code"); }
}

export async function listSuppliers(query) {
  return listRecords(Supplier, query, ["supplierCode", "name", "contactPerson", "email"]);
}

export async function getSupplier(id) {
  const supplier = await Supplier.findById(id).lean();
  if (!supplier) throw new ApiError(404, "Supplier not found");
  return supplier;
}

export async function updateSupplier(id, data, actorId) {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      id,
      { $set: { ...data, ...(data.supplierCode && { supplierCode: data.supplierCode.toUpperCase() }), ...(data.email && { email: data.email.toLowerCase() }), updatedBy: actorId } },
      { new: true, runValidators: true }
    );
    if (!supplier) throw new ApiError(404, "Supplier not found");
    return supplier;
  } catch (error) { handleDuplicate(error, "Supplier code"); }
}

export async function deactivateSupplier(id, actorId) {
  const supplier = await Supplier.findByIdAndUpdate(id, { $set: { isActive: false, updatedBy: actorId } }, { new: true, runValidators: true });
  if (!supplier) throw new ApiError(404, "Supplier not found");
  return supplier;
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function makePoNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `PO-${date}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

async function requireActiveSupplier(supplierId) {
  const supplier = await Supplier.findOne({ _id: supplierId, isActive: true }).lean();
  if (!supplier) throw new ApiError(400, "Supplier does not exist or is inactive");
  return supplier;
}

async function buildPurchaseOrderItems(inputItems) {
  const materialIds = inputItems.map((item) => item.materialId);
  if (new Set(materialIds).size !== materialIds.length) throw new ApiError(400, "Each material must appear only once in a purchase order");
  const materials = await Material.find({ _id: { $in: materialIds }, isActive: true }).lean();
  const materialMap = new Map(materials.map((m) => [m._id.toString(), m]));
  const items = inputItems.map((input) => {
    const material = materialMap.get(input.materialId);
    if (!material) throw new ApiError(400, `Material ${input.materialId} does not exist or is inactive`);
    const gstRate = Number(input.gstRate ?? 18);
    const baseAmount = roundMoney(input.orderedQty * input.unitPrice);
    const gstAmount = roundMoney(baseAmount * gstRate / 100);
    const totalAmount = roundMoney(baseAmount + gstAmount);
    if (!Number.isFinite(totalAmount)) throw new ApiError(400, "Invalid purchase order line total");
    return {
      material: material._id,
      materialCode: material.materialCode,
      materialName: material.name,
      unit: material.unit,
      orderedQty: input.orderedQty,
      receivedQty: 0,
      unitPrice: input.unitPrice,
      gstRate,
      baseAmount,
      gstAmount,
      totalAmount,
      lineTotal: totalAmount,
    };
  });
  const subtotal = roundMoney(items.reduce((t, i) => t + i.lineTotal, 0));
  if (!Number.isFinite(subtotal)) throw new ApiError(400, "Invalid purchase order subtotal");
  return { items, subtotal };
}

export async function createPurchaseOrder(data, actorId) {
  const supplier = await requireActiveSupplier(data.supplierId);
  const { items, subtotal } = await buildPurchaseOrderItems(data.items);
  try {
    return await PurchaseOrder.create({ poNumber: makePoNumber(), supplier: supplier._id, supplierCode: supplier.supplierCode, supplierName: supplier.name, items, subtotal, expectedDeliveryDate: data.expectedDeliveryDate ?? null, notes: data.notes ?? "", status: PURCHASE_ORDER_STATUS.DRAFT, createdBy: actorId });
  } catch (error) { handleDuplicate(error, "Purchase order number"); }
}

export async function listPurchaseOrders(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.supplierId) filter.supplier = query.supplierId;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ poNumber: regex }, { supplierName: regex }, { supplierCode: regex }];
  }
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    PurchaseOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate("createdBy", "name email").populate("approvedBy", "name email").lean(),
    PurchaseOrder.countDocuments(filter),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

export async function getPurchaseOrder(id) {
  const order = await PurchaseOrder.findById(id).populate("supplier", "supplierCode name").populate("items.material", "materialCode name unit").populate("createdBy", "name email").populate("approvedBy", "name email").lean();
  if (!order) throw new ApiError(404, "Purchase order not found");
  return order;
}

export async function updatePurchaseOrder(id, data, actorId) {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new ApiError(404, "Purchase order not found");
  if (order.status !== PURCHASE_ORDER_STATUS.DRAFT) throw new ApiError(409, "Only draft purchase orders can be edited");
  if (data.supplierId) {
    const supplier = await requireActiveSupplier(data.supplierId);
    order.supplier = supplier._id; order.supplierCode = supplier.supplierCode; order.supplierName = supplier.name;
  }
  if (data.items) { const { items, subtotal } = await buildPurchaseOrderItems(data.items); order.items = items; order.subtotal = subtotal; }
  if (data.expectedDeliveryDate !== undefined) order.expectedDeliveryDate = data.expectedDeliveryDate;
  if (data.notes !== undefined) order.notes = data.notes;
  order.updatedBy = actorId;
  await order.save();
  return order;
}

export async function approvePurchaseOrder(id, actorId) {
  const order = await PurchaseOrder.findOneAndUpdate({ _id: id, status: PURCHASE_ORDER_STATUS.DRAFT }, { $set: { status: PURCHASE_ORDER_STATUS.APPROVED, approvedBy: actorId, approvedAt: new Date(), updatedBy: actorId } }, { new: true, runValidators: true });
  if (order) return order;
  const existing = await PurchaseOrder.findById(id).lean();
  if (!existing) throw new ApiError(404, "Purchase order not found");
  throw new ApiError(409, "Only draft purchase orders can be approved");
}

export async function cancelPurchaseOrder(id, actorId) {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new ApiError(404, "Purchase order not found");
  if (![PURCHASE_ORDER_STATUS.DRAFT, PURCHASE_ORDER_STATUS.APPROVED].includes(order.status)) throw new ApiError(409, "This purchase order cannot be cancelled in its current state");
  if (order.items.some((item) => item.receivedQty > 0)) throw new ApiError(409, "A purchase order with received quantities cannot be cancelled");
  order.status = PURCHASE_ORDER_STATUS.CANCELLED; order.cancelledBy = actorId; order.cancelledAt = new Date(); order.updatedBy = actorId;
  await order.save();
  return order;
}

// ── Goods Receipts ────────────────────────────────────────────────────────────

function makeGrnNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `GRN-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

// ── Sticker Generation ────────────────────────────────────────────────────────

async function generateQuarantineSticker(session) {
  const year = new Date().getFullYear();
  const prefix = `QS-${year}-`;
  
  // Find the highest existing quarantine sticker number for this year
  const query = GoodsReceipt.findOne({ quarantineSticker: { $regex: `^${prefix}` } })
    .sort({ quarantineSticker: -1 })
    .select("quarantineSticker")
    .lean();
  if (session) query.session(session);
  const latestGRN = await query;
  
  let nextNumber = 1;
  if (latestGRN && latestGRN.quarantineSticker) {
    const match = latestGRN.quarantineSticker.match(/QS-\d{4}-(\d{4})$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

async function generateApprovedSticker(session) {
  const year = new Date().getFullYear();
  const prefix = `AS-${year}-`;
  
  // Find the highest existing approved sticker number for this year
  const query = GoodsReceipt.findOne({ approvedSticker: { $regex: `^${prefix}` } })
    .sort({ approvedSticker: -1 })
    .select("approvedSticker")
    .lean();
  if (session) query.session(session);
  const latestGRN = await query;
  
  let nextNumber = 1;
  if (latestGRN && latestGRN.approvedSticker) {
    const match = latestGRN.approvedSticker.match(/AS-\d{4}-(\d{4})$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

export async function createGoodsReceipt(data, actorId) {
  const session = await mongoose.startSession();
  try {
    let createdReceipt;
    await session.withTransaction(async () => {
      // Find PO by ObjectId or by PO number (supports localStorage POs)
      let purchaseOrder;
      if (/^[a-f\d]{24}$/i.test(data.purchaseOrderId)) {
        purchaseOrder = await PurchaseOrder.findById(data.purchaseOrderId).session(session);
      } else {
        // Try to find by PO number for localStorage POs
        purchaseOrder = await PurchaseOrder.findOne({ poNumber: data.purchaseOrderId }).session(session);
      }
      
      if (!purchaseOrder) {
        throw new ApiError(404, `Purchase Order ${data.purchaseOrderId} not found. Note: Only POs created through the backend API can be used for GRNs. Please recreate this PO through the system.`);
      }
      
      const allowedStatuses = [PURCHASE_ORDER_STATUS.APPROVED, PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED];
      if (!allowedStatuses.includes(purchaseOrder.status)) {
        throw new ApiError(409, "Only approved or partially received Purchase Orders can receive a GRN.");
      }
      
      // Check for duplicate materials in request
      const requestedMaterialIds = data.items.map((item) => String(item.material));
      if (new Set(requestedMaterialIds).size !== requestedMaterialIds.length) {
        throw new ApiError(400, "A material can only appear once in a GRN.");
      }
      
      const grnItems = [];
      for (const inputItem of data.items) {
        // Find the corresponding PO item by material
        const poItem = purchaseOrder.items.find(item => String(item.material) === String(inputItem.material));
        if (!poItem) {
          throw new ApiError(400, `Material ${inputItem.material} does not belong to this Purchase Order.`);
        }
        
        const outstandingQty = Number(poItem.orderedQty) - Number(poItem.receivedQty || 0);
        if (inputItem.receivedQty > outstandingQty + 1e-9) {
          throw new ApiError(409, `Received quantity for ${poItem.materialCode} exceeds the outstanding quantity (${outstandingQty}).`);
        }
        
        if (inputItem.expiryDate && new Date(inputItem.expiryDate).getTime() < Date.now()) {
          throw new ApiError(400, `The expiry date for ${poItem.materialCode} cannot be in the past.`);
        }
        
        // Get material category from Material model
        const material = await Material.findById(poItem.material).session(session);
        const category = material?.category || "Raw Material";
        
        grnItems.push({ 
          purchaseOrderItemId: poItem._id,
          material: poItem.material, 
          materialCode: poItem.materialCode, 
          materialName: poItem.materialName, 
          category: category,
          unit: inputItem.unit || poItem.unit,
          unitPrice: inputItem.unitPrice || poItem.unitPrice,
          orderedQty: inputItem.orderedQty || poItem.orderedQty, 
          previouslyReceivedQty: poItem.receivedQty || 0, 
          receivedQty: inputItem.receivedQty,
          receivedDate: inputItem.receivedDate ? new Date(inputItem.receivedDate) : new Date(),
          batchNumber: inputItem.batchNumber || "", 
          invoiceChallan: inputItem.invoiceChallan || "",
          expiryDate: inputItem.expiryDate ? new Date(inputItem.expiryDate) : null, 
          notes: inputItem.notes || "", 
          qualityStatus: "Pending Inspection" 
        });
        
        // Update cumulative received quantity
        const newReceivedQty = Number(poItem.receivedQty || 0) + inputItem.receivedQty;
        poItem.receivedQty = newReceivedQty;
        
        // Auto-check isFullyReceived if quantity matches or exceeds ordered quantity
        if (newReceivedQty >= Number(poItem.orderedQty) - 1e-9) {
          poItem.isFullyReceived = true;
          poItem.markedCompleteAt = new Date();
          poItem.markedCompleteBy = actorId;
        }
      }
      
      // Update PO status based on item-level completion
      const allItemsComplete = purchaseOrder.items.every((item) => item.isFullyReceived === true);
      const anyItemReceived = purchaseOrder.items.some((item) => Number(item.receivedQty || 0) > 0);
      
      purchaseOrder.status = allItemsComplete 
        ? PURCHASE_ORDER_STATUS.COMPLETED 
        : anyItemReceived 
          ? PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED 
          : PURCHASE_ORDER_STATUS.APPROVED;
      
      purchaseOrder.updatedBy = actorId;
      await purchaseOrder.save({ session });
      
      // Determine GRN status and generate sticker if needed
      const isDraft = data.isDraft === true;
      let grnStatus = GOODS_RECEIPT_STATUS.PENDING;
      let quarantineSticker = "";
      let quarantinedAt = null;
      let quarantinedBy = null;
      
      if (!isDraft) {
        // Complete & Send to QC - generate quarantine sticker
        grnStatus = GOODS_RECEIPT_STATUS.QUARANTINED;
        quarantineSticker = await generateQuarantineSticker(session);
        quarantinedAt = new Date();
        quarantinedBy = actorId;
      }
      
      const [receipt] = await GoodsReceipt.create([{ 
        grnNumber: makeGrnNumber(), 
        purchaseOrder: purchaseOrder._id, 
        poNumber: purchaseOrder.poNumber, 
        supplier: purchaseOrder.supplier, 
        supplierCode: purchaseOrder.supplierCode, 
        supplierName: purchaseOrder.supplierName, 
        supplierDeliveryNumber: data.supplierDeliveryNumber || "", 
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(), 
        items: grnItems, 
        status: grnStatus,
        quarantineSticker: quarantineSticker,
        quarantinedAt: quarantinedAt,
        quarantinedBy: quarantinedBy,
        notes: data.notes || "", 
        receivedBy: actorId 
      }], { session });
      
      createdReceipt = receipt;
    });
    return await GoodsReceipt.findById(createdReceipt._id).populate("purchaseOrder", "poNumber status").populate("supplier", "supplierCode name").populate("receivedBy", "name email role").lean();
  } catch (error) {
    // Explicitly abort session on error (withTransaction auto-aborts, but this ensures cleanup)
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle specific database errors
    if (error?.code === 11000) {
      throw new ApiError(409, "A duplicate GRN number was detected. Please try again.");
    }
    
    // Wrap unknown errors
    throw new ApiError(500, `Failed to create goods receipt: ${error.message}`);
  } finally {
    await session.endSession();
  }
}

export async function listGoodsReceipts(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.purchaseOrderId) filter.purchaseOrder = query.purchaseOrderId;
  if (query.supplierId) filter.supplier = query.supplierId;
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ grnNumber: search }, { poNumber: search }, { supplierName: search }, { supplierCode: search }, { supplierDeliveryNumber: search }];
  }
  const page = query.page || 1; const limit = query.limit || 20;
  const [items, total] = await Promise.all([
    GoodsReceipt.find(filter).populate("purchaseOrder", "poNumber status").populate("supplier", "supplierCode name").populate("receivedBy", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    GoodsReceipt.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getGoodsReceipt(id) {
  const receipt = await GoodsReceipt.findById(id).populate("purchaseOrder", "poNumber status").populate("supplier", "supplierCode name").populate("receivedBy", "name email role").populate("items.material", "materialCode name unit").lean();
  if (!receipt) throw new ApiError(404, "Goods Receipt Note not found.");
  return receipt;
}

export async function updateGoodsReceipt(id, data, actorId) {
  const session = await mongoose.startSession();
  try {
    let updatedReceipt;
    await session.withTransaction(async () => {
      const existingGRN = await GoodsReceipt.findById(id).session(session);
      if (!existingGRN) throw new ApiError(404, "Goods Receipt Note not found.");

      // Only allow updating GRNs that are in Pending status
      if (existingGRN.status !== GOODS_RECEIPT_STATUS.PENDING) {
        throw new ApiError(409, "Only Pending GRNs can be edited. This GRN has already been sent to QC.");
      }

      const purchaseOrder = await PurchaseOrder.findById(existingGRN.purchaseOrder).session(session);
      if (!purchaseOrder) throw new ApiError(404, "Purchase Order not found.");

      if (data.items && data.items.length > 0) {
        // Revert all previously recorded received quantities back to the PO
        for (const existingItem of existingGRN.items) {
          const poItem = purchaseOrder.items.id(existingItem.purchaseOrderItemId);
          if (poItem) {
            poItem.receivedQty = Math.max(0, Number(poItem.receivedQty || 0) - Number(existingItem.receivedQty || 0));
            poItem.isFullyReceived = false;
            poItem.markedCompleteAt = null;
            poItem.markedCompleteBy = null;
          }
        }

        // Clear existing items and rebuild from the new payload
        existingGRN.items = [];

        for (const inputItem of data.items) {
          // Match the PO item by material ObjectId
          const poItem = purchaseOrder.items.find(
            pi => String(pi.material) === String(inputItem.material)
          );
          if (!poItem) {
            throw new ApiError(400, `Material ${inputItem.material} does not belong to this Purchase Order.`);
          }

          const outstandingQty = Number(poItem.orderedQty) - Number(poItem.receivedQty || 0);
          if (Number(inputItem.receivedQty) > outstandingQty + 1e-9) {
            throw new ApiError(409, `Received quantity for ${poItem.materialCode} exceeds the outstanding quantity (${outstandingQty}).`);
          }

          const material = await Material.findById(poItem.material).session(session);
          const category = material?.category || "Raw Material";

          existingGRN.items.push({
            purchaseOrderItemId: poItem._id,
            material: poItem.material,
            materialCode: poItem.materialCode,
            materialName: poItem.materialName,
            category,
            unit: inputItem.unit || poItem.unit,
            unitPrice: inputItem.unitPrice || poItem.unitPrice,
            orderedQty: poItem.orderedQty,
            previouslyReceivedQty: 0,
            receivedQty: Number(inputItem.receivedQty),
            receivedDate: inputItem.receivedDate ? new Date(inputItem.receivedDate) : new Date(),
            batchNumber: inputItem.batchNumber || "",
            invoiceChallan: inputItem.invoiceChallan || "",
            expiryDate: inputItem.expiryDate ? new Date(inputItem.expiryDate) : null,
            notes: inputItem.notes || "",
            qualityStatus: "Pending Inspection",
          });

          // Apply the new received quantity to the PO item
          const newReceivedQty = Number(poItem.receivedQty || 0) + Number(inputItem.receivedQty);
          poItem.receivedQty = newReceivedQty;
          if (newReceivedQty >= Number(poItem.orderedQty) - 1e-9) {
            poItem.isFullyReceived = true;
            poItem.markedCompleteAt = new Date();
            poItem.markedCompleteBy = actorId;
          }
        }
      }

      // Recalculate PO status
      const allComplete = purchaseOrder.items.every(i => i.isFullyReceived === true);
      const anyReceived = purchaseOrder.items.some(i => Number(i.receivedQty || 0) > 0);
      purchaseOrder.status = allComplete
        ? PURCHASE_ORDER_STATUS.COMPLETED
        : anyReceived
          ? PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED
          : PURCHASE_ORDER_STATUS.APPROVED;
      purchaseOrder.updatedBy = actorId;
      await purchaseOrder.save({ session });

      // Optional header-level updates
      if (data.notes !== undefined) existingGRN.notes = data.notes;
      if (data.supplierDeliveryNumber !== undefined) existingGRN.supplierDeliveryNumber = data.supplierDeliveryNumber;

      // If isDraft=false, transition to Quarantined and generate sticker
      if (data.isDraft === false && existingGRN.status === GOODS_RECEIPT_STATUS.PENDING) {
        existingGRN.status = GOODS_RECEIPT_STATUS.QUARANTINED;
        existingGRN.quarantineSticker = await generateQuarantineSticker(session);
        existingGRN.quarantinedAt = new Date();
        existingGRN.quarantinedBy = actorId;
      }

      await existingGRN.save({ session });
      updatedReceipt = existingGRN._id;
    });

    return await GoodsReceipt.findById(updatedReceipt)
      .populate("purchaseOrder", "poNumber status")
      .populate("supplier", "supplierCode name")
      .populate("receivedBy", "name email role")
      .lean();
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(500, `Failed to update goods receipt: ${error.message}`);
  } finally {
    await session.endSession();
  }
}

// ── Stock ─────────────────────────────────────────────────────────────────────

function makeTransactionNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `TXN-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function changeGRNStatus(id, newStatus, actorId) {
  const session = await mongoose.startSession();
  try {
    let updatedGRN;
    await session.withTransaction(async () => {
      const grn = await GoodsReceipt.findById(id).session(session);
      if (!grn) throw new ApiError(404, "Goods Receipt Note not found.");

      const currentStatus = grn.status;

      // Validate status transition
      const validTransitions = {
        [GOODS_RECEIPT_STATUS.PENDING]:           [GOODS_RECEIPT_STATUS.QUARANTINED],
        [GOODS_RECEIPT_STATUS.QUARANTINED]:       [GOODS_RECEIPT_STATUS.UNDER_TESTING, GOODS_RECEIPT_STATUS.APPROVED, GOODS_RECEIPT_STATUS.PARTIALLY_APPROVED, GOODS_RECEIPT_STATUS.REJECTED],
        [GOODS_RECEIPT_STATUS.UNDER_TESTING]:     [GOODS_RECEIPT_STATUS.APPROVED, GOODS_RECEIPT_STATUS.PARTIALLY_APPROVED, GOODS_RECEIPT_STATUS.REJECTED],
        [GOODS_RECEIPT_STATUS.PARTIALLY_APPROVED]: [GOODS_RECEIPT_STATUS.APPROVED],
      };

      const allowedTransitions = validTransitions[currentStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        throw new ApiError(409, `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(", ") || "none"}`);
      }

      switch (newStatus) {
        case GOODS_RECEIPT_STATUS.QUARANTINED:
          if (!grn.quarantineSticker) {
            grn.quarantineSticker = await generateQuarantineSticker(session);
          }
          grn.quarantinedAt = new Date();
          grn.quarantinedBy = actorId;
          break;

        case GOODS_RECEIPT_STATUS.UNDER_TESTING:
          // QC inspector is starting tests — no extra action
          break;

        case GOODS_RECEIPT_STATUS.APPROVED: {
          const allAccepted = grn.items.every(item => item.qualityStatus === "Accepted");
          if (!allAccepted) {
            throw new ApiError(409, "Cannot approve GRN. Mark all items as Accepted first.");
          }
          grn.approvedSticker = await generateApprovedSticker(session);
          grn.approvedAt = new Date();
          grn.approvedBy = actorId;

          // Create QC_ACCEPTANCE stock transactions for each approved item
          const transactions = grn.items.map(item => ({
            transactionNumber: makeTransactionNumber(),
            material: item.material,
            materialCode: item.materialCode,
            materialName: item.materialName,
            transactionType: STOCK_TRANSACTION_TYPE.QC_ACCEPTANCE,
            quantity: item.receivedQty,
            unit: item.unit,
            goodsReceipt: grn._id,
            goodsReceiptItemId: item._id,
            batchNumber: item.batchNumber || "",
            stockBucket: "Usable",
            remarks: `QC Approved — GRN ${grn.grnNumber}, sticker ${grn.approvedSticker}`,
            performedBy: actorId,
            transactionDate: new Date(),
          }));
          await StockTransaction.insertMany(transactions, { session });
          break;
        }

        case GOODS_RECEIPT_STATUS.PARTIALLY_APPROVED: {
          const hasAccepted = grn.items.some(item => item.qualityStatus === "Accepted");
          const hasRejected  = grn.items.some(item => item.qualityStatus === "Rejected");
          if (!hasAccepted || !hasRejected) {
            throw new ApiError(409, "Partially Approved requires at least one Accepted and one Rejected item.");
          }
          grn.approvedSticker = await generateApprovedSticker(session);
          grn.approvedAt = new Date();
          grn.approvedBy = actorId;

          // Stock transactions for each accepted item
          const txns = grn.items
            .filter(item => item.qualityStatus === "Accepted")
            .map(item => ({
              transactionNumber: makeTransactionNumber(),
              material: item.material,
              materialCode: item.materialCode,
              materialName: item.materialName,
              transactionType: STOCK_TRANSACTION_TYPE.QC_ACCEPTANCE,
              quantity: item.receivedQty,
              unit: item.unit,
              goodsReceipt: grn._id,
              goodsReceiptItemId: item._id,
              batchNumber: item.batchNumber || "",
              stockBucket: "Usable",
              remarks: `Partial QC Approval — GRN ${grn.grnNumber}`,
              performedBy: actorId,
              transactionDate: new Date(),
            }));
          if (txns.length) await StockTransaction.insertMany(txns, { session});
          break;
        }

        case GOODS_RECEIPT_STATUS.REJECTED: {
          const allRejected = grn.items.every(item => item.qualityStatus === "Rejected");
          if (!allRejected) {
            throw new ApiError(409, "Cannot reject GRN. All items must be marked Rejected first.");
          }
          // Rejection stock transactions
          const rejTxns = grn.items.map(item => ({
            transactionNumber: makeTransactionNumber(),
            material: item.material,
            materialCode: item.materialCode,
            materialName: item.materialName,
            transactionType: STOCK_TRANSACTION_TYPE.QC_REJECTION,
            quantity: item.receivedQty,
            unit: item.unit,
            goodsReceipt: grn._id,
            goodsReceiptItemId: item._id,
            batchNumber: item.batchNumber || "",
            stockBucket: "Rejected",
            remarks: `QC Rejected — GRN ${grn.grnNumber}`,
            performedBy: actorId,
            transactionDate: new Date(),
          }));
          await StockTransaction.insertMany(rejTxns, { session });
          break;
        }
      }

      grn.status = newStatus;
      await grn.save({ session });
      updatedGRN = grn._id;
    });

    return await GoodsReceipt.findById(updatedGRN)
      .populate("purchaseOrder", "poNumber status")
      .populate("supplier", "supplierCode name")
      .populate("receivedBy", "name email role")
      .lean();
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(500, `Failed to change GRN status: ${error.message}`);
  } finally {
    await session.endSession();
  }
}

export async function updateGRNItemStatus(grnId, itemId, statusData, actorId) {
  const grn = await GoodsReceipt.findById(grnId);
  if (!grn) throw new ApiError(404, "Goods Receipt Note not found.");
  
  // Only allow item status updates when GRN is in Quarantined or Under Testing status
  const allowedGRNStatuses = [GOODS_RECEIPT_STATUS.QUARANTINED, GOODS_RECEIPT_STATUS.UNDER_TESTING];
  if (!allowedGRNStatuses.includes(grn.status)) {
    throw new ApiError(409, `Cannot update item status. GRN must be in Quarantined or Under Testing status. Current status: ${grn.status}`);
  }
  
  const item = grn.items.id(itemId);
  if (!item) throw new ApiError(404, "Item not found in this GRN.");
  
  // Update item quality status
  if (statusData.qualityStatus) {
    const validItemStatuses = ["Pending Inspection", "Under Testing", "Accepted", "Partially Accepted", "Rejected"];
    if (!validItemStatuses.includes(statusData.qualityStatus)) {
      throw new ApiError(400, `Invalid quality status. Must be one of: ${validItemStatuses.join(", ")}`);
    }
    item.qualityStatus = statusData.qualityStatus;
  }
  
  // Add rejection reason if rejected
  if (statusData.qualityStatus === "Rejected" && statusData.rejectionReason) {
    item.rejectionReason = statusData.rejectionReason;
  }
  
  // Record who approved/rejected and when
  if (statusData.qualityStatus === "Accepted" || statusData.qualityStatus === "Rejected") {
    item.qcApprovedBy = actorId;
    item.qcApprovedAt = new Date();
  }
  
  // Auto-update GRN status to Under Testing if any item is being tested
  if (grn.status === GOODS_RECEIPT_STATUS.QUARANTINED && statusData.qualityStatus === "Under Testing") {
    grn.status = GOODS_RECEIPT_STATUS.UNDER_TESTING;
  }
  
  // NOTE: Final approval/rejection of the GRN (and stock transaction creation) is done
  // by calling changeGRNStatus() explicitly. Do NOT auto-transition here to avoid
  // bypassing the stock transaction creation logic in changeGRNStatus.
  
  await grn.save();
  
  return await GoodsReceipt.findById(grn._id)
    .populate("purchaseOrder", "poNumber status")
    .populate("supplier", "supplierCode name")
    .populate("receivedBy", "name email role")
    .populate("items.qcApprovedBy", "name email role")
    .lean();
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export async function getStockBalances(query = {}) {
  const materialFilter = { isActive: true };
  if (query.materialId) materialFilter._id = query.materialId;
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    materialFilter.$or = [{ materialCode: search }, { name: search }, { category: search }];
  }
  const page = query.page || 1; const limit = query.limit || 20;
  const [materials, total] = await Promise.all([Material.find(materialFilter).sort({ materialCode: 1 }).skip((page - 1) * limit).limit(limit).lean(), Material.countDocuments(materialFilter)]);
  const materialIds = materials.map((m) => m._id);
  const movementTotals = await StockTransaction.aggregate([{ $match: { material: { $in: materialIds } } }, { $group: { _id: { material: "$material", bucket: "$stockBucket", type: "$transactionType" }, quantity: { $sum: "$quantity" } } }]);
  const balances = new Map();
  for (const material of materials) balances.set(String(material._id), { materialId: material._id, materialCode: material.materialCode, name: material.name, category: material.category, unit: material.unit, reorderLevel: Number(material.reorderLevel || 0), usableStock: 0, rejectedStock: 0 });
  for (const movement of movementTotals) {
    const balance = balances.get(String(movement._id.material));
    if (!balance) continue;
    
    // Usable stock bucket transactions
    if (movement._id.bucket === "Usable") {
      if (movement._id.type === STOCK_TRANSACTION_TYPE.QC_ACCEPTANCE) {
        balance.usableStock += movement.quantity;
      } else if (movement._id.type === STOCK_TRANSACTION_TYPE.PRODUCTION_ISSUE) {
        balance.usableStock -= movement.quantity;
      }
    }
    
    // Rejected stock bucket transactions
    if (movement._id.bucket === "Rejected") {
      if (movement._id.type === STOCK_TRANSACTION_TYPE.QC_REJECTION) {
        balance.rejectedStock += movement.quantity;
      }
    }
  }
  
  // Round near-zero values to exactly zero to avoid floating-point artifacts
  for (const balance of balances.values()) {
    if (Math.abs(balance.usableStock) < 1e-9) balance.usableStock = 0;
    if (Math.abs(balance.rejectedStock) < 1e-9) balance.rejectedStock = 0;
  }
  const items = [...balances.values()].map((b) => ({ ...b, lowStock: b.usableStock <= b.reorderLevel }));
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function listStockTransactions(query = {}) {
  const filter = {};
  if (query.materialId) filter.material = query.materialId;
  if (query.stockBucket) filter.stockBucket = query.stockBucket;
  if (query.transactionType) filter.transactionType = query.transactionType;
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ transactionNumber: search }, { materialCode: search }, { materialName: search }, { batchNumber: search }, { remarks: search }];
  }
  const page = query.page || 1; const limit = query.limit || 20;
  const [items, total] = await Promise.all([
    StockTransaction.find(filter).populate("material", "materialCode name unit").populate("goodsReceipt", "grnNumber").populate("materialQC", "qcNumber status").populate("performedBy", "name email role").sort({ transactionDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    StockTransaction.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function issueMaterialsToProduction(data, actorId) {
  const session = await mongoose.startSession();
  try {
    let createdTransactions = [];
    await session.withTransaction(async () => {
      const productionBatch = await ProductionBatch.findById(data.productionBatchId).session(session);
      if (!productionBatch) throw new ApiError(404, "Production batch not found.");
      const issued = [];
      for (const item of data.items) {
        const material = await Material.findById(item.materialId).session(session);
        if (!material || !material.isActive) throw new ApiError(404, `Active material not found: ${item.materialId}.`);
        await Material.updateOne({ _id: material._id, isActive: true }, { $set: { updatedBy: actorId } }, { session });
        const stockMatch = { material: material._id, $or: [{ transactionType: STOCK_TRANSACTION_TYPE.QC_ACCEPTANCE, stockBucket: "Usable" }, { transactionType: STOCK_TRANSACTION_TYPE.PRODUCTION_ISSUE, stockBucket: "Usable" }] };
        if (item.batchNumber) stockMatch.batchNumber = item.batchNumber;
        const movements = await StockTransaction.aggregate([{ $match: stockMatch }, { $group: { _id: "$transactionType", quantity: { $sum: "$quantity" } } }]).session(session);
        const accepted = movements.find((m) => m._id === STOCK_TRANSACTION_TYPE.QC_ACCEPTANCE)?.quantity || 0;
        const previouslyIssued = movements.find((m) => m._id === STOCK_TRANSACTION_TYPE.PRODUCTION_ISSUE)?.quantity || 0;
        const available = accepted - previouslyIssued;
        if (item.quantity > available + 1e-9) throw new ApiError(409, `Insufficient usable stock for ${material.materialCode}. Available: ${Math.max(0, available)} ${material.unit}.`);
        issued.push({ transactionNumber: `STK-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`, material: material._id, materialCode: material.materialCode, materialName: material.name, transactionType: STOCK_TRANSACTION_TYPE.PRODUCTION_ISSUE, quantity: item.quantity, unit: material.unit, productionBatch: productionBatch._id, batchNumber: item.batchNumber || "", stockBucket: "Usable", remarks: [`Issued to production batch ${productionBatch.batchNumber || productionBatch._id}`, item.remarks, data.remarks].filter(Boolean).join(" | "), performedBy: actorId, transactionDate: new Date() });
      }
      createdTransactions = await StockTransaction.insertMany(issued, { session });
    });
    return { productionBatch: { id: data.productionBatchId }, transactions: createdTransactions };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(500, `Failed to issue materials to production: ${error.message}`);
  } finally {
    await session.endSession();
  }
}

// ── Purchase Order Item Completion ────────────────────────────────────────────

export async function togglePurchaseOrderItemCompletion(poId, itemId, isComplete, actorId) {
  const session = await mongoose.startSession();
  try {
    let updatedOrder;
    await session.withTransaction(async () => {
      const purchaseOrder = await PurchaseOrder.findById(poId).session(session);
      if (!purchaseOrder) throw new ApiError(404, "Purchase order not found");
      
      const poItem = purchaseOrder.items.id(itemId);
      if (!poItem) throw new ApiError(404, "Purchase order item not found");
      
      // Toggle the completion status
      poItem.isFullyReceived = isComplete;
      if (isComplete) {
        poItem.markedCompleteBy = actorId;
        poItem.markedCompleteAt = new Date();
      } else {
        poItem.markedCompleteBy = null;
        poItem.markedCompleteAt = null;
      }
      
      // Recalculate PO status based on all items' completion status
      const allItemsComplete = purchaseOrder.items.every((item) => item.isFullyReceived === true);
      const anyItemReceived = purchaseOrder.items.some((item) => Number(item.receivedQty || 0) > 0);
      
      purchaseOrder.status = allItemsComplete 
        ? PURCHASE_ORDER_STATUS.COMPLETED 
        : anyItemReceived 
          ? PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED 
          : PURCHASE_ORDER_STATUS.APPROVED;
      
      purchaseOrder.updatedBy = actorId;
      await purchaseOrder.save({ session });
      updatedOrder = purchaseOrder;
    });
    
    return await PurchaseOrder.findById(updatedOrder._id)
      .populate("supplier", "supplierCode name")
      .populate("items.material", "materialCode name unit")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .lean();
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(500, `Failed to toggle PO item completion: ${error.message}`);
  } finally {
    await session.endSession();
  }
}

// ── Manual Issue (ad-hoc stock deduction without a production batch) ──────────

export async function manualIssue(items, remarks, actorId) {
  const session = await mongoose.startSession();
  try {
    let created = [];
    await session.withTransaction(async () => {
      const transactions = [];
      for (const item of items) {
        const material = await Material.findById(item.materialId).session(session);
        if (!material || !material.isActive) {
          throw new ApiError(404, `Material not found or inactive: ${item.materialId}`);
        }
        // Compute current usable stock
        const movements = await StockTransaction.aggregate([
          { $match: { material: material._id } },
          { $group: { _id: { bucket: "$stockBucket", type: "$transactionType" }, qty: { $sum: "$quantity" } } }
        ]).session(session);
        const accepted        = movements.find(m => m._id.bucket === "Usable" && m._id.type === STOCK_TRANSACTION_TYPE.QC_ACCEPTANCE)?.qty || 0;
        const previousIssued  = movements.find(m => m._id.bucket === "Usable" && m._id.type === STOCK_TRANSACTION_TYPE.PRODUCTION_ISSUE)?.qty || 0;
        const available = accepted - previousIssued;
        if (item.quantity > available + 1e-9) {
          throw new ApiError(409, `Insufficient stock for ${material.name}. Available: ${Math.max(0, available).toFixed(3)} ${material.unit}, requested: ${item.quantity} ${material.unit}.`);
        }
        transactions.push({
          transactionNumber: `STK-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
          material:          material._id,
          materialCode:      material.materialCode,
          materialName:      material.name,
          transactionType:   STOCK_TRANSACTION_TYPE.PRODUCTION_ISSUE,
          quantity:          item.quantity,
          unit:              material.unit,
          batchNumber:       item.batchNumber || "",
          stockBucket:       "Usable",
          remarks:           [item.remarks, remarks].filter(Boolean).join(" | ") || "Manual issue from production",
          performedBy:       actorId,
          transactionDate:   new Date(),
        });
      }
      created = await StockTransaction.insertMany(transactions, { session });
    });
    return created;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(500, `Failed to manually issue materials: ${error.message}`);
  } finally {
    await session.endSession();
  }
}
