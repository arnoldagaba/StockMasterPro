import { z } from "zod";
import { numberStringToInt } from '../utils/validators';

export const createInventorySchema = z.object({
    productId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Product ID must be a positive number',
        }),
    locationId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Location ID must be a positive number',
        }),
    quantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val >= 0, {
            message: 'Quantity must be a non-negative number',
        }),
    reservedQuantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val >= 0, {
            message: 'Reserved quantity must be a non-negative number',
        })
        .optional()
        .default(0),
    minQuantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val >= 0, {
            message: 'Minimum quantity must be a non-negative number',
        })
        .optional(),
    binLocation: z.string().optional(),
});

export const updateInventorySchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Inventory ID must be a positive number',
        }),
    productId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Product ID must be a positive number',
        })
        .optional(),
    locationId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Location ID must be a positive number',
        })
        .optional(),
    quantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val >= 0, {
            message: 'Quantity must be a non-negative number',
        })
        .optional(),
    reservedQuantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val >= 0, {
            message: 'Reserved quantity must be a non-negative number',
        })
        .optional(),
    minQuantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val >= 0, {
            message: 'Minimum quantity must be a non-negative number',
        })
        .optional(),
    binLocation: z.string().optional(),
});

export const getInventorySchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Inventory ID must be a positive number',
        }),
});

export const getInventoryByProductLocationSchema = z.object({
    params: z.object({
        productId: z.string().transform(Number),
        locationId: z.string().transform(Number),
    }),
});

export const adjustQuantitySchema = z.object({
    productId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Product ID must be a positive number',
        }),
    locationId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Location ID must be a positive number',
        }),
    quantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val !== 0, {
            message: 'Quantity cannot be zero',
        }),
    reason: z.string({
        required_error: 'Reason for adjustment is required',
    }).min(3, {
        message: 'Reason must be at least 3 characters',
    }),
});

export const transferInventorySchema = z.object({
    productId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Product ID must be a positive number',
        }),
    fromLocationId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Source location ID must be a positive number',
        }),
    toLocationId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Destination location ID must be a positive number',
        }),
    quantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val > 0, {
            message: 'Quantity must be a positive number',
        }),
    notes: z.string().optional(),
}).refine(data => data.fromLocationId !== data.toLocationId, {
    message: 'Source and destination locations cannot be the same',
    path: ['toLocationId'],
});

export const reserveStockSchema = z.object({
    productId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Product ID must be a positive number',
        }),
    locationId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Location ID must be a positive number',
        }),
    quantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val > 0, {
            message: 'Quantity must be a positive number',
        }),
    referenceId: z.string({
        required_error: 'Reference ID is required',
    }),
    referenceType: z.string({
        required_error: 'Reference type is required',
    }),
});

export const unreserveStockSchema = z.object({
    productId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Product ID must be a positive number',
        }),
    locationId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: 'Location ID must be a positive number',
        }),
    quantity: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val > 0, {
            message: 'Quantity must be a positive number',
        }),
    referenceId: z.string({
        required_error: 'Reference ID is required',
    }),
    referenceType: z.string({
        required_error: 'Reference type is required',
    }),
});

export const getInventoryByFilterSchema = z.object({
    query: z
        .object({
            productId: z.string().transform(Number).optional(),
            locationId: z.string().transform(Number).optional(),
            minQuantity: z.string().transform(Number).optional(),
            maxQuantity: z.string().transform(Number).optional(),
            page: z.string().transform(Number).optional(),
            limit: z.string().transform(Number).optional(),
            sortBy: z.string().optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
});

export const lowStockThresholdSchema = z.object({
    query: z
        .object({
            threshold: z.string().transform(Number).optional(),
            locationId: z.string().transform(Number).optional(),
        })
        .optional(),
});

export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type AdjustQuantityInput = z.infer<typeof adjustQuantitySchema>;
export type TransferInventoryInput = z.infer<typeof transferInventorySchema>;
export type ReserveStockInput = z.infer<typeof reserveStockSchema>;
export type UnreserveStockInput = z.infer<typeof unreserveStockSchema>;
export type LowStockCheckInput = z.infer<typeof lowStockThresholdSchema>;
