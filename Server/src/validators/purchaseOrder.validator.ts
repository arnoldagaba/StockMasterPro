import { z } from "zod";
import { numberStringToInt } from "../utils/validators";

export const createPurchaseOrderSchema = z.object({
    supplierId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Supplier ID must be a positive number",
        }),
    expectedDeliveryDate: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    notes: z.string().optional(),
    purchaseOrderItems: z
        .array(
            z.object({
                productId: z
                    .string()
                    .or(z.number())
                    .transform(numberStringToInt)
                    .refine((val) => val > 0, {
                        message: "Product ID must be a positive number",
                    }),
                quantityOrdered: z
                    .number()
                    .or(z.string().transform(Number))
                    .refine((val) => val > 0, {
                        message: "Quantity must be a positive number",
                    }),
                unitCost: z
                    .number()
                    .or(z.string().transform(Number))
                    .refine((val) => val > 0, {
                        message: "Unit cost must be a positive number",
                    }),
            }),
        )
        .min(1, {
            message: "At least one purchase order item is required",
        }),
});

export const updatePurchaseOrderSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Purchase Order ID must be a positive number",
        }),
    supplierId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Supplier ID must be a positive number",
        })
        .optional(),
    expectedDeliveryDate: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    notes: z.string().optional(),
});

export const getPurchaseOrderSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Purchase Order ID must be a positive number",
        }),
});

export const updatePurchaseOrderStatusSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Purchase Order ID must be a positive number",
        }),
    status: z.enum(["DRAFT", "SUBMITTED", "RECEIVED", "CANCELED"], {
        required_error: "Status is required",
        invalid_type_error: "Status must be one of: DRAFT, SUBMITTED, RECEIVED, CANCELED",
    }),
});

export const getPurchaseOrdersBySupplierSchema = z.object({
    supplierId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Supplier ID must be a positive number",
        }),
});

export const getPurchaseOrdersByDateRangeSchema = z.object({
    startDate: z.string().transform((val) => new Date(val)),
    endDate: z.string().transform((val) => new Date(val)),
});

export const filterPurchaseOrdersSchema = z.object({
    query: z
        .object({
            status: z.enum(["DRAFT", "SUBMITTED", "RECEIVED", "CANCELED"]).optional(),
            supplierId: z.string().transform(Number).optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            minTotal: z.string().transform(Number).optional(),
            maxTotal: z.string().transform(Number).optional(),
            page: z.string().transform(Number).optional(),
            limit: z.string().transform(Number).optional(),
            sortBy: z.string().optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
});

export const receiveItemsSchema = z.object({
    purchaseOrderId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Purchase Order ID must be a positive number",
        }),
    receivedItems: z
        .array(
            z.object({
                itemId: z
                    .string()
                    .or(z.number())
                    .transform(numberStringToInt)
                    .refine((val) => val > 0, {
                        message: "Item ID must be a positive number",
                    }),
                quantityReceived: z
                    .number()
                    .or(z.string().transform(Number))
                    .refine((val) => val > 0, {
                        message: "Quantity received must be a positive number",
                    }),
                locationId: z
                    .string()
                    .or(z.number())
                    .transform(numberStringToInt)
                    .refine((val) => val > 0, {
                        message: "Location ID must be a positive number",
                    }),
            }),
        )
        .min(1, {
            message: "At least one item must be received",
        }),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>;
export type ReceiveItemsInput = z.infer<typeof receiveItemsSchema>;
