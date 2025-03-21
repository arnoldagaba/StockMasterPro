import { z } from "zod";

export const createProductSchema = z.object({
    body: z.object({
        sku: z
            .string({
                required_error: "SKU is required",
            })
            .min(2, "SKU must be at least 2 characters"),
        name: z
            .string({
                required_error: "Product name is required",
            })
            .min(2, "Product name must be at least 2 characters"),
        description: z.string().optional(),
        categoryId: z.number({
            required_error: "Category ID is required",
        }),
        price: z
            .number({
                required_error: "Price is required",
            })
            .int()
            .nonnegative("Price must be a non-negative number"),
        cost: z
            .number({
                required_error: "Cost is required",
            })
            .int()
            .nonnegative("Cost must be a non-negative number"),
        taxRate: z.number().optional(),
        barcode: z.string().optional(),
        weight: z.number().optional(),
        length: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        reorderPoint: z.number().int().nonnegative().optional(),
        reorderQuantity: z.number().int().nonnegative().optional(),
    }),
});

export const updateProductSchema = z.object({
    params: z.object({
        id: z.string().transform(Number),
    }),
    body: z.object({
        sku: z.string().min(2, "SKU must be at least 2 characters").optional(),
        name: z.string().min(2, "Product name must be at least 2 characters").optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        price: z.number().int().nonnegative("Price must be a non-negative number").optional(),
        cost: z.number().int().nonnegative("Cost must be a non-negative number").optional(),
        taxRate: z.number().optional(),
        barcode: z.string().optional(),
        weight: z.number().optional(),
        length: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        reorderPoint: z.number().int().nonnegative().optional(),
        reorderQuantity: z.number().int().nonnegative().optional(),
    }),
});

export const getProductSchema = z.object({
    params: z.object({
        id: z.string().transform(Number),
    }),
});

export const getProductsByCategorySchema = z.object({
    params: z.object({
        categoryId: z.string().transform(Number),
    }),
    query: z
        .object({
            page: z.string().transform(Number).optional(),
            limit: z.string().transform(Number).optional(),
            sortBy: z.string().optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
            searchTerm: z.string().optional(),
        })
        .optional(),
});

export const addProductComponentSchema = z.object({
    params: z.object({
        id: z.string().transform(Number),
    }),
    body: z.object({
        componentId: z.number({
            required_error: "Component ID is required",
        }),
        quantity: z
            .number({
                required_error: "Quantity is required",
            })
            .positive("Quantity must be greater than 0"),
        unit: z.string().optional(),
    }),
});

export const removeProductComponentSchema = z.object({
    params: z.object({
        id: z.string().transform(Number),
        componentId: z.string().transform(Number),
    }),
});

export const updateProductImageSchema = z.object({
    params: z.object({
        id: z.string().transform(Number),
    }),
    body: z.object({
        imageUrl: z.string({
            required_error: "Image URL is required",
        }),
        isDefault: z.boolean().optional(),
    }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>["body"];
export type UpdateProductInput = z.infer<typeof updateProductSchema>["body"];
export type AddProductComponentInput = z.infer<typeof addProductComponentSchema>["body"];
