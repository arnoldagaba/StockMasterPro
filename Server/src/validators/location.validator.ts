import { z } from "zod";
import { numberStringToInt } from "@/utils/validators";

export const createLocationSchema = z.object({
    name: z
        .string({
            required_error: "Name is required",
        })
        .min(2, {
            message: "Name must be at least 2 characters",
        }),
    type: z.enum(["WAREHOUSE", "STORE", "OFFICE"], {
        required_error: "Type is required",
        invalid_type_error: "Type must be one of: WAREHOUSE, STORE, OFFICE",
    }),
    address: z.string().optional(),
    contactInfo: z.string().optional(),
    capacity: z.number().positive("Capacity must be a positive number").optional(),
});

export const updateLocationSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Location ID must be a positive number",
        }),
    name: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters",
        })
        .optional(),
    type: z.enum(["WAREHOUSE", "STORE", "OFFICE"]).optional(),
    address: z.string().optional(),
    contactInfo: z.string().optional(),
    capacity: z.number().positive("Capacity must be a positive number").optional(),
});

export const getLocationSchema = z.object({
    id: z
        .string()
        .or(z.number())
        .transform(numberStringToInt)
        .refine((val) => val > 0, {
            message: "Location ID must be a positive number",
        }),
});

export const getLocationByTypeSchema = z.object({
    type: z.enum(["WAREHOUSE", "STORE", "OFFICE"], {
        required_error: "Type is required",
        invalid_type_error: "Type must be one of: WAREHOUSE, STORE, OFFICE",
    }),
});

export const queryLocationsSchema = z.object({
    query: z
        .object({
            name: z.string().optional(),
            type: z.enum(["WAREHOUSE", "STORE", "OFFICE"]).optional(),
            page: z.string().transform(Number).optional(),
            limit: z.string().transform(Number).optional(),
            sortBy: z.string().optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type GetLocationByTypeInput = z.infer<typeof getLocationByTypeSchema>;
