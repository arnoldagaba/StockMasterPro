import { Request, Response, NextFunction } from "express";
import { userServiceInstance } from "@/services";
import { CreateUserInput, UpdateUserInput, LoginInput, ChangePasswordInput, RefreshTokenInput } from "@/validators/user.validator";

export const createUser = async (req: Request<Record<string, never>, Record<string, never>, CreateUserInput>, res: Response, next: NextFunction) => {
    try {
        const userData = req.body;
        const user = await userServiceInstance.create({
            ...userData,
            role: { connect: { id: userData.roleId } },
        });
        res.status(201).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req: Request<{ id: number }, Record<string, never>, UpdateUserInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userData = req.body;
        const user = await userServiceInstance.update(id, userData);
        res.status(200).json({
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
        await userServiceInstance.delete(id);
        res.status(200).json({
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
        const user = await userServiceInstance.findById(id);
        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await userServiceInstance.findAll();
        res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request<Record<string, never>, Record<string, never>, LoginInput>, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const user = await userServiceInstance.validateCredentials(email, password);

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        // Get client info for session
        const ipAddress = req.ip;
        const userAgent = req.headers["user-agent"];

        // Create session and get tokens
        const sessionData = await userServiceInstance.createSession(user.id, ipAddress, userAgent);

        res.status(200).json({
            success: true,
            data: sessionData,
        });
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (
    req: Request<Record<string, never>, Record<string, never>, RefreshTokenInput>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { refreshToken } = req.body;
        const result = await userServiceInstance.refreshToken(refreshToken);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req: Request<{ id: number }, Record<string, never>, ChangePasswordInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        await userServiceInstance.updatePassword(id, currentPassword, newPassword);
        res.status(200).json({
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
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }

        const userId = req.user.userId;
        const user = await userServiceInstance.findById(userId);

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};
