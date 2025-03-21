import { z } from "zod";

export const createPermissionSchema = z.object({
    body: z.object({
        name: z.string().min(3),
        description: z.string().optional(),
    }),
});

export const updatePermissionSchema = z.object({
    params: z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
    }),
    body: z.object({
        name: z.string().min(3).optional(),
        description: z.string().optional(),
    }),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>["body"];
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>["body"];
