import { z } from "zod";
import { RoleName } from "@prisma/client";

export const createRoleSchema = z.object({
    body: z.object({
        name: z.nativeEnum(RoleName),
        description: z.string().optional(),
    }),
});

export const updateRoleSchema = z.object({
    params: z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
    }),
    body: z.object({
        name: z.nativeEnum(RoleName).optional(),
        description: z.string().optional(),
    }),
});

export const assignPermissionsSchema = z.object({
    params: z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
    }),
    body: z.object({
        permissionIds: z.array(z.number().int().positive()),
    }),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>["body"];
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>["body"];
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>["body"];
