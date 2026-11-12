import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

const optionalText = (max) =>
  z.string().trim().max(max).optional().default("");

const materialBody = z.object({
  materialCode: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(150),
  category: z.string().trim().min(1).max(100),
  description: optionalText(1000),
  unit: z.string().trim().min(1).max(20),
  reorderLevel: z.number().finite().min(0).default(0),
}).strict();

const supplierBody = z.object({
  supplierCode: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(200),
  contactPerson: optionalText(100),
  email: z.union([z.string().trim().email().max(254), z.literal("")])
    .optional().default(""),
  phone: optionalText(30),
  address: optionalText(1000),
  taxId: optionalText(50),
  notes: optionalText(1000),
}).strict();

const idParams = z.object({
  id: objectId,
});

const emptyParams = z.object({});

export const createMaterialSchema = z.object({
  body: materialBody,
  params: emptyParams,
  query: z.object({}),
});

export const updateMaterialSchema = z.object({
  body: materialBody.partial().refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  ),
  params: idParams,
  query: z.object({}),
});

export const createSupplierSchema = z.object({
  body: supplierBody,
  params: emptyParams,
  query: z.object({}),
});

export const updateSupplierSchema = z.object({
  body: supplierBody.partial().refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  ),
  params: idParams,
  query: z.object({}),
});

export const inventoryIdSchema = z.object({
  body: z.object({}),
  params: idParams,
  query: z.object({}),
});

export const listInventorySchema = z.object({
  body: z.object({}),
  params: emptyParams,
  query: z.object({
    search: z.string().trim().max(100).optional(),
    active: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});


const purchaseOrderItemInput = z.object({
  materialId: objectId,
  orderedQty: z.number().finite().positive(),
  unitPrice: z.number().finite().min(0),
  gstRate: z.number().finite().min(0).max(100).optional().default(18),
}).strict();

const purchaseOrderBody = z.object({
  supplierId: objectId,
  items: z.array(purchaseOrderItemInput).min(1).max(100),
  expectedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).optional().default(""),
}).strict();

export const createPurchaseOrderSchema = z.object({
  body: purchaseOrderBody,
  params: emptyParams,
  query: z.object({}),
});

export const listPurchaseOrdersSchema = z.object({
  body: z.object({}),
  params: emptyParams,
  query: z.object({
    status: z.enum([
      "Draft",
      "Approved",
      "Partially Received",
      "Completed",
      "Cancelled",
    ]).optional(),
    supplierId: objectId.optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const purchaseOrderIdSchema = z.object({
  body: z.object({}),
  params: idParams,
  query: z.object({}),
});

export const updatePurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: objectId.optional(),
    items: z.array(purchaseOrderItemInput).min(1).max(100).optional(),
    expectedDeliveryDate: z.string().datetime().nullable().optional(),
    notes: z.string().trim().max(2000).optional(),
  }).strict().refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  ),
  params: idParams,
  query: z.object({}),
});


const grnItemInput = z.object({
  material: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid material ID."),
  orderedQty: z.number().positive("Ordered quantity must be greater than zero."),
  receivedQty: z.number().positive("Received quantity must be greater than zero."),
  unit: z.string().trim().min(1).max(50),
  unitPrice: z.number().min(0),
  batchNumber: z.string().trim().max(100).optional().default(""),
  invoiceChallan: z.string().trim().max(200).optional().default(""),
  receivedDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      // Accept ISO datetime or YYYY-MM-DD
      return val;
    }),
  expiryDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
  notes: z.string().trim().max(500).optional().default(""),
});

export const createGoodsReceiptSchema = z.object({
  body: z.object({
    purchaseOrderId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid Purchase Order ID.")
      .or(z.string().regex(/^PO-\d{4}-\d{4}$/)), // Allow PO numbers like PO-2026-0002
    isDraft: z.boolean().optional().default(false),
    supplierDeliveryNumber: z.string().trim().max(100).optional().default(""),
    receivedAt: z
      .string()
      .datetime({ offset: true })
      .optional(),
    items: z.array(grnItemInput).min(1, "Add at least one received item."),
    notes: z.string().trim().max(2000).optional().default(""),
  }),
});

export const listGoodsReceiptsSchema = z.object({
  query: z.object({
    search: z.string().trim().optional().default(""),
    status: z
      .enum(["Pending", "Quarantined", "Under Testing", "Approved", "Partially Approved", "Rejected",
             "Received", "QC Pending", "QC Completed"])  // legacy values kept for backward compat
      .optional(),
    purchaseOrderId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    supplierId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const goodsReceiptIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid GRN ID."),
  }),
});


export const stockBalanceQuerySchema = z.object({
  query: z.object({
    materialId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid material ID.")
      .optional(),
    search: z.string().trim().optional().default(""),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(500).optional().default(20),
  }),
});

export const stockTransactionQuerySchema = z.object({
  query: z.object({
    materialId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid material ID.")
      .optional(),
    stockBucket: z.enum(["Usable", "Rejected"]).optional(),
    transactionType: z
      .enum(["QC_ACCEPTANCE", "QC_REJECTION"])
      .optional(),
    search: z.string().trim().optional().default(""),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});


export const productionIssueSchema = z.object({
  body: z.object({
    productionBatchId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid production batch ID."),
    items: z.array(
      z.object({
        materialId: z
          .string()
          .regex(/^[a-f\d]{24}$/i, "Invalid material ID."),
        quantity: z.number().positive(
          "Issue quantity must be greater than zero."
        ),
        batchNumber: z.string().trim().max(100).optional().default(""),
        remarks: z.string().trim().max(500).optional().default(""),
      })
    ).min(1, "Add at least one material to issue."),
    remarks: z.string().trim().max(1000).optional().default(""),
  }).superRefine((data, ctx) => {
    const ids = data.items.map((item) => item.materialId);

    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Each material can appear only once per issue request.",
      });
    }
  }),
});

export const manualIssueSchema = z.object({
  params: z.object({}),
  query:  z.object({}),
  body: z.object({
    items: z.array(
      z.object({
        materialId:  z.string().regex(/^[a-f\d]{24}$/i, "Invalid material ID"),
        quantity:    z.number().positive("Quantity must be greater than zero"),
        batchNumber: z.string().trim().max(100).optional().default(""),
        remarks:     z.string().trim().max(500).optional().default(""),
      })
    ).min(1, "At least one material is required"),
    remarks: z.string().trim().max(1000).optional().default(""),
  }).superRefine((data, ctx) => {
    const ids = data.items.map(i => i.materialId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "Each material can appear only once." });
    }
  }),
});
