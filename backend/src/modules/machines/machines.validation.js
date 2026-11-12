import mongoose from "mongoose";
import { z } from "zod";

import { MACHINE_STATUS, MACHINE_TYPES } from "./models/Machine.js";
import { DOWNTIME_STATUS, DOWNTIME_TYPES } from "./models/MachineDowntime.js";

// z.enum() requires an array — extract values from the frozen objects
const MACHINE_STATUS_VALUES = Object.values(MACHINE_STATUS);
const MACHINE_TYPES_VALUES  = Object.values(MACHINE_TYPES);
const DOWNTIME_STATUS_VALUES = Object.values(DOWNTIME_STATUS);
const DOWNTIME_TYPES_VALUES  = Object.values(DOWNTIME_TYPES);

const objectIdSchema = z.string().refine(
  (value) => mongoose.isValidObjectId(value),
  "Invalid MongoDB ObjectId"
);

const optionalText = (maxLength) => z.string().trim().max(maxLength).optional();

const dateSchema = z
  .union([z.string(), z.date()])
  .refine((value) => !Number.isNaN(new Date(value).getTime()), { message: "Invalid date" })
  .optional()
  .nullable();

const capacitySchema = z.object({
  value: z.coerce.number().min(0).nullable().optional(),
  unit: z.string().trim().max(30).optional(),
}).optional();

export const createMachineSchema = z.object({
  body: z.object({
    machineCode: z.string().trim().min(1).max(50),
    machineName: z.string().trim().min(1).max(150),
    machineType: z.enum(MACHINE_TYPES_VALUES),
    manufacturer: optionalText(150),
    modelNumber: optionalText(100),
    serialNumber: optionalText(100),
    location: z.string().trim().min(1).max(200),
    capacity: capacitySchema,
    installationDate: dateSchema,
    lastMaintenanceDate: dateSchema,
    nextMaintenanceDate: dateSchema,
    status: z.enum(MACHINE_STATUS_VALUES).optional(),
    maintenanceIntervalDays: z.coerce.number().int().min(1).nullable().optional(),
    remarks: optionalText(1000),
  }),
});

export const updateMachineSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    machineCode: z.string().trim().min(1).max(50).optional(),
    machineName: z.string().trim().min(1).max(150).optional(),
    machineType: z.enum(MACHINE_TYPES_VALUES).optional(),
    manufacturer: optionalText(150),
    modelNumber: optionalText(100),
    serialNumber: optionalText(100),
    location: z.string().trim().min(1).max(200).optional(),
    capacity: capacitySchema,
    installationDate: dateSchema,
    lastMaintenanceDate: dateSchema,
    nextMaintenanceDate: dateSchema,
    status: z.enum(MACHINE_STATUS_VALUES).optional(),
    maintenanceIntervalDays: z.coerce.number().int().min(1).nullable().optional(),
    remarks: optionalText(1000),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  }),
});

export const machineIdSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const updateMachineStatusSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ status: z.enum(MACHINE_STATUS_VALUES) }),
});

export const listMachinesSchema = z.object({
  query: z.object({
    status: z.enum(MACHINE_STATUS_VALUES).optional(),
    machineType: z.enum(MACHINE_TYPES_VALUES).optional(),
    location: z.string().trim().max(200).optional(),
    search: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const machineDowntimeHistorySchema = z.object({
  params: z.object({ id: objectIdSchema }),
  query: z.object({
    status: z.enum(DOWNTIME_STATUS_VALUES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const reportMachineDowntimeSchema = z.object({
  body: z.object({
    machineId: objectIdSchema,
    downtimeType: z.enum(DOWNTIME_TYPES_VALUES),
    reason: z.string().trim().min(3).max(1000),
    reportedAt: dateSchema,
    expectedResolutionAt: dateSchema,
    productionImpact: optionalText(1000),
    relatedProductionBatch: objectIdSchema.optional().nullable(),
    remarks: optionalText(1000),
  }),
});

export const downtimeIdSchema = z.object({
  params: z.object({ downtimeId: objectIdSchema }),
});

export const resolveMachineDowntimeSchema = z.object({
  params: z.object({ downtimeId: objectIdSchema }),
  body: z.object({
    resolvedAt: dateSchema,
    resolutionNotes: z.string().trim().min(3).max(2000),
  }),
});

export const cancelMachineDowntimeSchema = z.object({
  params: z.object({ downtimeId: objectIdSchema }),
  body: z.object({ reason: z.string().trim().min(3).max(500) }),
});
