import { z } from "zod";

export const createCategorySchema = z.object({
    body: z.object({
        name: z
            .string({
                required_error: "Category name is required",
            })
            .min(2, "Category name must be at least 2 characters"),
        description: z.string().optional(),
        parentId: z.number().optional(),
    }),
});

export const updateCategorySchema = z.object({
    params: z.object({
        id: z.string().transform(Number),
    }),
    body: z.object({
        name: z.string().min(2, "Category name must be at least 2 characters").optional(),
        description: z.string().optional(),
        parentId: z.number().nullable().optional(),
    }),
});

export const getCategorySchema = z.object({
    params: z.object({
        id: z.string().transform(Number),
    }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>["body"];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>["body"];
