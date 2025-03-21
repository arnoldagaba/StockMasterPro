import { Request, Response, NextFunction } from "express";
import { userService } from "../services";
import { CreateUserInput, UpdateUserInput, LoginInput, ChangePasswordInput, RefreshTokenInput } from "../validators/user.validator";

export const createUser = async (req: Request<{}, {}, CreateUserInput>, res: Response, next: NextFunction) => {
    try {
        const userData = req.body;
        const user = await userService.createUser(userData);
        return res.status(201).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req: Request<{ id: number }, {}, UpdateUserInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userData = req.body;
        const user = await userService.updateUser(id, userData);
        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await userService.deleteUser(id);
        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = await userService.getUserById(id);
        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await userService.getAllUsers();
        return res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request<{}, {}, LoginInput>, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const result = await userService.login(email, password);
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (req: Request<{}, {}, RefreshTokenInput>, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        const result = await userService.refreshToken(refreshToken);
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req: Request<{ id: number }, {}, ChangePasswordInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        await userService.changePassword(id, currentPassword, newPassword);
        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const userId = req.user.userId;
        const user = await userService.getUserById(userId);

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};
