import { Request, Response, NextFunction } from "express";
import { roleService } from "../services";
import { CreateRoleInput, UpdateRoleInput, AssignPermissionsInput } from "../validators/role.validator";

export const createRole = async (req: Request<{}, {}, CreateRoleInput>, res: Response, next: NextFunction) => {
    try {
        const roleData = req.body;
        const role = await roleService.createRole(roleData);
        return res.status(201).json({
            success: true,
            data: role,
        });
    } catch (error) {
        next(error);
    }
};

export const updateRole = async (req: Request<{ id: number }, {}, UpdateRoleInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const roleData = req.body;
        const role = await roleService.updateRole(id, roleData);
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
        await roleService.deleteRole(id);
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
        const role = await roleService.getRoleById(id);
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
        const roles = await roleService.getAllRoles();
        return res.status(200).json({
            success: true,
            data: roles,
        });
    } catch (error) {
        next(error);
    }
};

export const assignPermissionsToRole = async (req: Request<{ id: number }, {}, AssignPermissionsInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body;
        const role = await roleService.assignPermissionsToRole(id, permissionIds);
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
        const permissions = await roleService.getRolePermissions(id);
        return res.status(200).json({
            success: true,
            data: permissions,
        });
    } catch (error) {
        next(error);
    }
};
