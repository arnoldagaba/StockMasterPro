import { Request, Response, NextFunction } from "express";
import { permissionServiceInstance } from "@/services";
import { CreatePermissionInput, UpdatePermissionInput } from "@/validators/permission.validator";

export const createPermission = async (
    req: Request<Record<string, never>, Record<string, never>, CreatePermissionInput>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const permissionData = req.body;
        const permission = await permissionServiceInstance.create(permissionData);
        return res.status(201).json({
            success: true,
            data: permission,
        });
    } catch (error) {
        next(error);
    }
};

export const updatePermission = async (
    req: Request<{ id: number }, Record<string, never>, UpdatePermissionInput>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id } = req.params;
        const permissionData = req.body;
        const permission = await permissionServiceInstance.update(id, permissionData);
        return res.status(200).json({
            success: true,
            data: permission,
        });
    } catch (error) {
        next(error);
    }
};

export const deletePermission = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await permissionServiceInstance.delete(id);
        return res.status(200).json({
            success: true,
            message: "Permission deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const getPermissionById = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const permission = await permissionServiceInstance.findById(id);
        return res.status(200).json({
            success: true,
            data: permission,
        });
    } catch (error) {
        next(error);
    }
};

export const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permissions = await permissionServiceInstance.findAll();
        return res.status(200).json({
            success: true,
            data: permissions.data,
            total: permissions.total,
            page: permissions.page,
            limit: permissions.limit,
        });
    } catch (error) {
        next(error);
    }
};
