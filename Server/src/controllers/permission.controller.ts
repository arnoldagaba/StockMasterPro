import { Request, Response, NextFunction } from "express";
import { permissionService } from "../services";
import { CreatePermissionInput, UpdatePermissionInput } from "../validators/permission.validator";

export const createPermission = async (req: Request<{}, {}, CreatePermissionInput>, res: Response, next: NextFunction) => {
    try {
        const permissionData = req.body;
        const permission = await permissionService.createPermission(permissionData);
        return res.status(201).json({
            success: true,
            data: permission,
        });
    } catch (error) {
        next(error);
    }
};

export const updatePermission = async (req: Request<{ id: number }, {}, UpdatePermissionInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const permissionData = req.body;
        const permission = await permissionService.updatePermission(id, permissionData);
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
        await permissionService.deletePermission(id);
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
        const permission = await permissionService.getPermissionById(id);
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
        const permissions = await permissionService.getAllPermissions();
        return res.status(200).json({
            success: true,
            data: permissions,
        });
    } catch (error) {
        next(error);
    }
};
