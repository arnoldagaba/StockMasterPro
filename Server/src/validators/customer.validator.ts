import { z } from "zod";
import { numberStringToInt } from "@/utils/validators";

export const createCustomerSchema = z.object({
    name: z
        .string({
            required_error: "Name is required",
        })
        .min(2, {
            message: "Name must be at least 2 characters",
        }),
    email: z
        .string({
            required_error: "Email is required",
        })
        .email({
            message: "Invalid email format",
        })
        .optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
});

export const updateCustomerSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Customer ID must be a positive number",
        }),
    name: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters",
        })
        .optional(),
    email: z
        .string()
        .email({
            message: "Invalid email format",
        })
        .optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
});

export const getCustomerSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Customer ID must be a positive number",
        }),
});

export const searchCustomersSchema = z.object({
    query: z
        .object({
            name: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            page: z.string().transform(Number).optional(),
            limit: z.string().transform(Number).optional(),
            sortBy: z.string().optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
