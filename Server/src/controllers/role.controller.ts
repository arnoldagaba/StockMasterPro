import { Request, Response, NextFunction } from "express";
import { roleServiceInstance } from "@/services";
import { CreateRoleInput, UpdateRoleInput, AssignPermissionsInput } from "@/validators/role.validator";
import prisma from "@/config/prisma";

export const createRole = async (req: Request<Record<string, never>, Record<string, never>, CreateRoleInput>, res: Response, next: NextFunction) => {
    try {
        const roleData = req.body;
        const role = await roleServiceInstance.create(roleData);
        return res.status(201).json({
            success: true,
            data: role,
        });
    } catch (error) {
        next(error);
    }
};

export const updateRole = async (req: Request<{ id: number }, Record<string, never>, UpdateRoleInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const roleData = req.body;
        const role = await roleServiceInstance.update(id, roleData);
        return res.status(200).json({
            success: true,
            data: role,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteRole = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await roleServiceInstance.delete(id);
        return res.status(200).json({
            success: true,
            message: "Role deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const getRoleById = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const role = await roleServiceInstance.findById(id);
        return res.status(200).json({
            success: true,
            data: role,
        });
    } catch (error) {
        next(error);
    }
};

export const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roles = await roleServiceInstance.findAll();
        return res.status(200).json({
            success: true,
            data: roles,
        });
    } catch (error) {
        next(error);
    }
};

export const assignPermissionsToRole = async (
    req: Request<{ id: number }, Record<string, never>, AssignPermissionsInput>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body;
        const role = await roleServiceInstance.assignPermissions(id, permissionIds);
        return res.status(200).json({
            success: true,
            data: role,
            message: "Permissions assigned successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const getRolePermissions = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Get role permissions using prisma directly
        const permissions = await prisma.rolePermission.findMany({
            where: { roleId: id },
            include: { permission: true },
        });

        // Map to just the permission objects
        const permissionData = permissions.map((rp) => rp.permission);

        return res.status(200).json({
            success: true,
            data: permissionData,
        });
    } catch (error) {
        next(error);
    }
};
