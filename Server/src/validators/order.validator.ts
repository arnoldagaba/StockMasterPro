import { z } from "zod";
import { numberStringToInt } from "../utils/validators";

export const createOrderSchema = z.object({
    customerId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Customer ID must be a positive number",
        }),
    shippingAddress: z.string().optional(),
    shippingMethod: z.string().optional(),
    paymentMethod: z.string({
        required_error: "Payment method is required",
    }),
    notes: z.string().optional(),
    orderItems: z
        .array(
            z.object({
                productId: z
                    .string()
                    .or(z.number())
                    .transform(numberStringToInt)
                    .refine((val) => val > 0, {
                        message: "Product ID must be a positive number",
                    }),
                quantity: z
                    .number()
                    .or(z.string().transform(Number))
                    .refine((val) => val > 0, {
                        message: "Quantity must be a positive number",
                    }),
            }),
        )
        .min(1, {
            message: "At least one order item is required",
        }),
});

export const updateOrderSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Order ID must be a positive number",
        }),
    customerId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Customer ID must be a positive number",
        })
        .optional(),
    shippingAddress: z.string().optional(),
    shippingMethod: z.string().optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
});

export const getOrderSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Order ID must be a positive number",
        }),
});

export const updateOrderStatusSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Order ID must be a positive number",
        }),
    status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELED"], {
        required_error: "Status is required",
        invalid_type_error: "Status must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELED",
    }),
});

export const getOrdersByCustomerSchema = z.object({
    customerId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Customer ID must be a positive number",
        }),
});

export const getOrdersByDateRangeSchema = z.object({
    startDate: z.string().transform((val) => new Date(val)),
    endDate: z.string().transform((val) => new Date(val)),
});

export const filterOrdersSchema = z.object({
    query: z
        .object({
            status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELED"]).optional(),
            customerId: z.string().transform(Number).optional(),
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

export const processPaymentSchema = z.object({
    orderId: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Order ID must be a positive number",
        }),
    paymentMethod: z.string({
        required_error: "Payment method is required",
    }),
    amount: z
        .number()
        .or(z.string().transform(Number))
        .refine((val) => val > 0, {
            message: "Amount must be a positive number",
        }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
