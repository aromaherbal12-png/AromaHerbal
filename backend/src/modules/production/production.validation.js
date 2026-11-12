import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID.");

const plannedMaterialInput = z.object({
  materialId: objectId,
  quantityPerUnit: z.number().positive(),
});

const productionPlanBody = z.object({
  productName: z.string().trim().min(1).max(200),
  productCode: z.string().trim().min(1).max(100),
  targetQuantity: z.number().positive(),
  outputUnit: z.string().trim().min(1).max(30),
  plannedStartDate: z.string().datetime({ offset: true }),
  plannedEndDate: z.string().datetime({ offset: true }),
  materials: z.array(plannedMaterialInput).min(1),
  notes: z.string().trim().max(2000).optional().default(""),
}).superRefine((data, ctx) => {
  if (new Date(data.plannedEndDate) < new Date(data.plannedStartDate)) {
    ctx.addIssue({ code: "custom", path: ["plannedEndDate"], message: "Planned end date must not be before the start date." });
  }
  const ids = data.materials.map((item) => item.materialId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: "custom", path: ["materials"], message: "Each material can only appear once in the plan." });
  }
});

export const createProductionPlanSchema = z.object({ body: productionPlanBody });

export const listProductionPlansSchema = z.object({
  query: z.object({
    status: z.enum(["Draft", "Approved", "In Progress", "Completed", "Cancelled"]).optional(),
    search: z.string().trim().optional().default(""),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const productionPlanIdSchema = z.object({ params: z.object({ id: objectId }) });

export const createProductionBatchSchema = z.object({
  body: z.object({
    productionPlanId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid production plan ID"),
    notes: z.string().trim().max(1000).optional().default(""),
  }),
});

export const listProductionBatchesSchema = z.object({
  query: z.object({
    status: z.enum(["Planned", "Ready", "In Progress", "On Hold", "Pending Review", "Completed", "Cancelled"]).optional(),
    productionPlan: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  }),
});

export const productionBatchIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid production batch ID") }),
});

export const completeProductionBatchSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid production batch ID") }),
  body: z.object({
    actualOutputQuantity: z.number().min(0),
    rejectedOutputQuantity: z.number().min(0).optional().default(0),
  }),
});

export const productionBatchNotesSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid production batch ID") }),
  body: z.object({ notes: z.string().trim().max(1000).optional().default("") }),
});

export const createProductionEntrySchema = z.object({
  body: z.object({
    productionBatchId: z.string().regex(/^[a-f\d]{24}$/i),
    operation: z.string().trim().min(2).max(150),
    stage: z.string().trim().min(2).max(100),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    inputQuantity: z.number().min(0).default(0),
    outputQuantity: z.number().min(0).default(0),
    rejectedQuantity: z.number().min(0).default(0),
    unit: z.string().trim().min(1).max(30),
    processParameters: z.record(z.string(), z.unknown()).optional().default({}),
    observations: z.string().trim().max(3000).optional().default(""),
    deviation: z.string().trim().max(3000).optional().default(""),
  }).superRefine((data, ctx) => {
    if (data.completedAt && new Date(data.completedAt) < new Date(data.startedAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["completedAt"], message: "Completion time cannot be earlier than start time" });
    }
    if (data.rejectedQuantity > data.outputQuantity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rejectedQuantity"], message: "Rejected quantity cannot exceed output quantity" });
    }
  }),
});

export const listProductionEntriesSchema = z.object({
  query: z.object({
    productionBatchId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    bmrId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    status: z.enum(["Draft", "Submitted", "Reviewed", "Voided"]).optional(),
  }),
});

export const productionEntryIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid production entry ID") }),
});

export const recordMaterialConsumptionSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid production batch ID") }),
  body: z.object({
    materialId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid material ID"),
    issuedQuantity: z.number().positive().optional(),
    consumedQuantity: z.number().min(0),
    returnedQuantity: z.number().min(0).default(0),
    materialBatchNumber: z.string().trim().min(1).max(100).optional(),
    remarks: z.string().trim().max(1000).optional().default(""),
  }).superRefine((data, ctx) => {
    if (data.issuedQuantity !== undefined && data.consumedQuantity + data.returnedQuantity > data.issuedQuantity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["returnedQuantity"], message: "Consumed quantity plus returned quantity cannot exceed issued quantity" });
    }
  }),
});

export const reviewBmrSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid BMR ID") }),
  body: z.object({
    decision: z.enum(["Approve", "Reject"]),
    remarks: z.string().trim().max(2000).optional().default(""),
  }).superRefine((data, ctx) => {
    if (data.decision === "Reject" && !data.remarks.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["remarks"], message: "Remarks are required when rejecting a BMR" });
    }
  }),
});
