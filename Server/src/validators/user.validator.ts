import { z } from "zod";

export const createUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        roleId: z.number().int().positive(),
    }),
});

export const updateUserSchema = z.object({
    params: z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
    }),
    body: z.object({
        email: z.string().email().optional(),
        firstName: z.string().min(2).optional(),
        lastName: z.string().min(2).optional(),
        roleId: z.number().int().positive().optional(),
    }),
});

export const userIdParamSchema = z.object({
    params: z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string(),
    }),
});

export const changePasswordSchema = z.object({
    params: z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
    }),
    body: z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
    }),
});

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string(),
    }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>["body"];
