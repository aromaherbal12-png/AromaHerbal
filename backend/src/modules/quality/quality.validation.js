import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID.");

export const createMaterialQCSchema = z.object({
  body: z.object({
    goodsReceiptId: objectId,
    goodsReceiptItemId: objectId,
    inspectedQty: z.number().positive(),
    acceptedQty: z.number().min(0),
    rejectedQty: z.number().min(0),
    testResults: z.record(z.string(), z.unknown()).optional().default({}),
    remarks: z.string().trim().max(2000).optional().default(""),
  }).superRefine((data, ctx) => {
    if (
      Math.abs(data.inspectedQty - data.acceptedQty - data.rejectedQty) >
      1e-9
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["acceptedQty"],
        message: "Inspected quantity must equal accepted quantity plus rejected quantity.",
      });
    }
  }),
});

export const listMaterialQCSchema = z.object({
  query: z.object({
    status: z.enum([
      "Pending",
      "Accepted",
      "Partially Accepted",
      "Rejected",
    ]).optional(),
    goodsReceiptId: objectId.optional(),
    search: z.string().trim().optional().default(""),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const materialQCIdSchema = z.object({
  params: z.object({ id: objectId }),
});



export const createProductionQCSchema = z.object({
  body: z.object({
    productionBatchId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid production batch ID"),
    sampleQuantity: z.number().positive(),
    sampleUnit: z.string().trim().min(1).max(30),
    tests: z.array(
      z.object({
        testName: z.string().trim().min(1).max(150),
        specification: z.string().trim().max(500).optional().default(""),
        actualResult: z.string().trim().min(1).max(1000),
        unit: z.string().trim().max(30).optional().default(""),
        result: z.enum(["Pass", "Fail", "Not Applicable"]),
        remarks: z.string().trim().max(1000).optional().default(""),
      })
    ).min(1),
    decisionRemarks: z.string().trim().max(2000).optional().default(""),
  }),
});

export const listProductionQCSchema = z.object({
  query: z.object({
    productionBatchId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    status: z.enum(["Pending", "Accepted", "Rejected", "On Hold"]).optional(),
  }),
});

export const productionQCIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid production QC ID"),
  }),
});

export const decideProductionQCSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid production QC ID"),
  }),
  body: z.object({
    decision: z.enum(["Accepted", "Rejected", "On Hold"]),
    decisionRemarks: z.string().trim().max(2000).optional().default(""),
  }).superRefine((data, ctx) => {
    if (
      data.decision !== "Accepted" &&
      !data.decisionRemarks.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decisionRemarks"],
        message: "Remarks are required for rejection or hold decisions",
      });
    }
  }),
});
